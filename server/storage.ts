import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { 
  sourceDocuments, topics, storedQuestions, quizSessions, questionUsage,
  InsertSourceDocument, InsertTopic, InsertStoredQuestion, InsertQuizSession, InsertQuestionUsage,
  SourceDocument, Topic, StoredQuestion, QuizSession, QuestionUsage,
  Question, QuestionType, QuizStats 
} from '@shared/schema';
import { eq, and, desc, asc, sql, notInArray, inArray } from 'drizzle-orm';

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

export class DatabaseStorage implements IStorage {
  
  async createQuizSession(data: { summaryText: string; questions: Question[] }): Promise<QuizSession> {
    const sessionId = uuidv4();
    const initialStats: QuizStats = { asked: 0, correctFirstTry: 0, retries: 0 };
    
    const [session] = await db
      .insert(quizSessions)
      .values({
        id: sessionId,
        summaryText: data.summaryText,
        questions: data.questions,
        currentQuestionIndex: 0,
        stats: initialStats,
        completed: false,
      })
      .returning();
    
    return session;
  }

  async getQuizSession(id: string): Promise<QuizSession | undefined> {
    const [session] = await db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.id, id));
    
    return session || undefined;
  }

  async updateQuizSession(id: string, updates: Partial<QuizSession>): Promise<QuizSession> {
    const [session] = await db
      .update(quizSessions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(quizSessions.id, id))
      .returning();
    
    return session;
  }

  async storeDocument(filename: string, content: string): Promise<SourceDocument> {
    // Check if document with same name exists
    const [existingDoc] = await db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.filename, filename));
    
    if (existingDoc) {
      // Update existing document
      const [updatedDoc] = await db
        .update(sourceDocuments)
        .set({ content, uploadedAt: new Date() })
        .where(eq(sourceDocuments.id, existingDoc.id))
        .returning();
      return updatedDoc;
    }
    
    // Create new document
    const [doc] = await db
      .insert(sourceDocuments)
      .values({ filename, content })
      .returning();
    
    return doc;
  }

  async extractAndStoreTopic(name: string, description?: string): Promise<Topic> {
    try {
      // Try to create new topic
      const [topic] = await db
        .insert(topics)
        .values({ name, description })
        .returning();
      return topic;
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        // Topic already exists, fetch and return it
        const [existingTopic] = await db
          .select()
          .from(topics)
          .where(eq(topics.name, name));
        return existingTopic;
      }
      throw error;
    }
  }

  async storeQuestion(question: Question, sourceDocumentId: number, topicId?: number): Promise<StoredQuestion> {
    const [storedQuestion] = await db
      .insert(storedQuestions)
      .values({
        sourceDocumentId,
        topicId,
        type: question.type,
        questionText: question.text,
        options: question.options || null,
        correctAnswer: question.correctAnswer || null,
        explanation: question.explanation,
        retryQuestion: question.retryQuestion || null,
      })
      .returning();
    
    return storedQuestion;
  }

  async getReviewQuestions(excludeTopics: string[] = [], limit: number = 10): Promise<Question[]> {
    let query = db
      .select({
        id: storedQuestions.id,
        type: storedQuestions.type,
        questionText: storedQuestions.questionText,
        options: storedQuestions.options,
        correctAnswer: storedQuestions.correctAnswer,
        explanation: storedQuestions.explanation,
        retryQuestion: storedQuestions.retryQuestion,
        sourceDocument: sourceDocuments.filename,
        topic: topics.name,
        useCount: storedQuestions.useCount,
        lastUsed: storedQuestions.lastUsed,
      })
      .from(storedQuestions)
      .leftJoin(sourceDocuments, eq(storedQuestions.sourceDocumentId, sourceDocuments.id))
      .leftJoin(topics, eq(storedQuestions.topicId, topics.id));

    if (excludeTopics.length > 0) {
      query = query.where(
        sql`${topics.name} NOT IN ${excludeTopics} OR ${topics.name} IS NULL`
      );
    }

    const results = await query
      .orderBy(asc(storedQuestions.useCount), asc(storedQuestions.lastUsed))
      .limit(limit);

    return results.map((row): Question => ({
      id: `stored_${row.id}`,
      type: row.type as QuestionType,
      text: row.questionText,
      options: row.options as any,
      correctAnswer: row.correctAnswer || undefined,
      explanation: row.explanation,
      retryQuestion: row.retryQuestion as any,
      sourceFile: row.sourceDocument || undefined,
      topic: row.topic || undefined,
      storedQuestionId: row.id,
    }));
  }

  async getQuestionsByTopic(topicName: string, limit: number = 10): Promise<Question[]> {
    const results = await db
      .select({
        id: storedQuestions.id,
        type: storedQuestions.type,
        questionText: storedQuestions.questionText,
        options: storedQuestions.options,
        correctAnswer: storedQuestions.correctAnswer,
        explanation: storedQuestions.explanation,
        retryQuestion: storedQuestions.retryQuestion,
        sourceDocument: sourceDocuments.filename,
        topic: topics.name,
      })
      .from(storedQuestions)
      .leftJoin(sourceDocuments, eq(storedQuestions.sourceDocumentId, sourceDocuments.id))
      .leftJoin(topics, eq(storedQuestions.topicId, topics.id))
      .where(eq(topics.name, topicName))
      .limit(limit);

    return results.map((row): Question => ({
      id: `stored_${row.id}`,
      type: row.type as QuestionType,
      text: row.questionText,
      options: row.options as any,
      correctAnswer: row.correctAnswer || undefined,
      explanation: row.explanation,
      retryQuestion: row.retryQuestion as any,
      sourceFile: row.sourceDocument || undefined,
      topic: row.topic || undefined,
      storedQuestionId: row.id,
    }));
  }

  async getQuestionsByDocument(documentId: number, limit: number = 10): Promise<Question[]> {
    const results = await db
      .select({
        id: storedQuestions.id,
        type: storedQuestions.type,
        questionText: storedQuestions.questionText,
        options: storedQuestions.options,
        correctAnswer: storedQuestions.correctAnswer,
        explanation: storedQuestions.explanation,
        retryQuestion: storedQuestions.retryQuestion,
        sourceDocument: sourceDocuments.filename,
        topic: topics.name,
      })
      .from(storedQuestions)
      .leftJoin(sourceDocuments, eq(storedQuestions.sourceDocumentId, sourceDocuments.id))
      .leftJoin(topics, eq(storedQuestions.topicId, topics.id))
      .where(eq(storedQuestions.sourceDocumentId, documentId))
      .limit(limit);

    return results.map((row): Question => ({
      id: `stored_${row.id}`,
      type: row.type as QuestionType,
      text: row.questionText,
      options: row.options as any,
      correctAnswer: row.correctAnswer || undefined,
      explanation: row.explanation,
      retryQuestion: row.retryQuestion as any,
      sourceFile: row.sourceDocument || undefined,
      topic: row.topic || undefined,
      storedQuestionId: row.id,
    }));
  }

  async trackQuestionUsage(sessionId: string, storedQuestionId: number, wasCorrect: boolean, attempts: number): Promise<void> {
    await db
      .insert(questionUsage)
      .values({
        sessionId,
        storedQuestionId,
        wasCorrectFirstTry: wasCorrect && attempts === 1,
        attemptsCount: attempts,
      });
  }

  async updateQuestionLastUsed(storedQuestionId: number): Promise<void> {
    await db
      .update(storedQuestions)
      .set({
        lastUsed: new Date(),
        useCount: sql`${storedQuestions.useCount} + 1`,
      })
      .where(eq(storedQuestions.id, storedQuestionId));
  }
}

export const storage = new DatabaseStorage();