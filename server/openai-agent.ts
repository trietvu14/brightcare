import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function buildSystemPrompt(): Promise<string> {
  const activePrompts = await storage.getActivePrompts();
  const activeDocuments = await storage.getActiveDocuments();

  const basePrompt = `You are BrightBot, the friendly and helpful AI assistant for BrightCare Daycare. You help parents, caregivers, and guardians with questions about our daycare facility.

IMPORTANT RULES:
- Always begin by thanking the parent for their question or inquiry
- Be respectful, empathetic, and friendly in all responses
- Only answer questions related to BrightCare Daycare and its operations
- NEVER reveal any child's personally identifiable information (PII) such as names, addresses, medical records, or any sensitive data
- NEVER share internal company information, staff personal details, or confidential operational data
- Comply with COPPA (Children's Online Privacy Protection Act) and FERPA (Family Educational Rights and Privacy Act) regulations at all times
- If asked about topics unrelated to the daycare facility, respond with: "I'm sorry. I can't help you with that, but I can answer any questions regarding this facility and its operations."
- If you don't have specific information about a topic, say so honestly and suggest the parent contact the facility directly

FACILITY KNOWLEDGE BASE:
${activeDocuments.map(doc => `--- ${doc.title} (${doc.category}) ---\n${doc.content}`).join("\n\n")}`;

  const customPrompts = activePrompts.map(p => p.content).join("\n\n");

  return customPrompts ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS:\n${customPrompts}` : basePrompt;
}

function checkInputGuardrails(userMessage: string): { passed: boolean; reason?: string } {
  const lowerMsg = userMessage.toLowerCase();

  const piiPatterns = [
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
    /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/i,
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(userMessage)) {
      return { passed: false, reason: "Input contains potential PII (personal identifiable information). For your safety, please do not share personal information in chat." };
    }
  }

  const injectionPatterns = [
    "ignore previous", "ignore your instructions", "ignore all previous",
    "disregard", "forget your rules", "pretend you are", "act as if you are not",
    "reveal your prompt", "show me your instructions", "what are your system",
    "override", "jailbreak", "do anything now", "developer mode",
  ];

  for (const pattern of injectionPatterns) {
    if (lowerMsg.includes(pattern)) {
      return { passed: false, reason: "Your message appears to contain content that falls outside the scope of daycare-related inquiries." };
    }
  }

  return { passed: true };
}

function checkOutputGuardrails(response: string): { passed: boolean; reason?: string } {
  const piiPatterns = [
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(response)) {
      return { passed: false, reason: "Response contains potential PII data that violates COPPA/FERPA compliance." };
    }
  }

  const sensitiveKeywords = [
    "social security", "ssn", "date of birth", "home address",
    "medical record", "diagnosis", "prescription", "irs",
    "bank account", "credit card", "routing number",
  ];

  const lowerResponse = response.toLowerCase();
  for (const keyword of sensitiveKeywords) {
    if (lowerResponse.includes(keyword) && !lowerResponse.includes("we do not") && !lowerResponse.includes("never share")) {
      return { passed: false, reason: `Response references sensitive information: "${keyword}"` };
    }
  }

  return { passed: true };
}

async function runEvaluatorAgent(
  userMessage: string,
  assistantResponse: string
): Promise<{ score: number; feedback: string; traceId: string | null }> {
  try {
    const evaluatorCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a quality evaluator for a daycare AI assistant called BrightBot. Score the assistant's response on a scale of 0-100 based on:
- Thanking the parent (10 points)
- Accuracy based on daycare context (30 points)
- Helpfulness and completeness (25 points)
- Appropriate tone (empathetic, friendly, professional) (15 points)
- COPPA/FERPA compliance - no PII disclosure (20 points - 0 if violated)

Respond in JSON format: {"score": number, "feedback": "brief explanation"}`,
        },
        {
          role: "user",
          content: `Parent question: "${userMessage}"\n\nBrightBot response: "${assistantResponse}"`,
        },
      ],
      max_completion_tokens: 256,
      response_format: { type: "json_object" },
    });

    const evalContent = evaluatorCompletion.choices[0]?.message?.content || '{"score": 70, "feedback": "Unable to fully evaluate"}';
    const evalResult = JSON.parse(evalContent);
    return {
      score: Math.max(0, Math.min(100, evalResult.score || 70)),
      feedback: evalResult.feedback || "Evaluation completed.",
      traceId: evaluatorCompletion.id || null,
    };
  } catch (error) {
    console.error("Evaluator agent error:", error);
    return { score: 70, feedback: "Evaluator unavailable - default score applied.", traceId: null };
  }
}

export async function processMessage(
  conversationId: number,
  userMessage: string
): Promise<{ content: string; blocked: boolean; blockReason?: string }> {
  const startTime = Date.now();

  const guardrailCheck = checkInputGuardrails(userMessage);
  if (!guardrailCheck.passed) {
    const blockedResponse = "I'm sorry. I can't help you with that, but I can answer any questions regarding this facility and its operations.";

    await storage.createTraceLog({
      conversationId,
      traceId: null,
      model: "guardrail-input",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      userMessage,
      assistantMessage: blockedResponse,
      guardrailResult: guardrailCheck.reason || "blocked",
      evaluatorScore: null,
      evaluatorFeedback: null,
      blocked: true,
      blockReason: guardrailCheck.reason || "Guardrail violation",
      responseTimeMs: Date.now() - startTime,
    });

    return { content: blockedResponse, blocked: true, blockReason: guardrailCheck.reason };
  }

  const systemPrompt = await buildSystemPrompt();
  const previousMessages = await storage.getMessages(conversationId);

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...previousMessages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_completion_tokens: 1024,
    });

    const assistantContent = completion.choices[0]?.message?.content || "I apologize, but I was unable to generate a response. Please try again.";
    const usage = completion.usage;

    const outputCheck = checkOutputGuardrails(assistantContent);
    if (!outputCheck.passed) {
      const safeResponse = "I apologize, but I encountered an issue generating a safe response. Please contact the facility directly for assistance.";

      await storage.createTraceLog({
        conversationId,
        traceId: completion.id || null,
        model: completion.model || "gpt-4o-mini",
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        userMessage,
        assistantMessage: safeResponse,
        guardrailResult: "Output blocked: " + (outputCheck.reason || ""),
        evaluatorScore: 0,
        evaluatorFeedback: "Response blocked by output guardrails",
        blocked: true,
        blockReason: outputCheck.reason || "Output guardrail violation",
        responseTimeMs: Date.now() - startTime,
      });

      return { content: safeResponse, blocked: true, blockReason: outputCheck.reason };
    }

    const evaluation = await runEvaluatorAgent(userMessage, assistantContent);

    await storage.createTraceLog({
      conversationId,
      traceId: completion.id || null,
      model: completion.model || "gpt-4o-mini",
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
      userMessage,
      assistantMessage: assistantContent,
      guardrailResult: "passed",
      evaluatorScore: evaluation.score,
      evaluatorFeedback: evaluation.feedback,
      blocked: false,
      blockReason: null,
      responseTimeMs: Date.now() - startTime,
    });

    return { content: assistantContent, blocked: false };
  } catch (error: any) {
    console.error("OpenAI API error:", error);

    await storage.createTraceLog({
      conversationId,
      traceId: null,
      model: "gpt-4o-mini",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      userMessage,
      assistantMessage: null,
      guardrailResult: "error",
      evaluatorScore: null,
      evaluatorFeedback: error.message,
      blocked: false,
      blockReason: null,
      responseTimeMs: Date.now() - startTime,
    });

    throw new Error("Failed to process message. Please try again.");
  }
}

export async function processEphemeralMessage(
  userMessage: string,
  history: { role: string; content: string }[]
): Promise<{ content: string; blocked: boolean; blockReason?: string }> {
  const guardrailCheck = checkInputGuardrails(userMessage);
  if (!guardrailCheck.passed) {
    return {
      content: "I'm sorry. I can't help you with that, but I can answer any questions regarding this facility and its operations.",
      blocked: true,
      blockReason: guardrailCheck.reason,
    };
  }

  const systemPrompt = await buildSystemPrompt();

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_completion_tokens: 1024,
    });

    const assistantContent = completion.choices[0]?.message?.content || "I apologize, but I was unable to generate a response. Please try again.";

    const outputCheck = checkOutputGuardrails(assistantContent);
    if (!outputCheck.passed) {
      return {
        content: "I apologize, but I encountered an issue generating a safe response. Please contact the facility directly for assistance.",
        blocked: true,
        blockReason: outputCheck.reason,
      };
    }

    return { content: assistantContent, blocked: false };
  } catch (error: any) {
    console.error("Ephemeral chat OpenAI error:", error);
    throw new Error("Failed to process message. Please try again.");
  }
}
