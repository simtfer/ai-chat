import { fail, jsonBody, ok } from "@/lib/api/http";
import {
  deleteCharacter,
  getCharacter,
  updateCharacter,
  type CharacterPatch,
} from "@/lib/queries/characters";
import type { Persona } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function normalizePersona(value: Persona): Persona {
  const strings = (input: unknown) =>
    Array.isArray(input)
      ? input.filter((item): item is string => typeof item === "string").map((s) => s.slice(0, 120)).slice(0, 8)
      : [];
  return {
    archetype: (value.archetype ?? "自定义角色").toString().slice(0, 40),
    archetypeKey: value.archetypeKey,
    mbti: value.mbti?.toString().slice(0, 20),
    age: value.age?.toString().slice(0, 20),
    occupation: value.occupation?.toString().slice(0, 40),
    traits: strings(value.traits),
    tone: (value.tone ?? "自然随意").toString().slice(0, 200),
    quirks: strings(value.quirks),
    catchphrases: strings(value.catchphrases),
    opinions: strings(value.opinions),
    background: (value.background ?? "").toString().slice(0, 400),
    taboo: (value.taboo ?? "").toString().slice(0, 200),
  };
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const character = getCharacter(id);
  if (!character) return fail("角色不存在", 404);
  return ok({ character });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!getCharacter(id)) return fail("角色不存在", 404);
  const body = await jsonBody<Partial<{
    name: string;
    avatarEmoji: string;
    color: string;
    tagline: string;
    persona: Persona;
    modelOverride: string | null;
  }>>(request);

  const patch: CharacterPatch = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return fail("角色名不能为空");
    patch.name = name.slice(0, 24);
  }
  if (typeof body.avatarEmoji === "string") patch.avatarEmoji = body.avatarEmoji.slice(0, 8);
  if (typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)) patch.color = body.color;
  if (typeof body.tagline === "string") patch.tagline = body.tagline.trim().slice(0, 80);
  if (body.persona) patch.persona = normalizePersona(body.persona);
  if (body.modelOverride !== undefined) {
    patch.modelOverride = typeof body.modelOverride === "string" ? body.modelOverride.trim() || null : null;
  }

  const character = updateCharacter(id, patch);
  return ok({ character });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  deleteCharacter(id);
  return ok({ deleted: true });
}
