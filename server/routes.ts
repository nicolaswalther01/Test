import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  generateQuestionsFromText,
  evaluateOpenAnswer,
} from "./services/questionGenerator";
import { extractTopicFromContent } from "./services/topicExtractor";
import { insertQuizSessionSchema } from "@shared/schema";
import multer from "multer";
import path from "path";

// Extend Express Request interface for multer
interface MulterRequest extends Request {
  files?: Express.Multer.File[];
  body: {
    questionTypes?: string;
    totalQuestions?: string;
    difficulty?: string;
  };
}

// Configure multer for multiple file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 6, // max 6 files
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (
      file.mimetype === "text/plain" ||
      path.extname(file.originalname).toLowerCase() === ".txt"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Nur .txt Dateien sind erlaubt"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload multiple text files and generate questions
  app.post(
    "/api/upload-and-generate",
    upload.array("textFiles", 6),
    async (req: any, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ error: "Keine Dateien hochgeladen" });
        }

        // Parse question types from request body
        let questionTypes: string[] = [
          "definition",
          "case",
          "assignment",
          "open",
        ];
        if (req.body.questionTypes) {
          try {
            questionTypes = JSON.parse(req.body.questionTypes);
          } catch (e) {
            return res
              .status(400)
              .json({ error: "Ungültige Fragentypen-Auswahl" });
          }
        }

        if (questionTypes.length === 0) {
          return res
            .status(400)
            .json({ error: "Mindestens ein Fragentyp muss ausgewählt werden" });
        }

        // Parse total questions from request body
        let totalQuestions = 30;
        if (req.body.totalQuestions) {
          totalQuestions = parseInt(req.body.totalQuestions, 10);
          if (![25, 50, 75, 100].includes(totalQuestions)) {
            return res
              .status(400)
              .json({ error: "Ungültige Gesamtanzahl Fragen!" });
          }
        }

        const reviewQuestionsTarget = Math.floor(totalQuestions / 2);

        // Parse difficulty from request body
        let difficulty: "basic" | "profi" | "random" = "basic";
        if (
          req.body.difficulty &&
          ["basic", "profi", "random"].includes(req.body.difficulty)
        ) {
          difficulty = req.body.difficulty as "basic" | "profi" | "random";
        }

        const files = Array.isArray(req.files) ? req.files : [];
        let allQuestions: any[] = [];
        let combinedSummaryText = "";

        // Process each file
        for (let index = 0; index < files.length; index++) {
          const file = files[index];
          const summaryText = file.buffer.toString("utf-8");

          if (!summaryText.trim()) {
            return res
              .status(400)
              .json({ error: `Datei ${file.originalname} ist leer` });
          }

          if (summaryText.length < 100) {
            return res.status(400).json({
              error: `Datei ${file.originalname} ist zu kurz. Mindestens 100 Zeichen erforderlich.`,
            });
          }

          combinedSummaryText += `--- Datei ${index + 1}: ${file.originalname} ---\n${summaryText}\n\n`;

          // Store document in database
          const storedDocument = await storage.storeDocument(
            file.originalname,
            summaryText,
          );

          // Extract and store topic
          const topicData = await extractTopicFromContent(
            summaryText,
            file.originalname,
          );
          const storedTopic = await storage.extractAndStoreTopic(
            topicData.name,
            topicData.description,
          );

          // Calculate questions per file based on total questions
          const questionsPerFile = Math.ceil(totalQuestions / files.length);
          const generationResult = await generateQuestionsFromText(
            summaryText,
            questionTypes as any[],
            questionsPerFile,
            file.originalname,
            difficulty,
          );

          if (generationResult.error) {
            return res.status(500).json({
              error: `Fehler bei Datei ${file.originalname}: ${generationResult.error}`,
            });
          }

          // Store questions in database and prepare for session
          const fileQuestions: any[] = [];

          for (const question of generationResult.questions) {
            // FINAL SAFETY CHECK: Ensure question type is in selected types
            if (!questionTypes.includes(question.type)) {
              console.error(
                `CRITICAL: Removing question with unselected type ${question.type}: ${question.text}`,
              );
              continue;
            }

            // Store question in database
            const storedQuestion = await storage.storeQuestion(
              question,
              storedDocument.id,
              storedTopic.id,
            );

            // Prepare question for session with enhanced metadata
            const sessionQuestion = {
              ...question,
              id: `f${index + 1}_${question.id}`,
              sourceFile: file.originalname,
              storedQuestionId: storedQuestion.id,
              isReviewQuestion: false,
            };

            fileQuestions.push(sessionQuestion);
          }

          allQuestions = allQuestions.concat(fileQuestions);
        }

        if (allQuestions.length === 0) {
          return res
            .status(500)
            .json({ error: "Keine Fragen der ausgewählten Typen generiert" });
        }

        // FINAL VALIDATION: Double-check all questions have valid selected types
        const invalidQuestions = allQuestions.filter(
          (q) => !questionTypes.includes(q.type),
        );
        if (invalidQuestions.length > 0) {
          console.error(
            `CRITICAL: Found ${invalidQuestions.length} questions with invalid types in final validation!`,
          );
          allQuestions = allQuestions.filter((q) =>
            questionTypes.includes(q.type),
          );

          if (allQuestions.length === 0) {
            return res
              .status(500)
              .json({ error: "Keine Fragen der ausgewählten Typen generiert" });
          }
        }

        // Get review questions FIRST (before processing files for immediate availability)
        const reviewQuestions = await storage.getReviewQuestions(
          reviewQuestionsTarget,
        );

        // Mark review questions
        const markedReviewQuestions = reviewQuestions.map((q: any) => ({
          ...q,
          isReviewQuestion: true,
        }));

        // Create initial session with review questions IMMEDIATELY
        const initialQuizSession = await storage.createQuizSession({
          summaryText: "Lädt neue Fragen...",
          questions: markedReviewQuestions,
        });

        // Return session ID immediately - Quiz can start with review questions
        res.json({
          sessionId: initialQuizSession.id,
          questionsCount: markedReviewQuestions.length,
          newQuestionsCount: 0, // Will be updated in background
          reviewQuestionsCount: markedReviewQuestions.length,
          filesProcessed: files.length,
          questionTypes: questionTypes,
          message: `Quiz gestartet mit ${markedReviewQuestions.length} Wiederholungsfragen. Neue Fragen werden im Hintergrund geladen...`,
          isLoading: true, // Indicate that more questions are coming
        });

        // Start background generation of new questions AFTER response is sent
        setImmediate(async () => {
          try {
            console.log("Starting background question generation...");

            const newQuestionsNeeded =
              totalQuestions - markedReviewQuestions.length;
            const limitedNewQuestions = allQuestions.slice(
              0,
              newQuestionsNeeded,
            );

            // Combine and randomize ALL questions together
            const allSessionQuestions = [
              ...markedReviewQuestions,
              ...limitedNewQuestions,
            ];

            // Shuffle the combined array for random order
            for (let i = allSessionQuestions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [allSessionQuestions[i], allSessionQuestions[j]] = [
                allSessionQuestions[j],
                allSessionQuestions[i],
              ];
            }

            // Update session with all questions in random order
            await storage.updateQuizSession(initialQuizSession.id, {
              summaryText: combinedSummaryText,
              questions: allSessionQuestions,
            });

            console.log(
              `Updated session ${initialQuizSession.id} with ${allSessionQuestions.length} randomized questions`,
            );
            console.log(`New questions added: ${limitedNewQuestions.length}`);
            console.log(`Total questions now: ${allSessionQuestions.length}`);
          } catch (error) {
            console.error("Error updating session with new questions:", error);
          }
        });
      } catch (error: any) {
        console.error("Upload and generation error:", error);
        res.status(500).json({
          error: error.message || "Fehler beim Verarbeiten der Dateien",
        });
      }
    },
  );

  // Get quiz session
  app.get("/api/quiz/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getQuizSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Quiz-Session nicht gefunden" });
      }

      // Remove potentially large summary text before sending to client
      const { summaryText, ...sessionWithoutSummary } = session as any;
      res.json(sessionWithoutSummary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit answer and get feedback
  app.post("/api/quiz/:sessionId/answer", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { questionId, answer } = req.body as {
        questionId: string;
        answer: string[];
      };

      if (!questionId || !Array.isArray(answer)) {
        return res
          .status(400)
          .json({ error: "Frage-ID und Antwort erforderlich" });
      }

      const session = await storage.getQuizSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Quiz-Session nicht gefunden" });
      }

      const questions = session.questions as any[];
      const currentQuestion = questions.find((q) => q.id === questionId);

      if (!currentQuestion) {
        return res.status(404).json({ error: "Frage nicht gefunden" });
      }

      let isCorrect = false;
      let isSkipped = false;

      // Check if user submitted 'Keine Ahnung' (empty answer)
      if (answer.length === 0) {
        isCorrect = false;
        isSkipped = true; // This will trigger showing the solution
      }
      // Check answer based on question type
      else if (currentQuestion.type === "open") {
        // Use AI to evaluate open question answers
        try {
          const evaluation = await evaluateOpenAnswer(
            answer[0] || "",
            currentQuestion.correctAnswer,
            currentQuestion.text,
          );
          isCorrect = evaluation.isCorrect;
        } catch (error) {
          console.error("AI evaluation failed:", error);
          // Fallback to simple text similarity check
          const userAnswer = (answer[0] || "").toLowerCase().trim();
          const correctAnswer = currentQuestion.correctAnswer
            .toLowerCase()
            .trim();
          isCorrect =
            userAnswer.includes(correctAnswer) ||
            correctAnswer.includes(userAnswer) ||
            userAnswer.length >= 20;
        }
      } else {
        // Multiple choice questions (definition, case, assignment)
        const submitted: string[] = answer;
        const correctIds: string[] = (currentQuestion.options || [])
          .filter((opt: any) => opt.correct)
          .map((opt: any) => opt.id as string);
        isCorrect =
          submitted.length === correctIds.length &&
          submitted.every((id) => correctIds.includes(id)) &&
          correctIds.every((id) => submitted.includes(id));
      }

      // Update stats
      const stats = session.stats as any;
      const isFirstAttempt = !stats.questionAttempts?.[questionId];

      if (isFirstAttempt) {
        stats.asked = (stats.asked || 0) + 1;
        if (isCorrect) {
          stats.correctFirstTry = (stats.correctFirstTry || 0) + 1;
        }
        stats.questionAttempts = {
          ...stats.questionAttempts,
          [questionId]: true,
        };
      } else if (!isCorrect) {
        stats.retries = (stats.retries || 0) + 1;
      }

      await storage.updateQuizSession(sessionId, { stats });

      // Track question usage if it's a stored question
      if (currentQuestion.storedQuestionId) {
        const attempts = stats.questionAttempts?.[questionId] ? 2 : 1; // Simplified attempt tracking
        await storage.trackQuestionUsage(
          sessionId,
          currentQuestion.storedQuestionId,
          isCorrect,
          attempts,
        );
        await storage.updateQuestionLastUsed(currentQuestion.storedQuestionId);
      }

      res.json({
        correct: isCorrect,
        skipped: isSkipped,
        explanation: currentQuestion.explanation,
        correctAnswer:
          currentQuestion.type === "open"
            ? currentQuestion.correctAnswer
            : (currentQuestion.options || [])
                .filter((opt: any) => opt.correct)
                .map((opt: any) => opt.text)
                .join(", "),
        sourceFile: currentQuestion.sourceFile,
        topic: currentQuestion.topic,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if new questions are loaded
  app.get("/api/quiz/:sessionId/status", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getQuizSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: "Quiz-Session nicht gefunden" });
      }

      const questions = session.questions as any[];
      const hasNewQuestions = questions.some((q) => !q.isReviewQuestion);
      const isLoading = session.summaryText === "Lädt neue Fragen...";

      res.json({
        isLoading,
        hasNewQuestions,
        totalQuestions: questions.length,
        reviewQuestions: questions.filter((q) => q.isReviewQuestion).length,
        newQuestions: questions.filter((q) => !q.isReviewQuestion).length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Review pool stats
  app.get("/api/review-pool/stats", async (_req, res) => {
    try {
      const stats = await storage.getReviewPoolStats();
      res.json(stats);
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
      if (typeof currentQuestionIndex === "number") {
        updates.currentQuestionIndex = currentQuestionIndex;
      }
      if (typeof completed === "boolean") {
        updates.completed = completed;
      }

      const updatedSession = await storage.updateQuizSession(
        sessionId,
        updates,
      );

      if (!updatedSession) {
        return res.status(404).json({ error: "Quiz-Session nicht gefunden" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Simple endpoint for client-side error logging
  app.post("/api/log", (req, res) => {
    console.error("Client log:", req.body);
    res.status(204).end();
  });

  const httpServer = createServer(app);
  return httpServer;
}
