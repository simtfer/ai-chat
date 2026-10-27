"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowDown, MessagesSquare, Play, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { useChatStore } from "@/stores/chat-store";
import { formatDay } from "@/lib/utils";
import type { Message } from "@/lib/types";

function sameSpeaker(a: Message, b: Message) {
  if (a.senderType !== b.senderType) return false;
  if (a.senderType === "user") return true;
  return a.characterId === b.characterId;
}

export function ChatMessageList({
  onAddMembers,
  onOpenMembers,
}: {
  onAddMembers: () => void;
  onOpenMembers: () => void;
}) {
  const messages = useChatStore((s) => s.messages);
  const members = useChatStore((s) => s.members);
  const typingCharacterId = useChatStore((s) => s.typingCharacterId);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const running = useChatStore((s) => s.running);
  const group = useChatStore((s) => s.group);
  const setRunning = useChatStore((s) => s.setRunning);
  const nudge = useChatStore((s) => s.nudge);
  const retry = useChatStore((s) => s.retry);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const lastSignal = useRef("");
  const seenCountRef = useRef(0);
  const [unread, setUnread] = useState(0);

  const typingMember = typingCharacterId
    ? members.find((m) => m.characterId === typingCharacterId)
    : null;

  useEffect(() => {
    const last = messages[messages.length - 1];
    const signal = `${messages.length}:${last?.content.length ?? 0}:${typingCharacterId ?? ""}`;
    if (signal === lastSignal.current) return;
    lastSignal.current = signal;

    const element = scrollRef.current;
    if (!element) return;
    if (pinnedRef.current) {
      element.scrollTop = element.scrollHeight;
      seenCountRef.current = messages.length;
      setUnread(0);
    } else {
      setUnread(Math.max(0, messages.length - seenCountRef.current));
    }
  }, [messages, typingCharacterId]);

  useEffect(() => {
    pinnedRef.current = true;
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, []);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distance < 110;
    pinnedRef.current = atBottom;
    if (atBottom) {
      seenCountRef.current = messages.length;
      setUnread(0);
    }
  };

  const jumpToBottom = () => {
    pinnedRef.current = true;
    seenCountRef.current = messages.length;
    setUnread(0);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overscroll-contain px-4 pb-6 pt-5 sm:px-6"
      >
        <div className="mx-auto max-w-3xl">
          {members.length === 0 ? (
            <div className="flex min-h-[52vh] items-center justify-center">
              <EmptyState
                icon={UserPlus}
                title="这个群还没有 AI"
                description="先拉几个角色进来，它们才有得聊。可以从角色库挑选，也可以随机生成。"
                action={
                  <Button variant="primary" size="sm" onClick={onAddMembers}>
                    <UserPlus size={14} />
                    添加 AI 成员
                  </Button>
                }
              />
            </div>
          ) : isEmpty ? (
            <div className="flex min-h-[52vh] items-center justify-center">
              <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-violet-200">
                  <MessagesSquare size={24} strokeWidth={1.6} />
                </div>
                <h2 className="text-[17px] font-medium text-ink">还没有人开口</h2>
                <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
                  {group?.topic
                    ? `群话题是「${group.topic}」。点下面的按钮，让其中一个 AI 起个头。`
                    : "点下面的按钮，让其中一个 AI 起个头；也可以自己先说一句。"}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void nudge()}
                    disabled={Boolean(streamingMessageId)}
                  >
                    <Sparkles size={14} />
                    让它说一句
                  </Button>
                  {!running ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setRunning(true)}
                    >
                      <Play size={14} />
                      开始自动聊天
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={onOpenMembers}>
                    查看成员
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const next = messages[index + 1];
                const groupedWithPrevious =
                  Boolean(previous) &&
                  sameSpeaker(previous, message) &&
                  message.createdAt - previous.createdAt < 4 * 60 * 1000;
                const groupedWithNext =
                  Boolean(next) &&
                  sameSpeaker(message, next) &&
                  next.createdAt - message.createdAt < 4 * 60 * 1000;
                const showDay =
                  !previous || formatDay(previous.createdAt) !== formatDay(message.createdAt);

                if (message.senderType === "system") {
                  return (
                    <div key={message.id} className="py-3 text-center text-[11px] text-muted">
                      {message.content}
                    </div>
                  );
                }

                return (
                  <Fragment key={message.id}>
                    {showDay ? (
                      <div className="flex items-center gap-3 py-4">
                        <span className="h-px flex-1 bg-white/[0.055]" />
                        <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-0.5 text-[10px] text-muted">
                          {formatDay(message.createdAt)}
                        </span>
                        <span className="h-px flex-1 bg-white/[0.055]" />
                      </div>
                    ) : null}
                    <MessageBubble
                      message={message}
                      members={members}
                      showHeader={!groupedWithPrevious}
                      tail={!groupedWithNext}
                      onRetry={() => void retry(message.id)}
                    />
                  </Fragment>
                );
              })}

              {typingMember && !streamingMessageId ? (
                <div className="animate-fade-in flex items-start gap-2.5 pt-2">
                  <span className="mt-0.5 w-[34px] shrink-0">
                    <span
                      className="grid h-[30px] w-[30px] place-items-center rounded-full text-[13px]"
                      style={{
                        background: `linear-gradient(150deg, ${typingMember.character.color}ee, ${typingMember.character.color}55)`,
                      }}
                    >
                      {typingMember.character.avatarEmoji}
                    </span>
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5">
                    <span className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="typing-dot h-1.5 w-1.5 rounded-full bg-violet-300/80"
                          style={{ animationDelay: `${i * 140}ms` }}
                        />
                      ))}
                    </span>
                    <span className="text-[11.5px] text-muted">
                      {typingMember.character.name} 正在输入
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {unread > 0 ? (
        <button
          type="button"
          onClick={jumpToBottom}
          className="animate-pop absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#171b28]/95 px-3 py-1.5 text-[11px] font-medium text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl transition hover:border-white/20"
        >
          <ArrowDown size={12} />
          {unread} 条新消息
        </button>
      ) : null}
    </div>
  );
}

