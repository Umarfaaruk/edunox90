/**
 * EDUNOX AI SERVICE — OpenRouter Integration
 * ============================================
 * 
 * Centralized AI service using OpenRouter API with google/gemma-4-31b-it:free model.
 * Replaces all previous direct Gemini API calls with a unified interface.
 * 
 * OpenRouter provides an OpenAI-compatible API at:
 *   https://openrouter.ai/api/v1/chat/completions
 * 
 * Auth: Bearer token via VITE_OPENROUTER_API_KEY
 * Model: google/gemma-4-31b-it:free (free tier, no cost)
 * 
 * RATE LIMIT HANDLING:
 *   Free-tier models have aggressive rate limits (~10 req/min).
 *   Both aiComplete() and aiStream() automatically retry on 429 errors
 *   with exponential backoff (2s → 4s → 8s), up to 3 retries.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2 seconds initial backoff

function getApiKey(): string {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "Groq API Key not configured. Add VITE_GROQ_API_KEY to .env.local\n\n" +
      "Get a free key at: https://console.groq.com/keys"
    );
  }
  return key;
}

/**
 * Sleep helper that respects AbortSignal.
 * Rejects immediately if the signal is already aborted or gets aborted during sleep.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

/**
 * Extract the Retry-After header value in milliseconds.
 * Falls back to exponential backoff if header is missing.
 */
function getRetryDelay(resp: Response, attempt: number): number {
  const retryAfter = resp.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 30_000); // Cap at 30s
    }
  }
  // Exponential backoff: 2s, 4s, 8s
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

export interface ChatMessageContentItem {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatMessageContentItem[];
}

interface AIRequestOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Build the common request headers.
 */
function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
}

/**
 * Handle non-429 errors. Throws with a descriptive message.
 */
async function handleErrorResponse(resp: Response): Promise<never> {
  const errData = await resp.json().catch(() => ({}));
  const errMsg = errData?.error?.message || `AI Service Error (${resp.status})`;
  if (resp.status === 401 || resp.status === 403) {
    throw new Error("API key invalid or expired. Please check your VITE_GROQ_API_KEY in .env.local");
  }
  throw new Error(errMsg);
}

/**
 * Non-streaming AI completion with automatic retry on rate limits.
 * Returns the full response text.
 */
export async function aiComplete(options: AIRequestOptions): Promise<string> {
  const apiKey = getApiKey();
  const { messages, temperature = 0.7, maxTokens = 4096, signal } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: buildHeaders(apiKey),
      signal,
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content || "";
    }

    // Rate limited — retry with backoff
    if (resp.status === 429) {
      if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(resp, attempt);
        console.log(`[AI] ⏳ Rate limited. Retrying in ${(delay / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await sleep(delay, signal);
        continue;
      }
      // All retries exhausted
      throw new Error(
        "Rate limit exceeded after multiple retries. The free model has limited capacity — please wait 30-60 seconds and try again."
      );
    }

    // Non-retryable error
    await handleErrorResponse(resp);
  }

  throw new Error("Unexpected error in AI completion");
}

/**
 * Streaming AI completion with automatic retry on rate limits.
 * Calls onToken for each chunk of text received.
 * Returns the full accumulated response.
 */
export async function aiStream(
  options: AIRequestOptions,
  onToken: (token: string) => void
): Promise<string> {
  const apiKey = getApiKey();
  const { messages, temperature = 0.7, maxTokens = 4096, signal } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: buildHeaders(apiKey),
      signal,
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (resp.ok) {
      // Successful response — process the stream
      if (!resp.body) {
        throw new Error("No response stream from API");
      }
      return await processStream(resp.body, onToken);
    }

    // Rate limited — retry with backoff
    if (resp.status === 429) {
      if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(resp, attempt);
        console.log(`[AI] ⏳ Rate limited. Retrying in ${(delay / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        // Notify the UI that we're waiting
        onToken(`\n\n⏳ *Rate limited — retrying in ${Math.ceil(delay / 1000)}s...*\n\n`);
        await sleep(delay, signal);
        // Clear the retry message by sending empty — the caller will handle deduplication
        continue;
      }
      throw new Error(
        "Rate limit exceeded after multiple retries. The free model has limited capacity — please wait 30-60 seconds and try again."
      );
    }

    // Non-retryable error
    await handleErrorResponse(resp);
  }

  throw new Error("Unexpected error in AI stream");
}

/**
 * Process an SSE stream body and extract text tokens.
 */
async function processStream(
  body: ReadableStream<Uint8Array>,
  onToken: (token: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullResponse = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Process complete lines, keep last incomplete line in buffer
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line.startsWith("data: ")) {
          const jsonStr = line.substring(6);
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed?.choices?.[0]?.delta?.content || "";
            if (text) {
              onToken(text);
              fullResponse += text;
            }
          } catch {
            // Incomplete JSON chunk, skip
          }
        }
      }
      buffer = lines[lines.length - 1];
    }

    // Process remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      try {
        const jsonStr = buffer.trim().substring(6);
        if (jsonStr !== "[DONE]") {
          const parsed = JSON.parse(jsonStr);
          const text = parsed?.choices?.[0]?.delta?.content || "";
          if (text) {
            onToken(text);
            fullResponse += text;
          }
        }
      } catch { }
    }
  } finally {
    reader.releaseLock();
  }

  return fullResponse.trim() || "I couldn't generate a response. Please try rephrasing your question.";
}

/**
 * Helper to build a system+user message pair (most common pattern).
 */
export function buildMessages(
  systemPrompt: string,
  userMessage: string,
  conversationHistory?: ChatMessage[]
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];
  if (conversationHistory) {
    messages.push(...conversationHistory);
  }
  messages.push({ role: "user", content: userMessage });
  return messages;
}

export async function aiVisionComplete(
  options: AIRequestOptions
): Promise<string> {
  const apiKey = getApiKey();
  const { messages, temperature = 0.5, maxTokens = 2048, signal } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: buildHeaders(apiKey),
      signal,
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview", // Vision model
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return data?.choices?.[0]?.message?.content || "";
    }

    if (resp.status === 429) {
      if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(resp, attempt);
        console.log(`[AI Vision] ⏳ Rate limited. Retrying in ${(delay / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await sleep(delay, signal);
        continue;
      }
      throw new Error("Rate limit exceeded after multiple retries. Please wait and try again.");
    }

    await handleErrorResponse(resp);
  }

  throw new Error("Unexpected error in AI vision completion");
}
