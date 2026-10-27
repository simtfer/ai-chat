import { fail, isAbortError, jsonBody, ok } from "@/lib/api/http";
import { completeOnce } from "@/lib/llm/openai";
import { friendlyError, type LlmConfig } from "@/lib/llm/types";
import { generatePersona, type CharacterDraft } from "@/lib/persona/generator";
import { buildPersonaGenerationMessages } from "@/lib/prompts/chat";
import { listCharacters } from "@/lib/queries/characters";
import { getSettingsRaw } from "@/lib/queries/settings";
import { COLOR_PALETTE, type Persona } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("模型没有返回 JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function asStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, limit);
}

export async function POST(request: Request) {
  const body = await jsonBody<{ hint?: string; existingNames?: string[] }>(request);
  const existingNames = (body.existingNames ?? []).filter((n): n is string => typeof n === "string");
  const settings = getSettingsRaw();

  if (settings.provider === "demo") {
    const draft = generatePersona({ existingNames });
    return ok({ draft, source: "local" });
  }
  if (!settings.baseUrl.trim()) {
    return fail("请先在设置里填写模型 Base URL", 400);
  }

  const config: LlmConfig = {
    provider: "openai",
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: 0.95,
    maxTokens: 700,
  };

  try {
    const raw = await completeOnce(
      config,
      buildPersonaGenerationMessages(body.hint ?? "", existingNames),
      AbortSignal.timeout(30_000),
    );
    const parsed = extractJson(raw) as Record<string, unknown>;
    const name = typeof parsed.name === "string" ? parsed.name.trim().slice(0, 24) : "";
    if (!name) throw new Error("模型没有给出角色名");

    const persona: Persona = {
      archetype: typeof parsed.archetype === "string" ? parsed.archetype.slice(0, 40) : "自定义角色",
      mbti: typeof parsed.mbti === "string" ? parsed.mbti.slice(0, 20) : undefined,
      age: typeof parsed.age === "string" ? parsed.age.slice(0, 20) : undefined,
      occupation: typeof parsed.occupation === "string" ? parsed.occupation.slice(0, 40) : undefined,
      traits: asStringArray(parsed.traits, 6),
      tone: typeof parsed.tone === "string" ? parsed.tone.slice(0, 200) : "自然随意",
      quirks: asStringArray(parsed.quirks, 5),
      catchphrases: asStringArray(parsed.catchphrases, 4),
      opinions: asStringArray(parsed.opinions, 5),
      background: typeof parsed.background === "string" ? parsed.background.slice(0, 400) : "",
      taboo: typeof parsed.taboo === "string" ? parsed.taboo.slice(0, 200) : "",
    };

    const draft: CharacterDraft = {
      name,
      avatarEmoji: typeof parsed.emoji === "string" ? parsed.emoji.slice(0, 8) : "🙂",
      color:
        typeof parsed.color === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed.color)
          ? parsed.color
          : COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
      tagline: typeof parsed.tagline === "string" ? parsed.tagline.slice(0, 80) : persona.archetype,
      persona,
    };
    return ok({ draft, source: "llm" });
  } catch (error) {
    if (isAbortError(error)) return fail("生成超时了，稍后再试", 504);
    const names = listCharacters().map((c) => c.name);
    const draft = generatePersona({ existingNames: [...names, ...existingNames] });
    return ok({ draft, source: "local", warning: friendlyError(error) });
  }
}
