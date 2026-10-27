import { getDb, newId } from "../db";
import type { Message, MessageStatus, SenderType } from "../types";

type MessageRow = {
  id: string;
  group_id: string;
  sender_type: SenderType;
  character_id: string | null;
  content: string;
  status: MessageStatus;
  model: string | null;
  error: string | null;
  created_at: number;
  c_name?: string | null;
  c_emoji?: string | null;
  c_color?: string | null;
};

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    groupId: row.group_id,
    senderType: row.sender_type,
    characterId: row.character_id,
    content: row.content,
    status: row.status,
    model: row.model,
    error: row.error,
    createdAt: row.created_at,
    characterName: row.c_name ?? null,
    characterEmoji: row.c_emoji ?? null,
    characterColor: row.c_color ?? null,
  };
}

const MESSAGE_SELECT = `
  SELECT m.*, c.name AS c_name, c.avatar_emoji AS c_emoji, c.color AS c_color
  FROM messages m
  LEFT JOIN characters c ON c.id = m.character_id
`;

export function listMessages(groupId: string, limit = 120, before?: number): Message[] {
  const db = getDb();
  const rows = before
    ? (db
        .prepare(
          `${MESSAGE_SELECT} WHERE m.group_id = ? AND m.created_at < ? ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
        )
        .all(groupId, before, limit) as unknown as MessageRow[])
    : (db
        .prepare(
          `${MESSAGE_SELECT} WHERE m.group_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
        )
        .all(groupId, limit) as unknown as MessageRow[]);
  return rows.reverse().map(mapMessage);
}

export function getMessage(id: string): Message | null {
  const row = getDb()
    .prepare(`${MESSAGE_SELECT} WHERE m.id = ?`)
    .get(id) as MessageRow | undefined;
  return row ? mapMessage(row) : null;
}

export function createMessage(input: {
  groupId: string;
  senderType: SenderType;
  characterId?: string | null;
  content?: string;
  status?: MessageStatus;
  model?: string | null;
}): Message {
  const id = newId();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO messages (id, group_id, sender_type, character_id, content, status, model, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.groupId,
      input.senderType,
      input.characterId ?? null,
      input.content ?? "",
      input.status ?? "complete",
      input.model ?? null,
      now,
    );
  return getMessage(id)!;
}

export function updateMessage(
  id: string,
  patch: {
    content?: string;
    status?: MessageStatus;
    model?: string | null;
    error?: string | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
  },
): Message | null {
  const db = getDb();
  const current = db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as
    | MessageRow
    | undefined;
  if (!current) return null;
  db.prepare(
    `UPDATE messages SET content = ?, status = ?, model = ?, error = ?, prompt_tokens = ?, completion_tokens = ?
     WHERE id = ?`,
  ).run(
    patch.content === undefined ? current.content : patch.content,
    patch.status ?? current.status,
    patch.model === undefined ? current.model : patch.model,
    patch.error === undefined ? current.error : patch.error,
    patch.promptTokens ?? null,
    patch.completionTokens ?? null,
    id,
  );
  return getMessage(id);
}

export function countMessages(groupId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM messages WHERE group_id = ?")
    .get(groupId) as { c: number };
  return Number(row?.c ?? 0);
}

export function clearMessages(groupId: string) {
  getDb().prepare("DELETE FROM messages WHERE group_id = ?").run(groupId);
}
