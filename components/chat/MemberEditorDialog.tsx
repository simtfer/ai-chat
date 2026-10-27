"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";

function describeWeight(value: number) {
  if (value < 20) return "几乎不主动开口";
  if (value < 45) return "偶尔插一句";
  if (value < 70) return "正常参与";
  if (value < 90) return "比较活跃";
  return "抢着说话";
}

export function MemberEditorDialog({
  memberId,
  onOpenChange,
}: {
  memberId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const members = useChatStore((s) => s.members);
  const updateMember = useChatStore((s) => s.updateMember);
  const removeMember = useChatStore((s) => s.removeMember);
  const nudge = useChatStore((s) => s.nudge);
  const busy = useChatStore((s) => Boolean(s.typingCharacterId || s.streamingMessageId));

  const member = members.find((m) => m.id === memberId) ?? null;
  const [weight, setWeight] = useState(50);
  const [cooldown, setCooldown] = useState(45);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!member) return;
    setWeight(member.speakWeight);
    setCooldown(Math.round(member.cooldownMs / 1000));
    setConfirmRemove(false);
    setRemoving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.id]);

  const close = () => onOpenChange(false);

  return (
    <Modal
      open={Boolean(member)}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title="成员设置"
      description="每个 AI 在群里有独立的话痨程度与冷却时间。"
      size="sm"
      footer={
        <>
          {member ? (
            <Button
              variant={confirmRemove ? "danger" : "ghost"}
              className={cn("mr-auto", !confirmRemove && "text-muted hover:text-rose-300")}
              disabled={removing}
              onClick={async () => {
                if (!confirmRemove) {
                  setConfirmRemove(true);
                  return;
                }
                setRemoving(true);
                await removeMember(member.id);
                setRemoving(false);
                close();
              }}
            >
              <Trash2 size={14} />
              {confirmRemove ? "确认移出" : "移出群聊"}
            </Button>
          ) : null}
          <Button variant="primary" onClick={close}>
            完成
          </Button>
        </>
      }
    >
      {member ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
            <Avatar
              name={member.character.name}
              emoji={member.character.avatarEmoji}
              color={member.character.color}
              size={46}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink">
                {member.character.name}
                <span className="ml-2 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-normal text-violet-200">
                  {member.character.persona.archetype}
                </span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                {member.character.tagline || member.character.persona.background}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-[13px] font-medium text-ink-2">话痨程度</p>
              <p className="font-mono text-[11px] text-muted">
                {weight} · {describeWeight(weight)}
              </p>
            </div>
            <Slider
              value={weight}
              min={1}
              max={100}
              step={1}
              disabled={!member.enabled}
              onValueChange={setWeight}
              onValueCommit={(value) => {
                if (value !== member.speakWeight) void updateMember(member.id, { speakWeight: value });
              }}
            />
            <p className="text-[11px] leading-relaxed text-muted">
              权重越高，轮到它接话的概率越大；其他人越活跃，它越不容易抢到。
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-[13px] font-medium text-ink-2">最短冷却</p>
              <p className="font-mono text-[11px] text-muted">{cooldown} 秒</p>
            </div>
            <Slider
              value={cooldown}
              min={5}
              max={180}
              step={5}
              disabled={!member.enabled}
              onValueChange={setCooldown}
              onValueCommit={(value) => {
                const next = value * 1000;
                if (next !== member.cooldownMs) void updateMember(member.id, { cooldownMs: next });
              }}
            />
            <p className="text-[11px] leading-relaxed text-muted">
              说完一句后，至少隔这么久才会再次主动发言。
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
            <div>
              <p className="text-[12.5px] font-medium text-ink-2">参与自动聊天</p>
              <p className="mt-0.5 text-[11px] text-muted">关闭后只在被点名或手动催更时发言</p>
            </div>
            <Switch
              checked={member.enabled}
              onCheckedChange={(checked) => void updateMember(member.id, { enabled: checked })}
              label="参与自动聊天"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
            <Button
              variant="soft"
              size="sm"
              disabled={busy || !member.enabled}
              onClick={() => {
                void nudge(member.characterId);
                close();
              }}
            >
              <Zap size={14} />
              让它现在说
            </Button>
            <Link
              href={`/characters?edit=${member.characterId}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-ink-2 transition hover:bg-white/[0.06] hover:text-ink"
            >
              <ExternalLink size={13} />
              编辑人设
            </Link>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
