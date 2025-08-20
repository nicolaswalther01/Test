import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Source documents table
export const sourceDocuments = pgTable("source_documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// Topics extracted from documents
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stored questions with metadata
export const storedQuestions = pgTable("stored_questions", {
  id: serial("id").primaryKey(),
  sourceDocumentId: integer("source_document_id").references(() => sourceDocuments.id).notNull(),
  topicId: integer("topic_id").references(() => topics.id),
  type: varchar("type", { length: 20 }).notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options"), // For multiple choice questions
  correctAnswer: text("correct_answer"), // For open questions
  explanation: text("explanation").notNull(),

  difficulty: varchar("difficulty", { length: 10 }).default("medium"), // easy, medium, hard
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsed: timestamp("last_used"),
  useCount: integer("use_count").default(0).notNull(),
});

// Quiz sessions
export const quizSessions = pgTable("quiz_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  summaryText: text("summary_text").notNull(),
  questions: jsonb("questions").notNull(),
  currentQuestionIndex: integer("current_question_index").default(0),
  stats: jsonb("stats").notNull().default('{"asked": 0, "correctFirstTry": 0, "retries": 0}'),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Question usage tracking in sessions
export const questionUsage = pgTable("question_usage", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").references(() => quizSessions.id).notNull(),
  storedQuestionId: integer("stored_question_id").references(() => storedQuestions.id).notNull(),
  wasCorrectFirstTry: boolean("was_correct_first_try"),
  attemptsCount: integer("attempts_count").default(0).notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// Relations
export const sourceDocumentsRelations = relations(sourceDocuments, ({ many }) => ({
  questions: many(storedQuestions),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  questions: many(storedQuestions),
}));

export const storedQuestionsRelations = relations(storedQuestions, ({ one, many }) => ({
  sourceDocument: one(sourceDocuments, {
    fields: [storedQuestions.sourceDocumentId],
    references: [sourceDocuments.id],
  }),
  topic: one(topics, {
    fields: [storedQuestions.topicId],
    references: [topics.id],
  }),
  usages: many(questionUsage),
}));

export const quizSessionsRelations = relations(quizSessions, ({ many }) => ({
  questionUsages: many(questionUsage),
}));

export const questionUsageRelations = relations(questionUsage, ({ one }) => ({
  session: one(quizSessions, {
    fields: [questionUsage.sessionId],
    references: [quizSessions.id],
  }),
  storedQuestion: one(storedQuestions, {
    fields: [questionUsage.storedQuestionId],
    references: [storedQuestions.id],
  }),
}));

// Insert schemas
export const insertSourceDocumentSchema = createInsertSchema(sourceDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
});

export const insertStoredQuestionSchema = createInsertSchema(storedQuestions).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
  useCount: true,
});

export const insertQuizSessionSchema = createInsertSchema(quizSessions).pick({
  summaryText: true,
  questions: true,
});

export const insertQuestionUsageSchema = createInsertSchema(questionUsage).omit({
  id: true,
  usedAt: true,
});

// Types
export type SourceDocument = typeof sourceDocuments.$inferSelect;
export type InsertSourceDocument = z.infer<typeof insertSourceDocumentSchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type StoredQuestion = typeof storedQuestions.$inferSelect;
export type InsertStoredQuestion = z.infer<typeof insertStoredQuestionSchema>;

export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;

export type QuestionUsage = typeof questionUsage.$inferSelect;
export type InsertQuestionUsage = z.infer<typeof insertQuestionUsageSchema>;

// Question types
export const questionTypeSchema = z.enum(["definition", "case", "assignment", "open"]);

// Difficulty levels
export const difficultyLevelSchema = z.enum(["basic", "profi", "random"]);

// Schema for upload with question type selection
export const uploadRequestSchema = z.object({
  questionTypes: z.array(questionTypeSchema).min(1, "Mindestens ein Fragentyp muss ausgewählt werden"),
  filesCount: z.number().min(1).max(5),
  totalNewQuestions: z.number().min(1).max(50).default(10),
  difficulty: difficultyLevelSchema.default("basic"),
});

export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  correct: z.boolean(),
});

export const questionSchema = z.object({
  id: z.string(),
  type: questionTypeSchema,
  text: z.string(),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string(),
});

export const quizStatsSchema = z.object({
  asked: z.number(),
  correctFirstTry: z.number(),
  retries: z.number(),
});

// Legacy interfaces for backward compatibility
export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: Array<{ id: string; text: string; correct: boolean }>;
  correctAnswer?: string;
  explanation: string;
  difficulty?: 'basic' | 'profi' | 'random';

  sourceFile?: string;
  storedQuestionId?: number;
  isReviewQuestion?: boolean;
}

export interface QuizStats {
  asked: number;
  correctFirstTry: number;
  retries: number;
  questionAttempts?: Record<string, boolean>;
}

export type QuestionType = z.infer<typeof questionTypeSchema>;
export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type DifficultyLevel = z.infer<typeof difficultyLevelSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
