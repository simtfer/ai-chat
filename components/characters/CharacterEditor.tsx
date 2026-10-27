"use client";

import { useEffect, useState } from "react";
import { Dices, Library, Loader2, PenLine, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PersonaForm, type CharacterFormValue } from "@/components/characters/PersonaForm";
import { PresetPicker } from "@/components/characters/PresetPicker";
import { api } from "@/lib/api/client";
import { generatePersona, type CharacterDraft } from "@/lib/persona/generator";
import { getArchetype, personaFromPreset } from "@/lib/persona/presets";
import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "random" | "preset" | "custom";

const MODES: Array<{
  key: Mode;
  label: string;
  hint: string;
  icon: typeof Dices;
}> = [
  { key: "random", label: "随机生成", hint: "本地组合，秒出", icon: Dices },
  { key: "preset", label: "预设性格", hint: "24 个经典原型", icon: Library },
  { key: "custom", label: "完全自定义", hint: "逐项自己写", icon: PenLine },
];

function emptyValue(): CharacterFormValue {
  return {
    name: "",
    avatarEmoji: "🙂",
    color: "#8b5cf6",
    tagline: "",
    modelOverride: "",
    persona: {
      archetype: "自定义角色",
      traits: [],
      tone: "",
      quirks: [],
      catchphrases: [],
      opinions: [],
      background: "",
      taboo: "",
    },
  };
}

function fromDraft(draft: CharacterDraft): CharacterFormValue {
  return {
    name: draft.name,
    avatarEmoji: draft.avatarEmoji,
    color: draft.color,
    tagline: draft.tagline,
    modelOverride: "",
    persona: draft.persona,
  };
}

function fromCharacter(character: Character): CharacterFormValue {
  return {
    name: character.name,
    avatarEmoji: character.avatarEmoji,
    color: character.color,
    tagline: character.tagline,
    modelOverride: character.modelOverride ?? "",
    persona: character.persona,
  };
}

export function CharacterEditor({
  open,
  initial,
  existingNames,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  initial: Character | null;
  existingNames: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: (character: Character) => void;
  onDeleted: (id: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("random");
  const [value, setValue] = useState<CharacterFormValue>(emptyValue);
  const [presetKey, setPresetKey] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setAiLoading(false);
    setConfirmDelete(false);
    setDeleting(false);
    if (initial) {
      setValue(fromCharacter(initial));
      setPresetKey(initial.persona.archetypeKey);
      setMode("custom");
    } else {
      const draft = generatePersona({ existingNames });
      setValue(fromDraft(draft));
      setPresetKey(draft.persona.archetypeKey);
      setMode("random");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const applyDraft = (draft: CharacterDraft, keepName: boolean) => {
    setValue((current) => ({
      ...fromDraft(draft),
      name: keepName && current.name ? current.name : draft.name,
      modelOverride: keepName ? current.modelOverride : "",
    }));
    setPresetKey(draft.persona.archetypeKey);
  };

  const rollLocal = () => {
    const draft = generatePersona({ existingNames });
    applyDraft(draft, Boolean(initial));
  };

  const rollAi = async () => {
    setAiLoading(true);
    try {
      const result = await api.generatePersona({ existingNames });
      applyDraft(result.draft, Boolean(initial));
      if (result.source === "local") {
        toast.message("演示模式下由本地生成器拼装人设", {
          description: "在模型设置里配置 API 后，可以让模型生成更独特的人设。",
        });
      } else if (result.warning) {
        toast.message(result.warning);
      } else {
        toast.success("AI 生成了一份新人设");
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const applyPreset = (key: string) => {
    const preset = getArchetype(key);
    if (!preset) return;
    setPresetKey(key);
    setValue((current) => ({
      ...current,
      avatarEmoji: preset.emoji,
      color: preset.color,
      tagline: preset.tagline,
      persona: personaFromPreset(preset),
    }));
  };

  const save = async () => {
    const name = value.name.trim();
    if (!name) {
      toast.error("给角色起个名字");
      return;
    }
    if (!value.persona.tone.trim() && !value.tagline.trim()) {
      toast.error("至少写一句简介或说话风格");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name,
        avatarEmoji: value.avatarEmoji,
        color: value.color,
        tagline: value.tagline.trim(),
        persona: { ...value.persona, archetypeKey: presetKey },
        modelOverride: value.modelOverride.trim() || null,
      };
      const character = initial
        ? await api.updateCharacter(initial.id, body)
        : await api.createCharacter(body);
      onSaved(character);
      toast.success(initial ? "角色已更新" : "角色已创建");
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await api.deleteCharacter(initial.id);
      onDeleted(initial.id);
      toast.success("角色已删除");
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `编辑「${initial.name}」` : "新建角色"}
      description="人设会被写进群聊的提示词，越具体，说话越像它自己。"
      size="lg"
      footer={
        <>
          {initial ? (
            <Button
              variant={confirmDelete ? "danger" : "ghost"}
              className={cn("mr-auto", !confirmDelete && "text-muted hover:text-rose-300")}
              onClick={remove}
              disabled={deleting || saving}
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {confirmDelete ? "确认删除角色" : "删除角色"}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button variant="primary" onClick={save} disabled={saving || deleting}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {initial ? "保存修改" : "创建角色"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((item) => {
            const Icon = item.icon;
            const active = mode === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setMode(item.key)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all duration-200",
                  active
                    ? "border-brand/45 bg-brand/[0.12] shadow-[0_10px_30px_-20px_rgba(139,92,246,0.9)]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mb-2 grid h-7 w-7 place-items-center rounded-lg",
                    active ? "bg-brand/25 text-violet-100" : "bg-white/[0.05] text-muted",
                  )}
                >
                  <Icon size={14} />
                </span>
                <span className="block text-[12.5px] font-medium text-ink">{item.label}</span>
                <span className="mt-0.5 block text-[10px] text-muted">{item.hint}</span>
              </button>
            );
          })}
        </div>

        {mode === "random" ? (
          <div className="rounded-2xl border border-brand/15 bg-brand/[0.045] p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={rollLocal}>
                <Dices size={14} />
                换一个
              </Button>
              <Button variant="soft" size="sm" onClick={rollAi} disabled={aiLoading}>
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                AI 随机
              </Button>
              <p className="text-[11px] leading-relaxed text-muted">
                本地生成立刻可用；「AI 随机」会调用当前模型，生成更特别的人设。
              </p>
            </div>
          </div>
        ) : null}

        {mode === "preset" ? (
          <div className="space-y-2">
            <PresetPicker selected={presetKey} onSelect={applyPreset} />
            <p className="text-[11px] text-muted">
              点一个原型会填充下面所有字段，之后仍然可以自由修改。
            </p>
          </div>
        ) : null}

        {mode === "custom" ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5 text-[11.5px] text-muted">
            <Sparkles size={13} className="text-violet-300" />
            下面所有字段都可以手写；留空的部分模型会自行发挥。
          </div>
        ) : null}

        <div className="border-t border-white/[0.06] pt-5">
          <PersonaForm value={value} onChange={setValue} />
        </div>
      </div>
    </Modal>
  );
}
