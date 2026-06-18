import Anthropic from "@anthropic-ai/sdk";
import { fs } from "../cep/node";
import type {
  ChatMessage,
  ProviderDefinition,
  ProviderResult,
  ProviderStatusUpdate,
  SendMessageOptions,
} from "./provider";

export function resolveApiKey(): string | null {
  try {
    if (typeof process !== "undefined" && process.env?.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  } catch {}

  try {
    const stored = localStorage.getItem("ANTHROPIC_API_KEY");
    if (stored) return stored;
  } catch {}

  return null;
}

function buildImageBlock(
  imagePath: string
): Anthropic.ImageBlockParam | null {
  if (!fs) return null;
  try {
    const data = fs.readFileSync(imagePath);
    const base64 = Buffer.from(data).toString("base64");
    const ext = imagePath.split(".").pop()?.toLowerCase();
    const mediaType: Anthropic.Base64ImageSource["media_type"] =
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    return {
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64 },
    };
  } catch {
    return null;
  }
}

async function sendClaudeMessage(
  prompt: string,
  options: SendMessageOptions,
  history: ChatMessage[]
): Promise<ProviderResult> {
  const emitStatus = (status: ProviderStatusUpdate) => {
    options.onStatus?.(status);
  };

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return {
      result: "No API key configured. Enter your Anthropic API key in settings.",
      duration_ms: 0,
      is_error: true,
    };
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const startTime = Date.now();
  let hasReceivedChunk = false;

  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  if (options.imagePath) {
    const imageBlock = buildImageBlock(options.imagePath);
    if (imageBlock) {
      messages.push({
        role: "user",
        content: [imageBlock, { type: "text", text: prompt }],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }
  } else {
    messages.push({ role: "user", content: prompt });
  }

  // Static knowledge goes first with a cache breakpoint so repeat turns read
  // it from the prompt cache; the per-turn AE state follows the breakpoint.
  const systemBlocks: Anthropic.TextBlockParam[] = [];
  if (options.staticContext) {
    systemBlocks.push({
      type: "text",
      text: options.staticContext,
      cache_control: { type: "ephemeral" },
    });
  }
  if (options.systemContext) {
    systemBlocks.push({ type: "text", text: options.systemContext });
  }

  try {
    emitStatus({
      phase: "connecting",
      text: "Starting Claude API request...",
    });
    const stream = client.messages.stream({
      model: options.model,
      max_tokens: 16000,
      system: systemBlocks.length > 0 ? systemBlocks : undefined,
      messages,
    });

    emitStatus({
      phase: "thinking",
      text: "Thinking...",
    });

    if (options.signal) {
      options.signal.addEventListener(
        "abort",
        () => {
          stream.abort();
        },
        { once: true }
      );
    }

    stream.on("text", (text) => {
      if (!hasReceivedChunk) {
        hasReceivedChunk = true;
        emitStatus({
          phase: "responding",
          text: "Generating response...",
        });
      }
      options.onChunk?.(text);
    });

    const final = await stream.finalMessage();
    const fullText = final.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    emitStatus({
      phase: "completed",
      text: "Response complete.",
      terminal: true,
    });
    return {
      result: fullText.trim() || "(empty response)",
      duration_ms: Date.now() - startTime,
      is_error: false,
    };
  } catch (err: any) {
    if (options.signal?.aborted) {
      emitStatus({
        phase: "cancelled",
        text: "Request cancelled.",
        terminal: true,
      });
      return {
        result: "Request cancelled.",
        duration_ms: Date.now() - startTime,
        is_error: true,
        cancelled: true,
      };
    }

    const message =
      err instanceof Anthropic.APIError
        ? `API error ${err.status}: ${err.message}`
        : err?.message || String(err);

    emitStatus({
      phase: "error",
      text: "Claude API returned an error.",
      raw: message,
      terminal: true,
    });
    return {
      result: "Error: " + message,
      duration_ms: Date.now() - startTime,
      is_error: true,
    };
  }
}

export const claudeApiProvider: ProviderDefinition = {
  id: "claude-api",
  displayName: "Claude API",
  models: [
    { value: "claude-haiku-4-5", label: "Haiku" },
    { value: "claude-sonnet-4-6", label: "Sonnet" },
    { value: "claude-opus-4-8", label: "Opus" },
  ],
  supportsImages: true,
  async isAvailable() {
    return resolveApiKey()
      ? { available: true }
      : { available: false, reason: "API key required" };
  },
  sendMessage: sendClaudeMessage,
};
