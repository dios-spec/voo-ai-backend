const Groq = require("groq-sdk");

/**
 * Shared AI provider layer for the backend (Live Mode over Socket.io, and
 * server-side image analysis). Mirrors the frontend's lib/ai.ts pattern:
 * swap AI_PROVIDER env var to change providers without touching call sites.
 */
const PROVIDER = process.env.AI_PROVIDER || "groq";

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPTS = {
  general:
    "You are Voo, a fast, sharp, friendly AI brain. Give clear, direct answers. Use short paragraphs and lists when helpful.",
  study:
    "You are Voo in Study mode: a patient tutor. Break concepts into steps, check understanding, and use simple examples before technical detail.",
  coding:
    "You are Voo in Coding mode: a senior engineer. Give correct, runnable code with brief explanations. Point out bugs and edge cases directly.",
  math:
    "You are Voo in Math mode: show step-by-step working, name the method used, and box the final answer.",
  science:
    "You are Voo in Science mode: explain mechanisms and causes clearly, using real-world analogies where they aid understanding.",
};

/**
 * Stream a chat completion. Calls onToken(text) per chunk and resolves when done.
 * mode: one of SYSTEM_PROMPTS keys. history: [{role, content}]
 */
async function streamChatCompletion({ history, mode = "general", onToken }) {
  const systemMessage = { role: "system", content: SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general };
  const fullMessages = [systemMessage, ...history];

  if (PROVIDER === "groq") {
    const stream = await groqClient.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: fullMessages,
      stream: true,
      temperature: 0.6,
      max_tokens: 2048,
    });

    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content || "";
      if (token) onToken(token);
    }
    return;
  }

  if (PROVIDER === "claude") {
    throw new Error("Claude provider not yet wired — set AI_PROVIDER=groq for now.");
  }

  if (PROVIDER === "gemini") {
    throw new Error("Gemini provider not yet wired — set AI_PROVIDER=groq for now.");
  }

  throw new Error(`Unknown AI_PROVIDER: ${PROVIDER}`);
}

/**
 * Analyze an image (vision-capable Groq model) given a public URL and optional
 * OCR-extracted text to ground the answer.
 */
async function analyzeImage({ imageUrl, ocrText, question }) {
  if (PROVIDER === "groq") {
    const prompt = [
      question || "Describe this image and extract any important information from it.",
      ocrText ? `\n\nText detected in the image (OCR):\n${ocrText}` : "",
    ].join("");

    const completion = await groqClient.chat.completions.create({
      model: process.env.GROQ_VISION_MODEL || "llama-3.2-90b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    });

    return completion.choices?.[0]?.message?.content || "";
  }

  throw new Error(`Image analysis not implemented for provider: ${PROVIDER}`);
}

module.exports = { streamChatCompletion, analyzeImage, SYSTEM_PROMPTS };
