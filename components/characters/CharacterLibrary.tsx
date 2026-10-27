"use client";

import { useEffect, useMemo, useState } from "react";
import { Dices, Loader2, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { CharacterCard } from "@/components/characters/CharacterCard";
import { CharacterEditor } from "@/components/characters/CharacterEditor";
import { api } from "@/lib/api/client";
import { generatePersona } from "@/lib/persona/generator";
import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CharacterLibrary({
  initial,
  initialEditId,
}: {
  initial: Character[];
  initialEditId: string | null;
}) {
  const [characters, setCharacters] = useState(initial);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (!initialEditId) return;
    const target = initial.find((c) => c.id === initialEditId);
    if (target) {
      setEditing(target);
      setEditorOpen(true);
      window.history.replaceState({}, "", "/characters");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditId]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return characters;
    return characters.filter((c) =>
      [c.name, c.tagline, c.persona.archetype, c.persona.tone, ...c.persona.traits]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [characters, query]);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (character: Character) => {
    setEditing(character);
    setEditorOpen(true);
  };

  const rollAndCreate = async () => {
    setRolling(true);
    try {
      const draft = generatePersona({ existingNames: characters.map((c) => c.name) });
      const character = await api.createCharacter({
        name: draft.name,
        avatarEmoji: draft.avatarEmoji,
        color: draft.color,
        tagline: draft.tagline,
        persona: draft.persona,
      });
      setCharacters((prev) => [character, ...prev]);
      toast.success(`「${character.name}」已加入角色库`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-ink">角色库</h1>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10.5px] text-muted">
                {characters.length}
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-muted">
              全局资产：同一个角色可以同时出现在多个群聊里，频率各自独立。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索角色…"
                className="h-9 w-[180px] bg-black/20 pl-8.5 text-[12.5px]"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={rollAndCreate} disabled={rolling}>
              {rolling ? <Loader2 size={14} className="animate-spin" /> : <Dices size={14} />}
              随机一个
            </Button>
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus size={14} />
              新建角色
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {characters.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02]">
              <EmptyState
                icon={Users}
                title="角色库还是空的"
                description="先造一个 AI 角色：随机生成一个，或者从 24 个预设原型里挑一个开始改。"
                action={
                  <div className="flex items-center gap-2">
                    <Button variant="primary" onClick={rollAndCreate} disabled={rolling}>
                      <Dices size={15} />
                      随机生成
                    </Button>
                    <Button variant="secondary" onClick={openNew}>
                      <Plus size={15} />
                      手动创建
                    </Button>
                  </div>
                }
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/[0.08] py-16 text-center text-[13px] text-muted">
              没有匹配「{query}」的角色
            </div>
          ) : (
            <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3")}>
              {filtered.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onEdit={() => openEdit(character)}
                />
              ))}
              <button
                type="button"
                onClick={openNew}
                className="group flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] text-muted transition hover:border-brand/35 hover:bg-brand/[0.04] hover:text-ink-2"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.1] bg-white/[0.03] transition group-hover:border-brand/40 group-hover:text-violet-200">
                  <Plus size={16} />
                </span>
                <span className="text-[12px]">新建角色</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <CharacterEditor
        open={editorOpen}
        initial={editing}
        existingNames={characters.map((c) => c.name)}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        onSaved={(character) => {
          setCharacters((prev) => {
            const exists = prev.some((c) => c.id === character.id);
            return exists
              ? prev.map((c) => (c.id === character.id ? character : c))
              : [character, ...prev];
          });
        }}
        onDeleted={(id) => {
          setCharacters((prev) => prev.filter((c) => c.id !== id));
        }}
      />
    </div>
  );
}
