import { getDb, newId, tx } from "../db";
import type { Character, Group, GroupSummary, Member } from "../types";
import { DEFAULT_PACE } from "../types";
import { mapCharacter, type CharacterRow } from "./characters";

type GroupRow = {
  id: string;
  title: string;
  topic: string;
  min_gap_ms: number;
  max_gap_ms: number;
  is_running: number;
  last_ai_at: number | null;
  created_at: number;
  updated_at: number;
  member_count?: number;
  last_message_preview?: string | null;
  last_message_at?: number | null;
};

function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    minGapMs: row.min_gap_ms,
    maxGapMs: row.max_gap_ms,
    isRunning: Boolean(row.is_running),
    lastAiAt: row.last_ai_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listGroups(): GroupSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT g.*,
        (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id) AS member_count,
        (SELECT content FROM messages WHERE group_id = g.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_message_preview,
        (SELECT created_at FROM messages WHERE group_id = g.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_message_at
      FROM groups g
      ORDER BY COALESCE(
        (SELECT MAX(created_at) FROM messages WHERE group_id = g.id),
        g.updated_at
      ) DESC`,
    )
    .all() as unknown as GroupRow[];
  return rows.map((row) => ({
    ...mapGroup(row),
    memberCount: Number(row.member_count ?? 0),
    lastMessagePreview: row.last_message_preview ?? null,
    lastMessageAt: row.last_message_at ?? null,
  }));
}

export function getGroup(id: string): Group | null {
  const row = getDb().prepare("SELECT * FROM groups WHERE id = ?").get(id) as
    | GroupRow
    | undefined;
  return row ? mapGroup(row) : null;
}

export type CreateGroupInput = {
  title: string;
  topic?: string;
  minGapMs?: number;
  maxGapMs?: number;
  isRunning?: boolean;
  characterIds?: string[];
};

export function createGroup(input: CreateGroupInput): Group {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  const min = input.minGapMs ?? DEFAULT_PACE.minGapMs;
  const max = Math.max(min + 500, input.maxGapMs ?? DEFAULT_PACE.maxGapMs);

  tx((d) => {
    d.prepare(
      `INSERT INTO groups (id, title, topic, min_gap_ms, max_gap_ms, is_running, last_ai_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    ).run(id, input.title, input.topic ?? "", min, max, input.isRunning === false ? 0 : 1, now, now);

    const insertMember = d.prepare(
      `INSERT OR IGNORE INTO group_members (id, group_id, character_id, speak_weight, cooldown_ms, enabled, last_spoke_at, joined_at)
       VALUES (?, ?, ?, 50, 45000, 1, NULL, ?)`,
    );
    for (const characterId of input.characterIds ?? []) {
      insertMember.run(newId(), id, characterId, now);
    }
  });

  return getGroup(id)!;
}

export type GroupPatch = {
  title?: string;
  topic?: string;
  minGapMs?: number;
  maxGapMs?: number;
  isRunning?: boolean;
};

export function updateGroup(id: string, patch: GroupPatch): Group | null {
  const current = getGroup(id);
  if (!current) return null;
  const min = patch.minGapMs ?? current.minGapMs;
  const max = Math.max(min + 500, patch.maxGapMs ?? current.maxGapMs);
  getDb()
    .prepare(
      `UPDATE groups SET title = ?, topic = ?, min_gap_ms = ?, max_gap_ms = ?, is_running = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.title ?? current.title,
      patch.topic ?? current.topic,
      min,
      max,
      patch.isRunning === undefined ? (current.isRunning ? 1 : 0) : patch.isRunning ? 1 : 0,
      Date.now(),
      id,
    );
  return getGroup(id);
}

export function deleteGroup(id: string) {
  getDb().prepare("DELETE FROM groups WHERE id = ?").run(id);
}

export function touchGroupAfterAi(groupId: string, characterId: string, at: number) {
  const db = getDb();
  db.prepare("UPDATE groups SET last_ai_at = ?, updated_at = ? WHERE id = ?").run(at, at, groupId);
  db.prepare("UPDATE group_members SET last_spoke_at = ? WHERE group_id = ? AND character_id = ?").run(
    at,
    groupId,
    characterId,
  );
}

type MemberRow = CharacterRow & {
  member_id: string;
  group_id: string;
  character_id: string;
  speak_weight: number;
  cooldown_ms: number;
  enabled: number;
  last_spoke_at: number | null;
  joined_at: number;
};

function mapMember(row: MemberRow): Member {
  return {
    id: row.member_id,
    groupId: row.group_id,
    characterId: row.character_id,
    speakWeight: row.speak_weight,
    cooldownMs: row.cooldown_ms,
    enabled: Boolean(row.enabled),
    lastSpokeAt: row.last_spoke_at,
    joinedAt: row.joined_at,
    character: mapCharacter({
      id: row.character_id,
      name: row.name,
      avatar_emoji: row.avatar_emoji,
      color: row.color,
      tagline: row.tagline,
      persona_json: row.persona_json,
      model_override: row.model_override,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }),
  };
}

const MEMBER_SELECT = `
  SELECT m.id AS member_id, m.group_id, m.character_id, m.speak_weight, m.cooldown_ms,
         m.enabled, m.last_spoke_at, m.joined_at,
         c.name, c.avatar_emoji, c.color, c.tagline, c.persona_json, c.model_override,
         c.created_at, c.updated_at
  FROM group_members m
  JOIN characters c ON c.id = m.character_id
`;

export function listMembers(groupId: string): Member[] {
  const rows = getDb()
    .prepare(`${MEMBER_SELECT} WHERE m.group_id = ? ORDER BY m.joined_at ASC`)
    .all(groupId) as unknown as MemberRow[];
  return rows.map(mapMember);
}

export function getMember(groupId: string, characterId: string): Member | null {
  const row = getDb()
    .prepare(`${MEMBER_SELECT} WHERE m.group_id = ? AND m.character_id = ?`)
    .get(groupId, characterId) as MemberRow | undefined;
  return row ? mapMember(row) : null;
}

export function addMembers(groupId: string, characterIds: string[]): Member[] {
  const db = getDb();
  const now = Date.now();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO group_members (id, group_id, character_id, speak_weight, cooldown_ms, enabled, last_spoke_at, joined_at)
     VALUES (?, ?, ?, 50, 45000, 1, NULL, ?)`,
  );
  for (const characterId of characterIds) {
    insert.run(newId(), groupId, characterId, now);
  }
  return listMembers(groupId);
}

export type MemberPatch = {
  speakWeight?: number;
  cooldownMs?: number;
  enabled?: boolean;
};

export function updateMember(memberId: string, patch: MemberPatch): Member | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM group_members WHERE id = ?").get(memberId) as
    | {
        id: string;
        group_id: string;
        speak_weight: number;
        cooldown_ms: number;
        enabled: number;
        character_id: string;
      }
    | undefined;
  if (!row) return null;
  db.prepare(
    "UPDATE group_members SET speak_weight = ?, cooldown_ms = ?, enabled = ? WHERE id = ?",
  ).run(
    patch.speakWeight === undefined ? row.speak_weight : Math.max(1, Math.min(100, Math.round(patch.speakWeight))),
    patch.cooldownMs === undefined ? row.cooldown_ms : Math.max(0, Math.round(patch.cooldownMs)),
    patch.enabled === undefined ? row.enabled : patch.enabled ? 1 : 0,
    memberId,
  );
  return getMember(row.group_id, row.character_id);
}

export function removeMember(memberId: string) {
  getDb().prepare("DELETE FROM group_members WHERE id = ?").run(memberId);
}

export function getGroupDetail(groupId: string): { group: Group; members: Member[] } | null {
  const group = getGroup(groupId);
  if (!group) return null;
  return { group, members: listMembers(groupId) };
}
