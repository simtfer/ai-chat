import { getDb } from "../db";
import type { Provider, SettingsPublic, SettingsRaw } from "../types";

type SettingsRow = {
  provider: Provider;
  base_url: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
  context_char_budget: number;
};

function readRow(): SettingsRow {
  return getDb().prepare("SELECT * FROM settings WHERE id = 1").get() as SettingsRow;
}

export function getSettingsRaw(): SettingsRaw {
  const row = readRow();
  return {
    provider: row.provider,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    contextCharBudget: row.context_char_budget,
  };
}

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `••••${key.slice(-4)}`;
}

export function getSettingsPublic(): SettingsPublic {
  const raw = getSettingsRaw();
  return {
    provider: raw.provider,
    baseUrl: raw.baseUrl,
    model: raw.model,
    temperature: raw.temperature,
    maxTokens: raw.maxTokens,
    contextCharBudget: raw.contextCharBudget,
    hasApiKey: Boolean(raw.apiKey),
    apiKeyHint: maskKey(raw.apiKey),
  };
}

export type SettingsPatch = {
  provider?: Provider;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  contextCharBudget?: number;
};

export function updateSettings(patch: SettingsPatch): SettingsPublic {
  const current = getSettingsRaw();
  getDb()
    .prepare(
      `UPDATE settings SET provider = ?, base_url = ?, api_key = ?, model = ?, temperature = ?,
       max_tokens = ?, context_char_budget = ?, updated_at = ? WHERE id = 1`,
    )
    .run(
      patch.provider ?? current.provider,
      patch.baseUrl ?? current.baseUrl,
      patch.apiKey ?? current.apiKey,
      patch.model ?? current.model,
      patch.temperature ?? current.temperature,
      patch.maxTokens ?? current.maxTokens,
      patch.contextCharBudget ?? current.contextCharBudget,
      Date.now(),
    );
  return getSettingsPublic();
}
