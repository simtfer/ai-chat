"use client";

import { Clock3, Pause, Play, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/empty";
import { useChatStore } from "@/stores/chat-store";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

function StatusChip() {
  const running = useChatStore((s) => s.running);
  const nextAt = useChatStore((s) => s.nextAt);
  const typing = useChatStore((s) => s.typingCharacterId);
  const streaming = useChatStore((s) => s.streamingMessageId);
  const members = useChatStore((s) => s.members);
  const now = useNow(400);

  const base =
    "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium sm:flex";

  if (!members.length) {
    return <span className={cn(base, "border-white/[0.08] text-muted")}>等待成员</span>;
  }
  if (!running) return null;
  if (typing || streaming) {
    return (
      <span className={cn(base, "border-brand/25 bg-brand/10 text-violet-200")}>
        <Spinner size={10} />
        正在发言
      </span>
    );
  }
  if (!nextAt || !now) {
    return (
      <span className={cn(base, "border-white/[0.08] text-muted")}>
        <Clock3 size={11} />
        准备中
      </span>
    );
  }
  const seconds = Math.max(0, Math.round((nextAt - now) / 1000));
  return (
    <span
      className={cn(
        base,
        "border-white/[0.08] bg-white/[0.03] font-mono text-ink-2 tabular-nums",
      )}
    >
      <Clock3 size={11} className="text-muted" />
      {seconds <= 0 ? "马上" : `下一句 ${seconds}s`}
    </span>
  );
}

export function ChatHeaderActions({ onOpenMembers }: { onOpenMembers: () => void }) {
  const running = useChatStore((s) => s.running);
  const toggleRunning = useChatStore((s) => s.toggleRunning);
  const nudge = useChatStore((s) => s.nudge);
  const typing = useChatStore((s) => s.typingCharacterId);
  const streaming = useChatStore((s) => s.streamingMessageId);
  const hasMembers = useChatStore((s) => s.members.length > 0);
  const busy = Boolean(typing || streaming);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <StatusChip />
      <Button
        size="icon"
        variant="ghost"
        onClick={() => void nudge()}
        disabled={!hasMembers || busy}
        title="催更：立刻让一个 AI 说一句"
        aria-label="催更"
      >
        <Zap size={16} />
      </Button>
      <Button
        variant={running ? "secondary" : "primary"}
        size="sm"
        onClick={() => void toggleRunning()}
        className="px-2.5 sm:px-3"
      >
        {running ? <Pause size={14} /> : <Play size={14} />}
        <span className="hidden sm:inline">{running ? "暂停" : "继续聊"}</span>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onOpenMembers}
        className="xl:hidden"
        aria-label="群成员"
      >
        <Users size={16} />
      </Button>
    </div>
  );
}
