import { iterateOpenAIStream } from "./stream-parse";
import { LlmError, type ChatMessage, type LlmConfig, type StreamChunk } from "./types";

function endpoint(baseUrl: string, suffix: string) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!base) throw new LlmError("还没有配置 Base URL，请到设置页填写");
  if (base.endsWith(suffix)) return base;
  return `${base}${suffix}`;
}

function statusMessage(status: number): string {
  if (status === 401 || status === 403) return "鉴权失败，请检查 API Key";
  if (status === 404) return "接口不存在，请检查 Base URL（通常需要以 /v1 结尾）";
  if (status === 429) return "请求太频繁或额度不足，稍后再试";
  if (status >= 500) return "模型服务出错了，稍后再试";
  return `模型服务返回 ${status}`;
}

function errorDetail(raw: string): string {
  const text = raw.trim();
  if (!text || /^<!doctype|^<html/i.test(text)) return "";
  try {
    const data = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const message =
      typeof data.error === "string" ? data.error : data.error?.message ?? data.message ?? "";
    if (message) return message.slice(0, 200);
  } catch {
    // not JSON, fall through to plain text
  }
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 200);
}

export async function* streamOpenAI(
  config: LlmConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const url = endpoint(config.baseUrl, "/chat/completions");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = errorDetail(await response.text());
    } catch {
      // ignore
    }
    throw new LlmError(
      detail ? `${statusMessage(response.status)}：${detail}` : statusMessage(response.status),
      response.status,
    );
  }
  if (!response.body) {
    throw new LlmError("模型服务没有返回流式内容");
  }

  yield* iterateOpenAIStream(response.body);
}

export async function completeOnce(
  config: LlmConfig,
  messages: ChatMessage[],
  signal: AbortSignal,
): Promise<string> {
  const url = endpoint(config.baseUrl, "/chat/completions");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    }),
  });
  if (!response.ok) {
    let detail = "";
    try {
      detail = errorDetail(await response.text());
    } catch {
      // ignore
    }
    throw new LlmError(
      detail ? `${statusMessage(response.status)}：${detail}` : statusMessage(response.status),
      response.status,
    );
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
