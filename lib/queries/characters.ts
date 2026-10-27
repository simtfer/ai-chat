import { getDb, newId } from "../db";
import type { Character, Persona } from "../types";

export type CharacterRow = {
  id: string;
  name: string;
  avatar_emoji: string;
  color: string;
  tagline: string;
  persona_json: string;
  model_override: string | null;
  created_at: number;
  updated_at: number;
};

export function parsePersona(json: string): Persona {
  try {
    const parsed = JSON.parse(json) as Partial<Persona>;
    return {
      archetype: parsed.archetype ?? "神秘角色",
      archetypeKey: parsed.archetypeKey,
      mbti: parsed.mbti,
      age: parsed.age,
      occupation: parsed.occupation,
      traits: parsed.traits ?? [],
      tone: parsed.tone ?? "自然随意",
      quirks: parsed.quirks ?? [],
      catchphrases: parsed.catchphrases ?? [],
      opinions: parsed.opinions ?? [],
      background: parsed.background ?? "",
      taboo: parsed.taboo ?? "",
    };
  } catch {
    return {
      archetype: "神秘角色",
      traits: [],
      tone: "自然随意",
      quirks: [],
      catchphrases: [],
      opinions: [],
      background: "",
      taboo: "",
    };
  }
}

export function mapCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    name: row.name,
    avatarEmoji: row.avatar_emoji,
    color: row.color,
    tagline: row.tagline,
    persona: parsePersona(row.persona_json),
    modelOverride: row.model_override,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCharacters(): Character[] {
  const rows = getDb()
    .prepare("SELECT * FROM characters ORDER BY created_at ASC")
    .all() as unknown as CharacterRow[];
  return rows.map(mapCharacter);
}

export function getCharacter(id: string): Character | null {
  const row = getDb().prepare("SELECT * FROM characters WHERE id = ?").get(id) as
    | CharacterRow
    | undefined;
  return row ? mapCharacter(row) : null;
}

export type CharacterInput = {
  name: string;
  avatarEmoji: string;
  color: string;
  tagline: string;
  persona: Persona;
  modelOverride?: string | null;
};

export function createCharacter(input: CharacterInput): Character {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO characters (id, name, avatar_emoji, color, tagline, persona_json, model_override, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.avatarEmoji,
    input.color,
    input.tagline,
    JSON.stringify(input.persona),
    input.modelOverride || null,
    now,
    now,
  );
  return getCharacter(id)!;
}

export type CharacterPatch = Partial<CharacterInput>;

export function updateCharacter(id: string, patch: CharacterPatch): Character | null {
  const current = getCharacter(id);
  if (!current) return null;
  const db = getDb();
  db.prepare(
    `UPDATE characters SET name = ?, avatar_emoji = ?, color = ?, tagline = ?, persona_json = ?, model_override = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    patch.name ?? current.name,
    patch.avatarEmoji ?? current.avatarEmoji,
    patch.color ?? current.color,
    patch.tagline ?? current.tagline,
    JSON.stringify(patch.persona ?? current.persona),
    patch.modelOverride === undefined ? current.modelOverride : patch.modelOverride || null,
    Date.now(),
    id,
  );
  return getCharacter(id);
}

export function deleteCharacter(id: string) {
  getDb().prepare("DELETE FROM characters WHERE id = ?").run(id);
}
