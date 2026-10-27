"use client";

import { useRef, useState } from "react";
import { ArrowUp, AtSign, Play, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";

export function Composer({ onAddMembers }: { onAddMembers: () => void }) {
  const members = useChatStore((s) => s.members);
  const running = useChatStore((s) => s.running);
  const streaming = useChatStore((s) => s.streamingMessageId);
  const sendUserMessage = useChatStore((s) => s.sendUserMessage);
  const setRunning = useChatStore((s) => s.setRunning);

  const [value, setValue] = useState("");
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = mention
    ? members.filter((m) => m.character.name.includes(mention.query)).slice(0, 6)
    : [];

  const updateMention = (element: HTMLTextAreaElement) => {
    const caret = element.selectionStart ?? 0;
    const before = element.value.slice(0, caret);
    const match = /@([^\s@]{0,12})$/.exec(before);
    if (match) {
      setMention({ query: match[1], start: caret - match[0].length });
    } else {
      setMention(null);
    }
  };

  const insertMention = (name: string) => {
    const element = textareaRef.current;
    if (!mention || !element) return;
    const caret = element.selectionStart ?? value.length;
    const next = `${value.slice(0, mention.start)}@${name} ${value.slice(caret)}`;
    setValue(next);
    setMention(null);
    const position = mention.start + name.length + 2;
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(position, position);
    });
  };

  const submit = async () => {
    const text = value.trim();
    if (!text) return;
    setValue("");
    setMention(null);
    await sendUserMessage(text);
    if (!running) {
      toast.message("已发送。自动聊天处于暂停状态，点右上角「催更」让 AI 接话");
    }
  };

  if (members.length === 0) {
    return (
      <div className="shrink-0 border-t border-white/[0.055] bg-[#0a0c12]/55 px-3 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-4 sm:flex-row sm:justify-between">
          <p className="text-[12.5px] text-muted">先拉几个 AI 进来，这个群才聊得起来。</p>
          <Button variant="soft" size="sm" onClick={onAddMembers}>
            <UserPlus size={14} />
            添加 AI 成员
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-white/[0.055] bg-[#0a0c12]/55 px-3 pb-3 pt-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto max-w-3xl">
        {!running ? (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3 py-1.5">
            <p className="text-[11px] text-amber-200/80">
              自动聊天已暂停，AI 不会主动接话
            </p>
            <button
              type="button"
              onClick={() => void setRunning(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-amber-200 transition hover:bg-amber-400/10"
            >
              <Play size={11} />
              继续
            </button>
          </div>
        ) : null}

        <div className="relative">
          {mention && filtered.length > 0 ? (
            <div className="animate-pop absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border border-white/[0.09] bg-[#141827]/97 p-1 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
              <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted">点名</p>
              {filtered.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertMention(member.character.name)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.07]"
                >
                  <Avatar
                    name={member.character.name}
                    emoji={member.character.avatarEmoji}
                    color={member.character.color}
                    size={24}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                    {member.character.name}
                  </span>
                  <span className="text-[10px] text-muted">{member.character.persona.archetype}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div
            className={cn(
              "glass flex items-end gap-1.5 rounded-2xl px-2.5 py-2 transition duration-200",
              "focus-within:border-brand/35 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,0.08)]",
            )}
          >
            <button
              type="button"
              onClick={() => {
                const element = textareaRef.current;
                if (!element) return;
                const caret = element.selectionStart ?? value.length;
                const next = `${value.slice(0, caret)}@${value.slice(caret)}`;
                setValue(next);
                setMention({ query: "", start: caret });
                requestAnimationFrame(() => {
                  element.focus();
                  element.setSelectionRange(caret + 1, caret + 1);
                });
              }}
              className="mb-1 grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-white/[0.06] hover:text-ink"
              aria-label="提及成员"
              title="@ 某个 AI"
            >
              <AtSign size={16} />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                updateMention(event.target);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setMention(null);
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (mention && filtered.length > 0) {
                    insertMention(filtered[0].character.name);
                    return;
                  }
                  void submit();
                }
              }}
              placeholder={running ? "说点什么，或 @ 某个 AI…" : "说点什么（AI 自动聊天已暂停）…"}
              maxLength={2000}
              className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-muted/70"
            />

            <Button
              variant="primary"
              size="icon"
              className="mb-0.5 h-9 w-9 rounded-xl"
              onClick={() => void submit()}
              disabled={!value.trim()}
              aria-label="发送"
            >
              <ArrowUp size={16} strokeWidth={2.4} />
            </Button>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-muted/70">
          <span>Enter 发送 · Shift + Enter 换行 · @ 点名</span>
          <span className={cn(streaming && "text-violet-300/80")}>
            {streaming ? "AI 正在生成…" : running ? "AI 会自己接话" : "自动聊天已暂停"}
          </span>
        </div>
      </div>
    </div>
  );
}
