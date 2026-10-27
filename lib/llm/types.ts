export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type LlmConfig = {
  provider: "demo" | "openai";
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type Usage = {
  promptTokens?: number;
  completionTokens?: number;
};

export type StreamChunk = {
  text?: string;
  usage?: Usage;
};

export class LlmError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

export function friendlyError(error: unknown): string {
  if (error instanceof LlmError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") {
    return "请求已中断";
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|getaddrinfo/i.test(message)) {
    return "连不上模型服务，请检查 Base URL 和网络";
  }
  if (/aborted|AbortError/i.test(message)) return "请求已中断";
  return message.slice(0, 240) || "未知错误";
}
