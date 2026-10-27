export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'demo',
  base_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature REAL NOT NULL DEFAULT 0.95,
  max_tokens INTEGER NOT NULL DEFAULT 220,
  context_char_budget INTEGER NOT NULL DEFAULT 6000,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '🙂',
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  tagline TEXT NOT NULL DEFAULT '',
  persona_json TEXT NOT NULL,
  model_override TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  min_gap_ms INTEGER NOT NULL DEFAULT 6000,
  max_gap_ms INTEGER NOT NULL DEFAULT 18000,
  is_running INTEGER NOT NULL DEFAULT 0,
  last_ai_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  speak_weight INTEGER NOT NULL DEFAULT 50,
  cooldown_ms INTEGER NOT NULL DEFAULT 45000,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_spoke_at INTEGER,
  joined_at INTEGER NOT NULL,
  UNIQUE (group_id, character_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user','ai','system')),
  character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('streaming','complete','error','interrupted')),
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_msg_group_time ON messages(group_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_msg_streaming ON messages(group_id, status);
CREATE INDEX IF NOT EXISTS idx_member_group ON group_members(group_id);

INSERT INTO settings (id, provider, base_url, api_key, model, temperature, max_tokens, context_char_budget, updated_at)
SELECT 1, 'demo', '', '', 'gpt-4o-mini', 0.95, 220, 6000, CAST(strftime('%s', 'now') AS INTEGER) * 1000
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = 1);
`;
