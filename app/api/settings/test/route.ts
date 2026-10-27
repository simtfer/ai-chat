import { fail, jsonBody, ok } from "@/lib/api/http";
import { completeOnce } from "@/lib/llm/openai";
import { friendlyError, type LlmConfig } from "@/lib/llm/types";
import { getSettingsRaw } from "@/lib/queries/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await jsonBody<{
    provider?: "demo" | "openai";
    baseUrl?: string;
    apiKey?: string;
    model?: string;
  }>(request);
  const stored = getSettingsRaw();
  const provider = body.provider ?? stored.provider;
  const baseUrl = (body.baseUrl ?? stored.baseUrl).trim().replace(/\/+$/, "");
  const apiKey =
    body.apiKey && body.apiKey !== "__unchanged__" ? body.apiKey.trim() : stored.apiKey;
  const model = (body.model ?? stored.model).trim();

  if (provider === "demo") {
    return ok({ ok: true, message: "演示模式可以使用，不需要 API Key", models: [] });
  }
  if (!baseUrl) return fail("请先填写 Base URL");

  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers,
      signal: AbortSignal.timeout(12_000),
    });
    if (response.ok) {
      const data = (await response.json()) as { data?: Array<{ id?: string }> };
      const models = (data.data ?? [])
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string")
        .slice(0, 50);
      return ok({
        ok: true,
        message: models.length ? `连接成功，发现 ${models.length} 个模型` : "连接成功",
        models,
      });
    }
  } catch {
    // Fall through to a minimal completion test.
  }

  const config: LlmConfig = {
    provider: "openai",
    baseUrl,
    apiKey,
    model,
    temperature: 0,
    maxTokens: 8,
  };

  try {
    const reply = await completeOnce(
      config,
      [
        { role: "system", content: "只回复 ok" },
        { role: "user", content: "ping" },
      ],
      AbortSignal.timeout(20_000),
    );
    return ok({ ok: true, message: reply ? `连接成功，模型回复：${reply.slice(0, 40)}` : "连接成功", models: [] });
  } catch (error) {
    return ok({ ok: false, message: friendlyError(error), models: [] });
  }
}
