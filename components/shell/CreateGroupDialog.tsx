"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Dices, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { api } from "@/lib/api/client";
import { generateCrowd, type CharacterDraft } from "@/lib/persona/generator";
import { PACE_PRESETS, type Character } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [pace, setPace] = useState("normal");
  const [autoStart, setAutoStart] = useState(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<CharacterDraft[]>([]);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api
      .listCharacters()
      .then((list) => {
        if (!cancelled) setCharacters(list);
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    setTitle("");
    setTopic("");
    setPace("normal");
    setAutoStart(true);
    setSelected([]);
    setDrafts([]);
    setQuery("");
    setSubmitting(false);
  }, [open]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return characters;
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(keyword) ||
        c.persona.archetype.toLowerCase().includes(keyword) ||
        c.tagline.toLowerCase().includes(keyword),
    );
  }, [characters, query]);

  const totalMembers = selected.length + drafts.length;

  const handleRandom = () => {
    const names = [...characters.map((c) => c.name), ...drafts.map((d) => d.name)];
    setDrafts((prev) => [...prev, ...generateCrowd(3, names)]);
  };

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("先给群聊起个名字");
      return;
    }
    setSubmitting(true);
    try {
      const created = await Promise.all(
        drafts.map((draft) =>
          api.createCharacter({
            name: draft.name,
            avatarEmoji: draft.avatarEmoji,
            color: draft.color,
            tagline: draft.tagline,
            persona: draft.persona,
          }),
        ),
      );
      const characterIds = [...selected, ...created.map((c) => c.id)];
      const preset = PACE_PRESETS.find((p) => p.key === pace) ?? PACE_PRESETS[1];
      const detail = await api.createGroup({
        title: title.trim(),
        topic: topic.trim(),
        minGapMs: preset.minGapMs,
        maxGapMs: preset.maxGapMs,
        isRunning: autoStart,
        characterIds,
      });
      toast.success("群聊建好了");
      onOpenChange(false);
      router.push(`/g/${detail.group.id}`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="新建群聊"
      description="起个名字，挑几个 AI，它们会自己聊起来。"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            创建群聊
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="群聊名称">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：深夜编辑部"
              maxLength={40}
              autoFocus
            />
          </Field>
          <Field label="话题" hint="可选">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：聊聊最近的离谱新闻"
              maxLength={200}
            />
          </Field>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-ink-2">聊天节奏</p>
              <p className="mt-0.5 text-[11px] text-muted">两句 AI 发言之间的随机间隔</p>
            </div>
            <Segmented
              size="sm"
              options={PACE_PRESETS.map((p) => ({ value: p.key, label: p.label, hint: p.hint }))}
              value={pace}
              onChange={setPace}
            />
          </div>
          {(() => {
            const preset = PACE_PRESETS.find((p) => p.key === pace);
            return preset ? (
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[11.5px] text-muted">
                大约每 <span className="text-ink-2">{preset.hint}</span> 说一句，每个角色还有各自的最短冷却。
              </p>
            ) : null;
          })()}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-ink-2">创建后立即开始</p>
            <p className="mt-0.5 text-[11px] text-muted">打开页面后 AI 就会自动接话</p>
          </div>
          <Switch checked={autoStart} onCheckedChange={setAutoStart} label="创建后立即开始" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-ink-2">
                群成员 <span className="ml-1 font-mono text-[11px] text-muted">{totalMembers}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted">可加入任意数量，随时还能再拉人</p>
            </div>
            <Button variant="soft" size="sm" onClick={handleRandom}>
              <Dices size={14} />
              随机 3 个
            </Button>
          </div>

          {drafts.length ? (
            <div className="space-y-1.5 rounded-2xl border border-brand/20 bg-brand/[0.06] p-2.5">
              {drafts.map((draft, index) => (
                <div
                  key={`${draft.name}-${index}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5"
                >
                  <Avatar name={draft.name} emoji={draft.avatarEmoji} color={draft.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-ink">
                      {draft.name}
                      <span className="ml-2 text-[11px] text-muted">{draft.persona.archetype}</span>
                    </p>
                    <p className="truncate text-[11px] text-muted">{draft.tagline}</p>
                  </div>
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-violet-200">
                    新建
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrafts((prev) => prev.filter((_, i) => i !== index))}
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-white/[0.06] hover:text-rose-300"
                    aria-label={`移除 ${draft.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索角色库…"
              className="h-9 bg-black/20 pl-9 text-[13px]"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>

          <div className="max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-black/15 p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted">
                <Loader2 size={14} className="animate-spin" /> 正在读取角色库…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-muted">
                {characters.length === 0
                  ? "角色库还是空的，先用上面的「随机 3 个」开个头"
                  : "没有匹配的角色"}
              </div>
            ) : (
              filtered.map((character) => {
                const active = selected.includes(character.id);
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => toggle(character.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                      active ? "bg-white/[0.07]" : "hover:bg-white/[0.045]",
                    )}
                  >
                    <Avatar
                      name={character.name}
                      emoji={character.avatarEmoji}
                      color={character.color}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] text-ink">
                        {character.name}
                        <span className="ml-2 text-[11px] text-muted">
                          {character.persona.archetype}
                        </span>
                      </p>
                      <p className="truncate text-[11px] text-muted">{character.tagline}</p>
                    </div>
                    <span
                      className={cn(
                        "grid h-5 w-5 place-items-center rounded-md border transition",
                        active
                          ? "border-brand/60 bg-brand text-white"
                          : "border-white/15 bg-white/[0.03] text-transparent",
                      )}
                    >
                      {active ? <Check size={12} strokeWidth={3} /> : <Plus size={11} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
