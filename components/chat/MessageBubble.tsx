"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn, formatClock, hexAlpha } from "@/lib/utils";
import type { Member, Message } from "@/lib/types";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderMentions(text: string, members: Member[]) {
  const names = members
    .map((m) => m.character.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!names.length) return text;

  const pattern = new RegExp(`(@(?:${names.map(escapeRegExp).join("|")}))`, "g");
  const parts = text.split(pattern);
  return parts.map((part, index) => {
    if (!part.startsWith("@")) return <span key={index}>{part}</span>;
    const name = part.slice(1);
    const member = members.find((m) => m.character.name === name);
    if (!member) return <span key={index}>{part}</span>;
    return (
      <span
        key={index}
        className="font-medium"
        style={{ color: member.character.color }}
      >
        {part}
      </span>
    );
  });
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-300/70"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  );
}

export function MessageBubble({
  message,
  members,
  showHeader,
  tail,
  onRetry,
}: {
  message: Message;
  members: Member[];
  showHeader: boolean;
  tail: boolean;
  onRetry: () => void;
}) {
  const isUser = message.senderType === "user";
  const streaming = message.status === "streaming";
  const failed = message.status === "error";
  const interrupted = message.status === "interrupted";
  const color = message.characterColor || "#8b5cf6";
  const name = message.characterName || "已离开的成员";
  const emoji = message.characterEmoji || "🙂";

  if (isUser) {
    return (
      <div className={cn("animate-fade-up flex justify-end gap-2.5", tail ? "mb-3" : "mb-1")}>
        <div className="max-w-[82%] sm:max-w-[70%]">
          {showHeader ? (
            <div className="mb-1 flex items-center justify-end gap-2 text-[10.5px] text-muted">
              <span>{formatClock(message.createdAt)}</span>
              <span className="text-ink-2">你</span>
            </div>
          ) : null}
          <div className="rounded-2xl rounded-tr-md bg-gradient-to-br from-brand via-[#7c5cf6] to-[#6366f1] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white shadow-[0_14px_34px_-18px_rgba(139,92,246,0.95)]">
            <span className="whitespace-pre-wrap break-words">
              {renderMentions(message.content, members)}
            </span>
          </div>
        </div>
        <span className="mt-[22px] hidden h-7 w-7 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.05] text-[10px] font-medium text-ink-2 sm:grid">
          我
        </span>
      </div>
    );
  }

  return (
    <div className={cn("animate-fade-up flex items-start gap-2.5", tail ? "mb-3" : "mb-1")}>
      <div className="mt-0.5 w-[34px] shrink-0">
        {showHeader ? (
          <Avatar name={name} emoji={emoji} color={color} size={30} dim={failed} />
        ) : null}
      </div>

      <div className="min-w-0 max-w-[82%] sm:max-w-[72%]">
        {showHeader ? (
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[11.5px] font-medium" style={{ color }}>
              {name}
            </span>
            <span className="text-[10px] text-muted/70">{formatClock(message.createdAt)}</span>
            {message.model ? (
              <span className="hidden rounded bg-white/[0.04] px-1 py-0.5 font-mono text-[9px] text-muted/60 sm:inline">
                {message.model}
              </span>
            ) : null}
          </div>
        ) : null}

        {message.content || streaming ? (
          <div
            className={cn(
              "msg-bubble rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink/90",
              failed && "border-rose-500/25 bg-rose-500/[0.06]",
            )}
            style={{
              background: `linear-gradient(165deg, ${hexAlpha(color, 0.12)}, rgba(255,255,255,0.03) 60%)`,
              borderColor: hexAlpha(color, 0.2),
              borderLeftWidth: 2,
              borderLeftColor: hexAlpha(color, 0.6),
            }}
          >
            {message.content ? (
              <span
                className={cn(
                  "whitespace-pre-wrap break-words",
                  streaming && "stream-caret",
                )}
              >
                {renderMentions(message.content, members)}
              </span>
            ) : (
              <Dots />
            )}
          </div>
        ) : null}

        {failed ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10.5px] text-rose-300/80">
            <TriangleAlert size={11} />
            <span className="max-w-[280px] truncate">
              生成失败：{message.error ?? "未知错误"}
            </span>
            {message.characterId ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-rose-200 transition hover:bg-rose-500/20"
              >
                <RotateCcw size={10} />
                重试
              </button>
            ) : null}
          </div>
        ) : null}

        {interrupted ? (
          <div className="mt-1.5 text-[10.5px] text-amber-300/60">
            已中断{message.error ? ` · ${message.error}` : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}
