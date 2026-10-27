"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/ui/avatar";
import { ChatHeaderActions } from "@/components/chat/ChatHeaderActions";
import { AddMemberDialog } from "@/components/chat/AddMemberDialog";
import { GroupSettingsDialog } from "@/components/chat/GroupSettingsDialog";
import { MemberPanel } from "@/components/chat/MemberPanel";
import { MemberEditorDialog } from "@/components/chat/MemberEditorDialog";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { Composer } from "@/components/chat/Composer";
import { useChatStore } from "@/stores/chat-store";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { Group, Member, Message } from "@/lib/types";

export function ChatRoom({
  initialGroup,
  initialMembers,
  initialMessages,
}: {
  initialGroup: Group;
  initialMembers: Member[];
  initialMessages: Message[];
}) {
  const group = useChatStore((s) => s.group);
  const members = useChatStore((s) => s.members);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMembers, setMobileMembers] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const now = useNow(1000);

  useEffect(() => {
    useChatStore.getState().init({
      group: initialGroup,
      members: initialMembers,
      messages: initialMessages,
    });
    return () => useChatStore.getState().destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGroup.id]);

  const activeGroup = group ?? initialGroup;
  const activeMembers = group ? members : initialMembers;
  const avatarMembers = activeMembers.map((m) => ({
    id: m.id,
    name: m.character.name,
    emoji: m.character.avatarEmoji,
    color: m.character.color,
  }));

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-white/[0.055] bg-[#0a0c12]/40 px-4 backdrop-blur-xl sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[16px] font-semibold tracking-tight text-ink">
                {activeGroup.title}
              </h1>
              <RunningBadge />
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">
              {avatarMembers.length ? (
                <AvatarStack members={avatarMembers} size={20} max={4} />
              ) : null}
              <span className="shrink-0">{activeMembers.length} 个 AI</span>
              {activeGroup.topic ? (
                <>
                  <span className="h-2.5 w-px bg-white/10" />
                  <span className="truncate">{activeGroup.topic}</span>
                </>
              ) : null}
            </div>
          </div>

          <ChatHeaderActions onOpenMembers={() => setMobileMembers(true)} />

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSettingsOpen(true)}
            aria-label="群聊设置"
          >
            <Settings2 size={16} />
          </Button>
        </header>

        <ChatMessageList
          onAddMembers={() => setAddOpen(true)}
          onOpenMembers={() => setMobileMembers(true)}
        />
        <Composer onAddMembers={() => setAddOpen(true)} />
      </div>

      <aside className="hidden w-[320px] shrink-0 border-l border-white/[0.055] bg-[#090b11]/45 xl:block">
        <MemberPanel
          now={now}
          onAdd={() => setAddOpen(true)}
          onEdit={(id) => setEditingMemberId(id)}
        />
      </aside>

      {mobileMembers ? (
        <div className="fixed inset-0 z-40 flex justify-end xl:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMembers(false)}
          />
          <div className="animate-fade-in relative h-full w-[330px] max-w-[88vw] border-l border-white/[0.08] bg-[#0a0c13]/95 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="text-[13px] font-medium">群成员</span>
              <button
                type="button"
                onClick={() => setMobileMembers(false)}
                className="rounded-lg px-2 py-1 text-[12px] text-muted hover:bg-white/[0.06] hover:text-ink"
              >
                关闭
              </button>
            </div>
            <div className="h-[calc(100%-53px)]">
              <MemberPanel
                now={now}
                onAdd={() => setAddOpen(true)}
                onEdit={(id) => {
                  setMobileMembers(false);
                  setEditingMemberId(id);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
      <GroupSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <MemberEditorDialog
        memberId={editingMemberId}
        onOpenChange={(open) => {
          if (!open) setEditingMemberId(null);
        }}
      />
    </div>
  );
}

function RunningBadge() {
  const running = useChatStore((s) => s.running);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        running ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.05] text-muted",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          running ? "animate-pulse-soft bg-emerald-400" : "bg-white/30",
        )}
      />
      {running ? "自动聊天中" : "已暂停"}
    </span>
  );
}
