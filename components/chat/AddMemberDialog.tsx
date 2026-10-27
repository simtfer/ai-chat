"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Dices, Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api/client";
import { generateCrowd } from "@/lib/persona/generator";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import type { Character } from "@/lib/types";

export function AddMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const members = useChatStore((s) => s.members);
  const addMembers = useChatStore((s) => s.addMembers);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rolling, setRolling] = useState(false);

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
    setQuery("");
    setSelected([]);
    setSubmitting(false);
    setRolling(false);
  }, [open]);

  const memberCharacterIds = useMemo(() => new Set(members.map((m) => m.characterId)), [members]);

  const available = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return characters.filter((c) => {
      if (memberCharacterIds.has(c.id)) return false;
      if (!keyword) return true;
      return (
        c.name.toLowerCase().includes(keyword) ||
        c.tagline.toLowerCase().includes(keyword) ||
        c.persona.archetype.toLowerCase().includes(keyword)
      );
    });
  }, [characters, query, memberCharacterIds]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!selected.length) return;
    setSubmitting(true);
    await addMembers(selected);
    setSubmitting(false);
    onOpenChange(false);
  };

  const rollRandom = async () => {
    setRolling(true);
    try {
      const drafts = generateCrowd(
        2,
        [...characters.map((c) => c.name), ...members.map((m) => m.character.name)],
      );
      const created: Character[] = [];
      for (const draft of drafts) {
        const character = await api.createCharacter({
          name: draft.name,
          avatarEmoji: draft.avatarEmoji,
          color: draft.color,
          tagline: draft.tagline,
          persona: draft.persona,
        });
        created.push(character);
      }
      await addMembers(created.map((c) => c.id));
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRolling(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="添加成员"
      description="从全局角色库挑选，或直接随机生成两个新角色。"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!selected.length || submitting || rolling}
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            加入 {selected.length ? `${selected.length} 个角色` : "群聊"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索名字、性格或简介…"
            className="h-9 bg-black/20 text-[13px]"
          />
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="soft" size="sm" onClick={rollRandom} disabled={rolling || submitting}>
              {rolling ? <Loader2 size={14} className="animate-spin" /> : <Dices size={14} />}
              随机 2 个
            </Button>
            <Link
              href="/characters"
              className="rounded-lg px-2 py-1 text-[12px] text-muted transition hover:bg-white/[0.06] hover:text-ink"
            >
              角色库
            </Link>
          </div>
        </div>

        <div className="max-h-[46vh] min-h-[180px] space-y-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-black/15 p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted">
              <Loader2 size={14} className="animate-spin" /> 正在读取角色库…
            </div>
          ) : available.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12px] leading-relaxed text-muted">
              {characters.length === members.length
                ? "角色库里的角色都在群里了，试试「随机 2 个」或去角色库新建一个。"
                : query
                  ? "没有匹配的角色"
                  : "角色库还是空的，先用「随机 2 个」开个头。"}
            </div>
          ) : (
            available.map((character) => {
              const active = selected.includes(character.id);
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => toggle(character.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                    active ? "bg-white/[0.07]" : "hover:bg-white/[0.045]",
                  )}
                >
                  <Avatar
                    name={character.name}
                    emoji={character.avatarEmoji}
                    color={character.color}
                    size={34}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-ink">
                      {character.name}
                      <span className="ml-2 text-[11px] text-muted">
                        {character.persona.archetype}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {character.tagline || character.persona.tone}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition",
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
        <p className="text-[11px] text-muted">
          加入后可以单独设置每个角色的发言频率与冷却，同一角色也能出现在多个群里。
        </p>
      </div>
    </Modal>
  );
}
