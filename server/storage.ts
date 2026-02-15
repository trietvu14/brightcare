import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  users, documents, prompts, conversations, messages, traceLogs,
  type User, type InsertUser,
  type Document, type InsertDocument,
  type Prompt, type InsertPrompt,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type TraceLog, type InsertTraceLog,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getActiveDocuments(): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: number, doc: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<void>;

  getPrompts(): Promise<Prompt[]>;
  getPrompt(id: number): Promise<Prompt | undefined>;
  getActivePrompts(): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: number): Promise<void>;

  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;

  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;

  getTraceLogs(limit?: number | undefined): Promise<TraceLog[]>;
  getTraceLogsByConversation(conversationId: number): Promise<TraceLog[]>;
  createTraceLog(log: InsertTraceLog): Promise<TraceLog>;
  getTraceStats(): Promise<{
    totalQueries: number;
    blockedQueries: number;
    avgResponseTime: number;
    totalTokens: number;
    avgEvaluatorScore: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getDocuments(): Promise<Document[]> {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getActiveDocuments(): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.isActive, true)).orderBy(desc(documents.createdAt));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async updateDocument(id: number, doc: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updated] = await db.update(documents)
      .set({ ...doc, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getPrompts(): Promise<Prompt[]> {
    return db.select().from(prompts).orderBy(desc(prompts.createdAt));
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt;
  }

  async getActivePrompts(): Promise<Prompt[]> {
    return db.select().from(prompts).where(eq(prompts.isActive, true)).orderBy(desc(prompts.createdAt));
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const [created] = await db.insert(prompts).values(prompt).returning();
    return created;
  }

  async updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const [updated] = await db.update(prompts)
      .set({ ...prompt, updatedAt: new Date() })
      .where(eq(prompts.id, id))
      .returning();
    return updated;
  }

  async deletePrompt(id: number): Promise<void> {
    await db.delete(prompts).where(eq(prompts.id, id));
  }

  async getConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(conv: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conv).returning();
    return created;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(traceLogs).where(eq(traceLogs.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(msg).returning();
    return created;
  }

  async getTraceLogs(limit?: number): Promise<TraceLog[]> {
    const query = db.select().from(traceLogs).orderBy(desc(traceLogs.createdAt));
    return limit ? query.limit(limit) : query;
  }

  async getTraceLogsByConversation(conversationId: number): Promise<TraceLog[]> {
    return db.select().from(traceLogs).where(eq(traceLogs.conversationId, conversationId)).orderBy(desc(traceLogs.createdAt));
  }

  async createTraceLog(log: InsertTraceLog): Promise<TraceLog> {
    const [created] = await db.insert(traceLogs).values(log).returning();
    return created;
  }

  async getTraceStats(): Promise<{
    totalQueries: number;
    blockedQueries: number;
    avgResponseTime: number;
    totalTokens: number;
    avgEvaluatorScore: number;
  }> {
    const result = await db.select({
      totalQueries: sql<number>`count(*)::int`,
      blockedQueries: sql<number>`count(*) filter (where ${traceLogs.blocked} = true)::int`,
      avgResponseTime: sql<number>`coalesce(avg(${traceLogs.responseTimeMs})::int, 0)`,
      totalTokens: sql<number>`coalesce(sum(${traceLogs.totalTokens})::int, 0)`,
      avgEvaluatorScore: sql<number>`coalesce(avg(${traceLogs.evaluatorScore})::int, 0)`,
    }).from(traceLogs);
    return result[0] || { totalQueries: 0, blockedQueries: 0, avgResponseTime: 0, totalTokens: 0, avgEvaluatorScore: 0 };
  }
}

export const storage = new DatabaseStorage();
