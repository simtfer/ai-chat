import { fail, jsonBody, ok } from "@/lib/api/http";
import { getSettingsPublic, updateSettings, type SettingsPatch } from "@/lib/queries/settings";
import type { Provider } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ settings: getSettingsPublic() });
}

export async function PUT(request: Request) {
  const body = await jsonBody<Record<string, unknown>>(request);
  const patch: SettingsPatch = {};

  if (body.provider === "demo" || body.provider === "openai") {
    patch.provider = body.provider as Provider;
  }
  if (typeof body.baseUrl === "string") patch.baseUrl = body.baseUrl.trim().replace(/\/+$/, "");
  if (typeof body.apiKey === "string" && body.apiKey !== "__unchanged__") {
    patch.apiKey = body.apiKey.trim();
  }
  if (typeof body.model === "string") {
    const model = body.model.trim();
    if (!model) return fail("模型名不能为空");
    patch.model = model.slice(0, 120);
  }
  if (typeof body.temperature === "number") {
    patch.temperature = Math.min(2, Math.max(0, body.temperature));
  }
  if (typeof body.maxTokens === "number") {
    patch.maxTokens = Math.min(2000, Math.max(32, Math.round(body.maxTokens)));
  }
  if (typeof body.contextCharBudget === "number") {
    patch.contextCharBudget = Math.min(20000, Math.max(1000, Math.round(body.contextCharBudget)));
  }

  return ok({ settings: updateSettings(patch) });
}
