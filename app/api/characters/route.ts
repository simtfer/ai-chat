import { fail, jsonBody, ok } from "@/lib/api/http";
import {
  createCharacter,
  listCharacters,
  type CharacterInput,
} from "@/lib/queries/characters";
import type { Persona } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePersona(value: unknown): Persona {
  const raw = (value ?? {}) as Partial<Persona>;
  const strings = (input: unknown) =>
    Array.isArray(input)
      ? input.filter((item): item is string => typeof item === "string").map((s) => s.slice(0, 120)).slice(0, 8)
      : [];
  return {
    archetype: (raw.archetype ?? "自定义角色").toString().slice(0, 40),
    archetypeKey: raw.archetypeKey,
    mbti: raw.mbti?.toString().slice(0, 20),
    age: raw.age?.toString().slice(0, 20),
    occupation: raw.occupation?.toString().slice(0, 40),
    traits: strings(raw.traits),
    tone: (raw.tone ?? "自然随意").toString().slice(0, 200),
    quirks: strings(raw.quirks),
    catchphrases: strings(raw.catchphrases),
    opinions: strings(raw.opinions),
    background: (raw.background ?? "").toString().slice(0, 400),
    taboo: (raw.taboo ?? "").toString().slice(0, 200),
  };
}

export async function GET() {
  return ok({ characters: listCharacters() });
}

export async function POST(request: Request) {
  const body = await jsonBody<Partial<CharacterInput>>(request);
  const name = (body.name ?? "").trim();
  if (!name) return fail("角色名不能为空");
  if (name.length > 24) return fail("角色名太长");

  const character = createCharacter({
    name,
    avatarEmoji: (body.avatarEmoji ?? "🙂").slice(0, 8),
    color: /^#[0-9a-fA-F]{6}$/.test(body.color ?? "") ? body.color! : "#8b5cf6",
    tagline: (body.tagline ?? "").trim().slice(0, 80),
    persona: normalizePersona(body.persona),
    modelOverride: body.modelOverride?.trim() || null,
  });
  return ok({ character }, { status: 201 });
}
