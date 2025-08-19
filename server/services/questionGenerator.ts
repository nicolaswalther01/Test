import OpenAI from "openai";
import type { Question, QuestionType } from "@shared/schema";

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-4o", not "gpt-4". gpt-4o was released after your knowledge cutoff. Always prefer using gpt-4o as it is the latest model. When copying code from this blueprint, ensure you also mention this information verbatim as a comment so that you don't revert it to "gpt-4": `// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user`
*/

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GenerationResult {
  questions: Question[];
  error?: string;
}

interface EvaluationResult {
  isCorrect: boolean;
  feedback?: string;
}

export async function generateQuestionsFromText(
  summaryText: string,
  questionTypes: QuestionType[] = ["definition", "case", "assignment", "open"],
  questionsPerFile: number = 10,
  filename?: string
): Promise<GenerationResult> {
  if (!openai.apiKey) {
    return { questions: [], error: "API-Schlüssel für OpenAI fehlt" };
  }

  try {
    // Create dynamic prompt based on selected question types
    const typeDescriptions: Record<QuestionType, string> = {
      definition: "Definitionsfragen: Klare Begriffserklärungen",
      case: "Fallfragen: Mini-Szenarien mit praktischem Bezug (kann auch Rechenaufgaben beinhalten)",
      assignment: "Zuordnungsfragen: Begriff-zu-Oberthema Zuordnung (z.B. 'Commerce' gehört zu welchem Oberthema: '5Cs')",
      open: "Offene Fragen: Freie Antwortfelder für ausführliche Antworten (kann auch Rechenaufgaben mit schrittweisen Lösungen beinhalten)"
    };

    const selectedTypes = questionTypes.map(type => `   - ${typeDescriptions[type]}`).join('\n');
    const questionsPerType = Math.ceil(questionsPerFile / questionTypes.length);

    const prompt = `Du bist ein Experte für IHK-Prüfungsfragen. Erstelle aus dem folgenden Zusammenfassungstext ${questionsPerFile} Fragen im IHK-Stil auf Deutsch.

KRITISCHE REGEL - MUSS BEFOLGT WERDEN:
Du darfst AUSSCHLIESSLICH folgende Fragentypen erstellen (ca. ${questionsPerType} Fragen pro Typ):
${selectedTypes}

VERBOTEN: Keine anderen Fragentypen verwenden! Jede Frage MUSS einen der oben genannten Typen haben!

WEITERE WICHTIGE REGELN:
1. Verwende NUR Inhalte aus dem bereitgestellten Text
2. Stelle sicher, dass der "type" jeder Frage exakt einem der ausgewählten Typen entspricht: ${questionTypes.join(', ')}

3. SPEZIELLE REGELN FÜR ZUORDNUNGSFRAGEN:
   - Frage: "Zu welchem Thema gehört folgender Begriff: [BEGRIFF]?"
   - WICHTIG: Der Begriff steht separat, NICHT in der Frage selbst
   - Biete 4 Antwortoptionen: 3 falsche Themen + 1 richtiges Thema
   - Beispiel: 
     Frage: "Zu welchem Thema gehört folgender Begriff: Commerce"
     Optionen: A) 4Ps des Marketing-Mix, B) 5Cs des Marketing (RICHTIG), C) SWOT-Analyse, D) Porter's Five Forces

4. SPEZIELLE REGELN FÜR OFFENE FRAGEN:
   - Frage nach ausführlichen Erklärungen oder Beschreibungen
   - Erwarte vollständige Sätze als Antwort
   - Beispiel: "Erklären Sie ausführlich das Konzept der 5Cs im Marketing."

5. Für jede Frage erstelle auch eine "Retry-Frage" - eine ähnliche Frage zum gleichen Lernziel aber mit anderem Beispiel
6. Jede Frage braucht eine präzise Erklärung

Antworte mit JSON im folgenden Format:

BEISPIEL FÜR ZUORDNUNGSFRAGE:
{
  "id": "q1",
  "type": "assignment",
  "text": "Zu welchem Thema gehört folgender Begriff: Commerce",
  "options": [
    {"id": "a", "text": "4Ps des Marketing-Mix", "correct": false},
    {"id": "b", "text": "5Cs des Marketing", "correct": true},
    {"id": "c", "text": "SWOT-Analyse", "correct": false},
    {"id": "d", "text": "Porter's Five Forces", "correct": false}
  ],
  "explanation": "Commerce gehört zu den 5Cs des Marketing als einer der fünf wichtigen Analysefaktoren.",
  "retryQuestion": {
    "text": "Zu welchem Thema gehört folgender Begriff: Customers",
    "options": [...],
    "correctAnswer": "..."
  }
}

JSON-Format für alle Fragen - WICHTIG: Jede Frage MUSS alle Felder haben!
{
  "questions": [
    {
      "id": "q1",
      "type": "definition|case|assignment|open",
      "text": "Frage hier...",
      "options": [
        {"id": "a", "text": "Option A", "isCorrect": true},
        {"id": "b", "text": "Option B", "isCorrect": false},
        {"id": "c", "text": "Option C", "isCorrect": false},
        {"id": "d", "text": "Option D", "isCorrect": false}
      ],
      "correctAnswer": "Nur bei offenen Fragen - Musterantwort",
      "explanation": "Erklärung warum diese Antwort richtig ist...",
      "retryQuestion": "Vereinfachte Wiederholungsfrage..."
    }
  ]
}

WICHTIGE REGELN:
- Für definition, case, assignment: IMMER 4 options mit id a,b,c,d
- Für open: options leer lassen [], dafür correctAnswer füllen
- Jede Frage MUSS explanation und retryQuestion haben

ZUSAMMENFASSUNG (NUTZE DAS GESAMTE DOKUMENT FÜR FRAGEN):
${summaryText}

WICHTIG: 
- Erstelle Fragen aus dem GESAMTEN Dokument, nicht nur vom Anfang
- Verwende verschiedene Abschnitte und Themen aus der kompletten Zusammenfassung
- KRITISCH: Jede Frage MUSS den "type" auf einen der ausgewählten Werte setzen: ${questionTypes.join(', ')}
- NIEMALS andere Fragentypen verwenden!`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content:
            "Du bist ein Experte für deutsche IHK-Prüfungen. Antworte immer auf Deutsch und im korrekten JSON-Format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 10000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { questions: [], error: "Keine Antwort von der AI erhalten" };
    }

    const result = JSON.parse(content);

    // Validate and clean up the questions with STRICT type filtering
    const questions: Question[] =
      result.questions
        ?.filter((q: any) => {
          // CRITICAL: Only allow questions that match the selected types
          if (!questionTypes.includes(q.type)) {
            console.warn(`Skipping question with unselected type: ${q.type} for question: ${q.text}`);
            return false;
          }
          
          // For multiple choice questions, ensure they have options
          if (
            q.type !== "open" &&
            (!q.options || !Array.isArray(q.options) || q.options.length === 0)
          ) {
            console.warn(`Skipping question with missing options: ${q.text}`);
            return false;
          }
          
          // Ensure the question type is valid
          if (!["definition", "case", "assignment", "open"].includes(q.type)) {
            console.warn(`Skipping question with invalid type: ${q.type}`);
            return false;
          }
          
          return true;
        })
        .map((q: any, index: number) => ({
          id: q.id || `q${index + 1}`,
          type: q.type as QuestionType,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          retryQuestion: q.retryQuestion,
          sourceFile: filename,
        })) || [];

    if (questions.length === 0) {
      return { questions: [], error: "Keine Fragen der ausgewählten Typen generiert" };
    }

    // Double-check: Ensure ALL returned questions match selected types
    const invalidQuestions = questions.filter(q => !questionTypes.includes(q.type));
    if (invalidQuestions.length > 0) {
      console.error(`CRITICAL: Found ${invalidQuestions.length} questions with invalid types after filtering!`);
      const validQuestions = questions.filter(q => questionTypes.includes(q.type));
      return { 
        questions: validQuestions,
        error: validQuestions.length === 0 ? "Keine Fragen der ausgewählten Typen generiert" : undefined
      };
    }

    // Log for verification
    const typeDistribution = questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`Generated questions by type:`, typeDistribution);
    console.log(`Selected types:`, questionTypes);

    return { questions };
  } catch (error: any) {
    console.error("Question generation error:", error);
    return {
      questions: [],
      error: `Fehler beim Generieren der Fragen: ${error.message || "Unbekannter Fehler"}`,
    };
  }
}

export async function evaluateOpenAnswer(
  userAnswer: string,
  correctAnswer: string,
  questionText: string,
): Promise<EvaluationResult> {
  if (!openai.apiKey) {
    throw new Error("OpenAI API key missing");
  }

  try {
    const prompt = `Du bist ein IHK-Prüfungsexperte. Bewerte die folgende Antwort auf eine offene Frage.

FRAGE: ${questionText}

MUSTERLÖSUNG: ${correctAnswer}

SCHÜLER-ANTWORT: ${userAnswer}

Bewerte ob die Schüler-Antwort fachlich korrekt ist und die wesentlichen Punkte der Musterlösung enthält.

BEWERTUNGSKRITERIEN:
- Fachliche Richtigkeit
- Vollständigkeit der wichtigsten Aspekte
- Verständnis des Themas erkennbar
- Auch wenn nicht wortwörtlich gleich, kann die Antwort richtig sein

Antworte mit JSON:
{
  "isCorrect": true/false,
  "feedback": "Kurze Erklärung der Bewertung"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content:
            "Du bist ein fairer und kompetenter IHK-Prüfer. Bewerte präzise aber nicht zu streng.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 10000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);
    return {
      isCorrect: result.isCorrect || false,
      feedback: result.feedback || "Bewertung nicht verfügbar",
    };
  } catch (error: any) {
    console.error("Open answer evaluation error:", error);
    throw new Error(`AI evaluation failed: ${error.message}`);
  }
}
