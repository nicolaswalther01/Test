import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import type { 
  Question, QuestionType, QuizStats, 
  SourceDocument, Topic, StoredQuestion, QuizSession, QuestionUsage
} from '@shared/schema';

const DATA_DIR = './data';
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
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
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
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface IStorage {
  // Quiz session methods
  createQuizSession(data: { summaryText: string; questions: Question[] }): Promise<QuizSession>;
  getQuizSession(id: string): Promise<QuizSession | undefined>;
  updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession>;
  
  // Document and question storage methods
  storeDocument(filename: string, content: string): Promise<SourceDocument>;
  extractAndStoreTopic(name: string, description?: string): Promise<Topic>;
  storeQuestion(question: Question, sourceDocumentId: number, topicId?: number): Promise<StoredQuestion>;
  
  // Question retrieval methods
  getReviewQuestions(excludeTopics: string[], limit: number): Promise<Question[]>;
  getQuestionsByTopic(topicName: string, limit: number): Promise<Question[]>;
  getQuestionsByDocument(documentId: number, limit: number): Promise<Question[]>;
  
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
      
      // Initialize CSV files with headers if they don't exist
      const headers = {
        documents: 'id,filename,content,uploadedAt\n',
        topics: 'id,name,description,createdAt\n',
        questions: 'id,sourceDocumentId,topicId,type,questionText,options,correctAnswer,explanation,difficulty,createdAt,lastUsed,useCount\n',
        sessions: 'id,summaryText,questions,currentQuestionIndex,stats,completed,createdAt,updatedAt\n',
        usage: 'id,sessionId,storedQuestionId,wasCorrectFirstTry,attemptsCount,usedAt\n'
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

    const csvLine = [
      escapeCSV(session.id),
      escapeCSV(session.summaryText),
      escapeCSV(JSON.stringify(session.questions)),
      escapeCSV(session.currentQuestionIndex),
      escapeCSV(JSON.stringify(session.stats)),
      escapeCSV(session.completed),
      escapeCSV(now),
      escapeCSV(now)
    ].join(',') + '\n';

    await fs.appendFile(FILES.sessions, csvLine);
    return session;
  }

  async getQuizSession(id: string): Promise<QuizSession | undefined> {
    try {
      const content = await fs.readFile(FILES.sessions, 'utf-8');
      const lines = content.trim().split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        const fields = parseCSVLine(line);
        if (fields[0] === id) {
          return {
            id: fields[0],
            summaryText: fields[1],
            questions: JSON.parse(fields[2] || '[]'),
            currentQuestionIndex: Number(fields[3]) || 0,
            stats: JSON.parse(fields[4] || '{"asked":0,"correctFirstTry":0,"retries":0,"questionAttempts":{}}'),
            completed: fields[5] === 'true',
            createdAt: new Date(fields[6]),
            updatedAt: new Date(fields[7])
          };
        }
      }
    } catch (error) {
      console.error('Error reading quiz session:', error);
    }
    return undefined;
  }

  async updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession> {
    const session = await this.getQuizSession(id);
    if (!session) {
      throw new Error('Quiz session not found');
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };

    // Read all sessions
    const content = await fs.readFile(FILES.sessions, 'utf-8');
    const lines = content.trim().split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);

    // Update the specific session
    const updatedLines = dataLines.map(line => {
      const fields = parseCSVLine(line);
      if (fields[0] === id) {
        return [
          escapeCSV(updatedSession.id),
          escapeCSV(updatedSession.summaryText),
          escapeCSV(JSON.stringify(updatedSession.questions)),
          escapeCSV(updatedSession.currentQuestionIndex),
          escapeCSV(JSON.stringify(updatedSession.stats)),
          escapeCSV(updatedSession.completed),
          escapeCSV(updatedSession.createdAt.toISOString()),
          escapeCSV(updatedSession.updatedAt.toISOString())
        ].join(',');
      }
      return line;
    });

    // Write back to file
    await fs.writeFile(FILES.sessions, header + '\n' + updatedLines.join('\n') + '\n');
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
      difficulty: 'medium',
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
      escapeCSV('medium'),
      escapeCSV(now),
      escapeCSV(''), // lastUsed
      escapeCSV('0') // useCount
    ].join(',') + '\n';

    await fs.appendFile(FILES.questions, csvLine);
    return storedQuestion;
  }

  async getReviewQuestions(excludeTopics: string[], limit: number): Promise<Question[]> {
    try {
      const questionsContent = await fs.readFile(FILES.questions, 'utf-8');
      const topicsContent = await fs.readFile(FILES.topics, 'utf-8');
      
      const questionLines = questionsContent.trim().split('\n').slice(1);
      const topicLines = topicsContent.trim().split('\n').slice(1);
      
      // Build topic name map
      const topicMap = new Map<number, string>();
      for (const line of topicLines) {
        const fields = parseCSVLine(line);
        topicMap.set(Number(fields[0]), fields[1]);
      }

      const reviewQuestions: Question[] = [];
      for (const line of questionLines) {
        const fields = parseCSVLine(line);
        const topicId = fields[2] ? Number(fields[2]) : null;
        const topicName = topicId ? topicMap.get(topicId) : '';
        
        if (!topicName || !excludeTopics.includes(topicName)) {
          const question: Question = {
            id: `stored_${fields[0]}`,
            type: fields[3] as QuestionType,
            text: fields[4],
            options: fields[5] ? JSON.parse(fields[5]) : undefined,
            correctAnswer: fields[6] || undefined,
            explanation: fields[7],

            topic: topicName,
            storedQuestionId: Number(fields[0])
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