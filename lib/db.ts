import { mkdirSync } from "node:fs";
import path from "node:path";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema";

type Database = import("node:sqlite").DatabaseSync;

const globalStore = globalThis as unknown as {
  __aiChatDb?: Database;
};

function resolveDbFile() {
  const configured = process.env.AI_CHAT_DB;
  if (configured && configured.trim()) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "ai-chat.db");
}

function open(): Database {
  const sqlite = process.getBuiltinModule("node:sqlite");
  if (!sqlite) {
    throw new Error("当前 Node 版本不支持 node:sqlite，请使用 Node 24+");
  }
  const file = resolveDbFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new sqlite.DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");

  const row = db.prepare("PRAGMA user_version").get() as { user_version?: number } | undefined;
  const version = Number(row?.user_version ?? 0);
  if (version < SCHEMA_VERSION) {
    db.exec(SCHEMA_SQL);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
  db.exec("PRAGMA user_version = " + Math.max(version, SCHEMA_VERSION));

  // Any row still marked streaming at process start has no owner.
  db.prepare(
    "UPDATE messages SET status = 'interrupted', error = COALESCE(error, '生成被中断') WHERE status = 'streaming'",
  ).run();

  return db;
}

export function getDb(): Database {
  if (!globalStore.__aiChatDb) {
    globalStore.__aiChatDb = open();
  }
  return globalStore.__aiChatDb;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function tx<T>(fn: (db: Database) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw error;
  }
}

export function cleanupStaleStreaming(groupId?: string) {
  const db = getDb();
  const cutoff = Date.now() - 120_000;
  if (groupId) {
    db.prepare(
      "UPDATE messages SET status = 'interrupted', error = COALESCE(error, '生成被中断') WHERE status = 'streaming' AND created_at < ? AND group_id = ?",
    ).run(cutoff, groupId);
    return;
  }
  db.prepare(
    "UPDATE messages SET status = 'interrupted', error = COALESCE(error, '生成被中断') WHERE status = 'streaming' AND created_at < ?",
  ).run(cutoff);
}

export function hasStreamingMessage(groupId: string): boolean {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM messages WHERE group_id = ? AND status = 'streaming'")
    .get(groupId) as { c: number };
  return Number(row?.c ?? 0) > 0;
}
