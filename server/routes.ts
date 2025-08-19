import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateQuestionsFromText, evaluateOpenAnswer } from "./services/questionGenerator";
import { extractTopicFromContent } from "./services/topicExtractor";
import { insertQuizSessionSchema } from "@shared/schema";
import multer from "multer";
import path from "path";

// Extend Express Request interface for multer
interface MulterRequest extends Request {
  files?: Express.Multer.File[];
  body: {
    questionTypes?: string;
  };
}

// Configure multer for multiple file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5, // max 5 files
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'text/plain' || path.extname(file.originalname).toLowerCase() === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Nur .txt Dateien sind erlaubt'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload multiple text files and generate questions
  app.post("/api/upload-and-generate", upload.array('textFiles', 5), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "Keine Dateien hochgeladen" });
      }

      // Parse question types from request body
      let questionTypes: string[] = ["definition", "case", "assignment", "open"];
      if (req.body.questionTypes) {
        try {
          questionTypes = JSON.parse(req.body.questionTypes);
        } catch (e) {
          return res.status(400).json({ error: "Ungültige Fragentypen-Auswahl" });
        }
      }

      if (questionTypes.length === 0) {
        return res.status(400).json({ error: "Mindestens ein Fragentyp muss ausgewählt werden" });
      }

      const files = Array.isArray(req.files) ? req.files : [];
      let allQuestions: any[] = [];
      let combinedSummaryText = "";

      // Process each file
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const summaryText = file.buffer.toString('utf-8');
        
        if (!summaryText.trim()) {
          return res.status(400).json({ error: `Datei ${file.originalname} ist leer` });
        }

        if (summaryText.length < 100) {
          return res.status(400).json({ error: `Datei ${file.originalname} ist zu kurz. Mindestens 100 Zeichen erforderlich.` });
        }

        combinedSummaryText += `--- Datei ${index + 1}: ${file.originalname} ---\n${summaryText}\n\n`;

        // Store document in database
        const storedDocument = await storage.storeDocument(file.originalname, summaryText);
        
        // Extract and store topic
        const topicData = await extractTopicFromContent(summaryText, file.originalname);
        const storedTopic = await storage.extractAndStoreTopic(topicData.name, topicData.description);

        // Generate ~10 questions per file with selected question types
        const generationResult = await generateQuestionsFromText(
          summaryText, 
          questionTypes as any[], 
          10,
          file.originalname
        );
        
        if (generationResult.error) {
          return res.status(500).json({ 
            error: `Fehler bei Datei ${file.originalname}: ${generationResult.error}` 
          });
        }

        // Store questions in database and prepare for session
        const fileQuestions: any[] = [];
        
        for (const question of generationResult.questions) {
          // FINAL SAFETY CHECK: Ensure question type is in selected types
          if (!questionTypes.includes(question.type)) {
            console.error(`CRITICAL: Removing question with unselected type ${question.type}: ${question.text}`);
            continue;
          }

          // Store question in database
          const storedQuestion = await storage.storeQuestion(
            question, 
            storedDocument.id, 
            storedTopic.id
          );

          // Prepare question for session with enhanced metadata
          const sessionQuestion = {
            ...question,
            id: `f${index + 1}_${question.id}`,
            sourceFile: file.originalname,
            topic: topicData.name,
            storedQuestionId: storedQuestion.id
          };

          fileQuestions.push(sessionQuestion);
        }

        allQuestions = allQuestions.concat(fileQuestions);
      }

      if (allQuestions.length === 0) {
        return res.status(500).json({ error: "Keine Fragen der ausgewählten Typen generiert" });
      }

      // FINAL VALIDATION: Double-check all questions have valid selected types
      const invalidQuestions = allQuestions.filter(q => !questionTypes.includes(q.type));
      if (invalidQuestions.length > 0) {
        console.error(`CRITICAL: Found ${invalidQuestions.length} questions with invalid types in final validation!`);
        allQuestions = allQuestions.filter(q => questionTypes.includes(q.type));
        
        if (allQuestions.length === 0) {
          return res.status(500).json({ error: "Keine Fragen der ausgewählten Typen generiert" });
        }
      }

      // Get review questions from different topics (3 per new question)
      const usedTopics = Array.from(new Set(allQuestions.map(q => q.topic).filter(Boolean)));
      const reviewQuestionsCount = allQuestions.length * 3;
      const reviewQuestions = await storage.getReviewQuestions(usedTopics, reviewQuestionsCount);
      
      // Add review questions to the beginning
      const allSessionQuestions = [...reviewQuestions, ...allQuestions];

      // Log final question type distribution for verification
      const finalTypeDistribution = allSessionQuestions.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`Final question distribution:`, finalTypeDistribution);
      console.log(`Selected question types:`, questionTypes);
      console.log(`Review questions added: ${reviewQuestions.length}`);

      // Create quiz session with all questions
      const quizSession = await storage.createQuizSession({
        summaryText: combinedSummaryText,
        questions: allSessionQuestions,
      });

      res.json({
        sessionId: quizSession.id,
        questionsCount: allSessionQuestions.length,
        newQuestionsCount: allQuestions.length,
        reviewQuestionsCount: reviewQuestions.length,
        filesProcessed: files.length,
        questionTypes: questionTypes,
        message: `${allSessionQuestions.length} Fragen generiert (${allQuestions.length} neue + ${reviewQuestions.length} Wiederholungsfragen)`
      });

    } catch (error: any) {
      console.error('Upload and generation error:', error);
      res.status(500).json({ 
        error: error.message || "Fehler beim Verarbeiten der Dateien" 
      });
    }
  });

  // Get quiz session
  app.get("/api/quiz/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getQuizSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Quiz-Session nicht gefunden" });
      }

      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit answer and get feedback
  app.post("/api/quiz/:sessionId/answer", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { questionId, answer } = req.body;

      if (!questionId || answer === undefined) {
        return res.status(400).json({ error: "Frage-ID und Antwort erforderlich" });
      }

      const session = await storage.getQuizSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Quiz-Session nicht gefunden" });
      }

      const questions = session.questions as any[];
      const currentQuestion = questions.find(q => q.id === questionId);
      
      if (!currentQuestion) {
        return res.status(404).json({ error: "Frage nicht gefunden" });
      }

      let isCorrect = false;
      
      // Check answer based on question type
      if (currentQuestion.type === 'open') {
        // Use AI to evaluate open question answers
        try {
          const evaluation = await evaluateOpenAnswer(answer, currentQuestion.correctAnswer, currentQuestion.text);
          isCorrect = evaluation.isCorrect;
        } catch (error) {
          console.error('AI evaluation failed:', error);
          // Fallback to simple text similarity check
          const userAnswer = answer.toLowerCase().trim();
          const correctAnswer = currentQuestion.correctAnswer.toLowerCase().trim();
          isCorrect = userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer) || userAnswer.length >= 20;
        }
      } else {
        // Multiple choice questions (definition, case, assignment)
        const selectedOption = currentQuestion.options?.find((opt: any) => opt.id === answer);
        isCorrect = selectedOption?.correct === true;
      }

      // Update stats
      const stats = session.stats as any;
      const isFirstAttempt = !stats.questionAttempts?.[questionId];
      
      if (isFirstAttempt) {
        stats.asked = (stats.asked || 0) + 1;
        if (isCorrect) {
          stats.correctFirstTry = (stats.correctFirstTry || 0) + 1;
        }
        stats.questionAttempts = { ...stats.questionAttempts, [questionId]: true };
      } else if (!isCorrect) {
        stats.retries = (stats.retries || 0) + 1;
      }

      await storage.updateQuizSession(sessionId, { stats });

      // Track question usage if it's a stored question
      if (currentQuestion.storedQuestionId) {
        const attempts = stats.questionAttempts?.[questionId] ? 2 : 1; // Simplified attempt tracking
        // Track if this was correct on first try for review question selection
        const wasCorrectFirstTry = isFirstAttempt && isCorrect;
        await storage.trackQuestionUsage(sessionId, currentQuestion.storedQuestionId, wasCorrectFirstTry, attempts);
        await storage.updateQuestionLastUsed(currentQuestion.storedQuestionId);
      }

      res.json({
        correct: isCorrect,
        explanation: currentQuestion.explanation,
        correctAnswer: currentQuestion.type === 'open' 
          ? currentQuestion.correctAnswer 
          : currentQuestion.options?.find((opt: any) => opt.correct === true)?.text,
        sourceFile: currentQuestion.sourceFile,
        topic: currentQuestion.topic,
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update quiz progress
  app.post("/api/quiz/:sessionId/progress", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { currentQuestionIndex, completed } = req.body;

      const updates: any = {};
      if (typeof currentQuestionIndex === 'number') {
        updates.currentQuestionIndex = currentQuestionIndex;
      }
      if (typeof completed === 'boolean') {
        updates.completed = completed;
      }

      const updatedSession = await storage.updateQuizSession(sessionId, updates);
      
      if (!updatedSession) {
        return res.status(404).json({ error: "Quiz-Session nicht gefunden" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
