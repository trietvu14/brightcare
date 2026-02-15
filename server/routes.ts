import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { storage } from "./storage";
import { processMessage, processEphemeralMessage } from "./openai-agent";
import { seedDatabase } from "./seed";
import { insertDocumentSchema, insertPromptSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});

const ADMIN_USERNAME = "tech_admin";
const ADMIN_PASSWORD = "P@ssword01";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized. Admin login required." });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "Invalid username or password." });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/admin/session", (req, res) => {
    res.json({ isAdmin: !!req.session?.isAdmin });
  });

  // --- Document Routes (Admin Only) ---
  app.get("/api/documents", requireAdmin, async (_req, res) => {
    try {
      const docs = await storage.getDocuments();
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/:id", requireAdmin, async (req, res) => {
    try {
      const doc = await storage.getDocument(parseInt(req.params.id));
      if (!doc) return res.status(404).json({ message: "Document not found" });
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/documents", requireAdmin, async (req, res) => {
    try {
      const parsed = insertDocumentSchema.parse(req.body);
      const doc = await storage.createDocument(parsed);
      res.status(201).json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/documents/upload", requireAdmin, (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        const message = err instanceof multer.MulterError
          ? (err.code === "LIMIT_FILE_SIZE" ? "File is too large. Maximum size is 10MB." : err.message)
          : err.message || "File upload failed";
        return res.status(400).json({ message });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let extractedText = "";
      const mime = req.file.mimetype;

      if (mime === "application/pdf") {
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text;
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime === "application/msword"
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      }

      extractedText = extractedText.trim();
      if (!extractedText) {
        return res.status(400).json({ message: "Could not extract any text from the file" });
      }

      const originalName = req.file.originalname.replace(/\.[^/.]+$/, "");

      res.json({
        title: originalName,
        content: extractedText,
        filename: req.file.originalname,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process file" });
    }
  });

  app.patch("/api/documents/:id", requireAdmin, async (req, res) => {
    try {
      const partial = insertDocumentSchema.partial().parse(req.body);
      const doc = await storage.updateDocument(parseInt(req.params.id), partial);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      res.json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/documents/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteDocument(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- Prompt Routes (Admin Only) ---
  app.get("/api/prompts", requireAdmin, async (_req, res) => {
    try {
      const promptsList = await storage.getPrompts();
      res.json(promptsList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/prompts/:id", requireAdmin, async (req, res) => {
    try {
      const prompt = await storage.getPrompt(parseInt(req.params.id));
      if (!prompt) return res.status(404).json({ message: "Prompt not found" });
      res.json(prompt);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/prompts", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPromptSchema.parse(req.body);
      const prompt = await storage.createPrompt(parsed);
      res.status(201).json(prompt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/prompts/:id", requireAdmin, async (req, res) => {
    try {
      const partial = insertPromptSchema.partial().parse(req.body);
      const prompt = await storage.updatePrompt(parseInt(req.params.id), partial);
      if (!prompt) return res.status(404).json({ message: "Prompt not found" });
      res.json(prompt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/prompts/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deletePrompt(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- Conversation Routes ---
  app.get("/api/conversations", async (_req, res) => {
    try {
      const convs = await storage.getConversations();
      res.json(convs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const conv = await storage.createConversation({ title: req.body.title || "New Conversation" });
      res.status(201).json(conv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conv = await storage.getConversation(parseInt(req.params.id));
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      const msgs = await storage.getMessages(conv.id);
      res.json({ ...conv, messages: msgs });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      await storage.deleteConversation(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- Ephemeral Chat Route (no persistence) ---
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      const result = await processEphemeralMessage(message, history || []);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process message" });
    }
  });

  // --- Chat Message Route ---
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }

      await storage.createMessage({ conversationId, role: "user", content });

      const result = await processMessage(conversationId, content);

      await storage.createMessage({ conversationId, role: "assistant", content: result.content });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process message" });
    }
  });

  // --- Trace Log Routes (Admin Only) ---
  app.get("/api/trace-logs", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getTraceLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trace-logs/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getTraceStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trace-logs/conversation/:id", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getTraceLogsByConversation(parseInt(req.params.id));
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
