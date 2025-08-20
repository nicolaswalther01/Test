import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import type { 
  Question, QuestionType, QuizStats, 
  SourceDocument, Topic, StoredQuestion, QuizSession, QuestionUsage
} from '@shared/schema';

const DATA_DIR = './data';
const SESSION_DIR = path.join(DATA_DIR, 'sessions');
const FILES = {
  documents: path.join(DATA_DIR, 'documents.csv'),
  topics: path.join(DATA_DIR, 'topics.csv'),
  questions: path.join(DATA_DIR, 'questions.csv'),
  sessions: path.join(DATA_DIR, 'sessions.csv'),
  usage: path.join(DATA_DIR, 'usage.csv')
};

// CSV Helper functions
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Double quote escape - add single quote and skip next
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      // Toggle quote mode
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // Field separator outside quotes
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Always quote to prevent CSV parsing issues
  return `"${str.replace(/"/g, '""')}"`;
}

export interface IStorage {
  // Quiz session methods
  createQuizSession(data: { summaryText: string; questions: Question[] }): Promise<QuizSession>;
  getQuizSession(id: string): Promise<QuizSession | undefined>;
  updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession | null>;

  // Document and question storage methods
  storeDocument(filename: string, content: string): Promise<SourceDocument>;
  extractAndStoreTopic(name: string, description?: string): Promise<Topic>;
  storeQuestion(question: Question, sourceDocumentId: number, topicId?: number): Promise<StoredQuestion>;

  // Question retrieval methods
  getReviewQuestions(limit: number): Promise<Question[]>;
  getQuestionsByTopic(topicName: string, limit: number): Promise<Question[]>;
  getQuestionsByDocument(documentId: number, limit: number): Promise<Question[]>;
  getReviewPoolStats(): Promise<{ total: number }>;

  // Usage tracking
  trackQuestionUsage(sessionId: string, storedQuestionId: number, wasCorrect: boolean, attempts: number): Promise<void>;
  updateQuestionLastUsed(storedQuestionId: number): Promise<void>;
}

export class CSVStorage implements IStorage {
  private nextId = {
    documents: 1,
    topics: 1,
    questions: 1,
    usage: 1
  };

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.mkdir(SESSION_DIR, { recursive: true });

      // Initialize CSV files with headers if they don't exist
      const headers = {
        documents: 'id,filename,content,uploadedAt\n',
        topics: 'id,name,description,createdAt\n',
        questions: 'id,sourceDocumentId,topicId,type,questionText,options,correctAnswer,explanation,difficulty,createdAt,lastUsed,useCount\n',
        sessions: 'id,summaryText,questions,currentQuestionIndex,stats,completed,createdAt,updatedAt\n',
        usage: 'id,sessionId,storedQuestionId,wasCorrect,attemptsCount,usedAt\n'
      };

      for (const [key, file] of Object.entries(FILES)) {
        try {
          await fs.access(file);
          // File exists, read it to determine next IDs
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.trim().split('\n');
          if (lines.length > 1) {
            const lastLine = lines[lines.length - 1];
            const fields = parseCSVLine(lastLine);
            if (fields[0] && !isNaN(Number(fields[0]))) {
              this.nextId[key as keyof typeof this.nextId] = Number(fields[0]) + 1;
            }
          }
        } catch {
          // File doesn't exist, create it with headers
          await fs.writeFile(file, headers[key as keyof typeof headers]);
        }
      }
    } catch (error) {
      console.error('Failed to initialize CSV storage:', error);
    }
  }

  async createQuizSession(data: { summaryText: string; questions: Question[] }): Promise<QuizSession> {
    const sessionId = uuidv4();
    const initialStats: QuizStats = { asked: 0, correctFirstTry: 0, retries: 0, questionAttempts: {} };
    const now = new Date().toISOString();

    const session: QuizSession = {
      id: sessionId,
      summaryText: data.summaryText,
      questions: data.questions,
      currentQuestionIndex: 0,
      stats: initialStats,
      completed: false,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };

    // Store session as JSON file with safe serialization
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    try {
      // Use safe JSON stringification with proper escaping
      const jsonContent = JSON.stringify(session, (key, value) => {
        if (typeof value === 'string') {
          // Clean up potential problematic characters that could break JSON
          return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        }
        return value;
      }, 2);

      await fs.writeFile(sessionFile, jsonContent, 'utf8');

      console.log('Successfully created quiz session:', sessionId);
      console.log('Questions count:', (session.questions as any[]).length);

    } catch (error) {
      console.error('Error writing session file:', error);
      throw new Error('Failed to create quiz session');
    }

    const questionsArray = session.questions as any[];
    console.log('Creating quiz session with questions:', questionsArray.length);
    console.log('Sample question:', questionsArray[0] ? questionsArray[0].text?.substring(0, 100) : 'No questions');

    return session;
  }

  async getQuizSession(id: string): Promise<QuizSession | undefined> {
    try {
      const sessionFile = path.join(SESSION_DIR, `${id}.json`);

      // Check if file exists first
      try {
        await fs.access(sessionFile);
      } catch {
        console.error('Session file not found:', id);
        return undefined;
      }

      const content = await fs.readFile(sessionFile, 'utf-8');

      // Validate JSON before parsing
      if (!content.trim()) {
        console.error('Empty session file:', id);
        return undefined;
      }

      let session;
      try {
        session = JSON.parse(content);
      } catch (parseError: any) {
        console.error('JSON parse error for session:', id, parseError.message);
        console.error('Content length:', content.length);
        console.error('Content preview:', content.substring(0, 200));

        // Try to repair the session by recreating it
        try {
          await fs.unlink(sessionFile);
          console.log('Deleted corrupted session file:', id);
        } catch (deleteError) {
          console.error('Could not delete corrupted file:', deleteError);
        }
        return undefined;
      }

      console.log('Found session:', id);
      console.log('Questions count:', session.questions?.length || 0);

      // Convert date strings back to Date objects
      session.createdAt = new Date(session.createdAt);
      session.updatedAt = new Date(session.updatedAt);

      return session;
    } catch (error: any) {
      console.error('Error reading quiz session:', id, error.message);
    }
    return undefined;
  }

  async updateQuizSession(sessionId: string, updates: Partial<QuizSession>): Promise<QuizSession | null> {
    const session = await this.getQuizSession(sessionId);
    if (!session) {
      console.error('Attempted to update non-existent session:', sessionId);
      return null; // Return null if session not found
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };

    // Save updated session as JSON with safe serialization
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    try {
      const jsonContent = JSON.stringify(updatedSession, (key, value) => {
        if (typeof value === 'string') {
          // Clean up potential problematic characters
          return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        }
        return value;
      }, 2);

      await fs.writeFile(sessionFile, jsonContent, 'utf8');
      console.log('Successfully updated session:', sessionId);

    } catch (error) {
      console.error('Error updating session file:', error);
      throw new Error('Failed to update quiz session');
    }

    return updatedSession;
  }

  async storeDocument(filename: string, content: string): Promise<SourceDocument> {
    const id = this.nextId.documents++;
    const now = new Date().toISOString();

    const document: SourceDocument = {
      id,
      filename,
      content,
      uploadedAt: new Date(now)
    };

    const csvLine = [
      escapeCSV(id),
      escapeCSV(filename),
      escapeCSV(content),
      escapeCSV(now)
    ].join(',') + '\n';

    await fs.appendFile(FILES.documents, csvLine);
    return document;
  }

  async extractAndStoreTopic(name: string, description?: string): Promise<Topic> {
    // Check if topic already exists
    try {
      const content = await fs.readFile(FILES.topics, 'utf-8');
      const lines = content.trim().split('\n').slice(1);

      for (const line of lines) {
        const fields = parseCSVLine(line);
        if (fields[1] === name) {
          return {
            id: Number(fields[0]),
            name: fields[1],
            description: fields[2] || null,
            createdAt: new Date(fields[3])
          };
        }
      }
    } catch (error) {
      console.error('Error reading topics:', error);
    }

    // Create new topic
    const id = this.nextId.topics++;
    const now = new Date().toISOString();

    const topic: Topic = {
      id,
      name,
      description: description || null,
      createdAt: new Date(now)
    };

    const csvLine = [
      escapeCSV(id),
      escapeCSV(name),
      escapeCSV(description || ''),
      escapeCSV(now)
    ].join(',') + '\n';

    await fs.appendFile(FILES.topics, csvLine);
    return topic;
  }

  async storeQuestion(question: Question, sourceDocumentId: number, topicId?: number): Promise<StoredQuestion> {
    const id = this.nextId.questions++;
    const now = new Date().toISOString();

    const storedQuestion: StoredQuestion = {
      id,
      sourceDocumentId,
      topicId: topicId || null,
      type: question.type,
      questionText: question.text,
      options: question.options || null,
      correctAnswer: question.correctAnswer || null,
      explanation: question.explanation,
      difficulty: question.difficulty || 'basic',
      createdAt: new Date(now),
      lastUsed: null,
      useCount: 0
    };

    const csvLine = [
      escapeCSV(id),
      escapeCSV(sourceDocumentId),
      escapeCSV(topicId || ''),
      escapeCSV(question.type),
      escapeCSV(question.text),
      escapeCSV(JSON.stringify(question.options || null)),
      escapeCSV(question.correctAnswer || ''),
      escapeCSV(question.explanation),
      escapeCSV(question.difficulty || 'basic'),
      escapeCSV(now),
      escapeCSV(''), // lastUsed
      escapeCSV('0') // useCount
    ].join(',') + '\n';

    await fs.appendFile(FILES.questions, csvLine);
    return storedQuestion;
  }


  async getReviewQuestions(limit: number = 10): Promise<Question[]> {
    const reviewQuestions: Question[] = [];
    try {
      const usageContent = await fs.readFile(FILES.usage, 'utf-8');
      const usageLines = usageContent.trim().split('\n').slice(1); // Skip header

      const stats = new Map<
        number,
        { correctCount: number; timesAsked: number; lastCorrect: boolean }
      >();
      for (const line of usageLines) {
        const fields = parseCSVLine(line);
        const storedQuestionId = Number(fields[2]);
        const wasCorrect = fields[3] === 'true';

        if (!isNaN(storedQuestionId)) {
          const entry = stats.get(storedQuestionId) || {
            correctCount: 0,
            timesAsked: 0,
            lastCorrect: false,
          };
          entry.timesAsked += 1;
          entry.lastCorrect = wasCorrect;
          if (wasCorrect) entry.correctCount += 1;
          stats.set(storedQuestionId, entry);
        }
      }

      const questionContent = await fs.readFile(FILES.questions, 'utf-8');
      const questionLines = questionContent.trim().split('\n').slice(1); // Skip header

      for (const line of questionLines) {
        const fields = parseCSVLine(line);
        const questionId = Number(fields[0]);
        const stat = stats.get(questionId);

        // Include only questions that have been answered (present in usage) and
        // have fewer than two total correct answers
        if (stat && stat.correctCount < 2) {
          const question: Question = {
            id: `stored_${fields[0]}`,
            type: fields[3] as QuestionType,
            text: fields[4],
            options: fields[5] ? JSON.parse(fields[5]) : undefined,
            correctAnswer: fields[6] || undefined,
            explanation: fields[7],
            difficulty: (fields[8] as 'basic' | 'profi') || 'basic',
            sourceFile: 'Wiederholung',
            storedQuestionId: Number(fields[0]),
            isReviewQuestion: true,
            timesAsked: stat.timesAsked,
            lastCorrect: stat.lastCorrect,
            correctRemaining: Math.max(0, 2 - stat.correctCount),
          };
          reviewQuestions.push(question);

          if (reviewQuestions.length >= limit) break;
        }
      }

      return reviewQuestions;
    } catch (error) {
      console.error('Error getting review questions:', error);
      return [];
    }
  }

  async getQuestionsByTopic(topicName: string, limit: number): Promise<Question[]> {
    // Implementation similar to getReviewQuestions but filtered by topic
    return [];
  }

  async getQuestionsByDocument(documentId: number, limit: number): Promise<Question[]> {
    // Implementation similar to getReviewQuestions but filtered by document
    return [];
  }

  async getReviewPoolStats(): Promise<{ total: number }> {
    try {
      const usageContent = await fs.readFile(FILES.usage, 'utf-8');
      const usageLines = usageContent.trim().split('\n').slice(1);

      const correctCounts = new Map<number, number>();
      for (const line of usageLines) {
        const fields = parseCSVLine(line);
        const storedQuestionId = Number(fields[2]);
        const wasCorrect = fields[3] === 'true';

        if (!isNaN(storedQuestionId)) {
          const current = correctCounts.get(storedQuestionId) || 0;
          if (wasCorrect) {
            correctCounts.set(storedQuestionId, current + 1);
          } else if (!correctCounts.has(storedQuestionId)) {
            correctCounts.set(storedQuestionId, 0);
          }
        }
      }

      let total = 0;
      for (const count of Array.from(correctCounts.values())) {
        if (count < 2) total++;
      }

      return { total };
    } catch (error) {
      console.error('Error getting review pool stats:', error);
      return { total: 0 };
    }
  }

  async trackQuestionUsage(sessionId: string, storedQuestionId: number, wasCorrect: boolean, attempts: number): Promise<void> {
    const id = this.nextId.usage++;
    const now = new Date().toISOString();

    const csvLine = [
      escapeCSV(id),
      escapeCSV(sessionId),
      escapeCSV(storedQuestionId),
      escapeCSV(wasCorrect),
      escapeCSV(attempts),
      escapeCSV(now)
    ].join(',') + '\n';

    await fs.appendFile(FILES.usage, csvLine);
  }

  async updateQuestionLastUsed(storedQuestionId: number): Promise<void> {
    // Read and update questions file
    try {
      const content = await fs.readFile(FILES.questions, 'utf-8');
      const lines = content.trim().split('\n');
      const header = lines[0];
      const dataLines = lines.slice(1);

      const updatedLines = dataLines.map(line => {
        const fields = parseCSVLine(line);
        if (Number(fields[0]) === storedQuestionId) {
          // Update lastUsed and increment useCount
          fields[10] = new Date().toISOString(); // lastUsed
          fields[11] = String(Number(fields[11] || 0) + 1); // useCount
          return fields.map(escapeCSV).join(',');
        }
        return line;
      });

      await fs.writeFile(FILES.questions, header + '\n' + updatedLines.join('\n') + '\n');
    } catch (error) {
      console.error('Error updating question last used:', error);
    }
  }
}

export const storage = new CSVStorage();