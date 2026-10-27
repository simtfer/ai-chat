"use client";

import { useEffect, useState } from "react";
import { Pencil, UserPlus, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useChatStore } from "@/stores/chat-store";
import { cn, clamp, seconds } from "@/lib/utils";
import type { Member } from "@/lib/types";

function weightLabel(value: number) {
  if (value < 20) return "很安静";
  if (value < 45) return "偶尔说";
  if (value < 70) return "正常";
  if (value < 90) return "话很多";
  return "话痨";
}

function CooldownRing({
  member,
  now,
  speaking,
}: {
  member: Member;
  now: number;
  speaking: boolean;
}) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, member.cooldownMs);
  const elapsed = member.lastSpokeAt ? now - member.lastSpokeAt : total;
  const remaining = Math.max(0, total - elapsed);
  const progress = now ? clamp(elapsed / total, 0, 1) : 1;
  const cooling = Boolean(member.lastSpokeAt) && remaining > 0;

  return (
    <div
      className="relative grid h-11 w-11 shrink-0 place-items-center"
      title={cooling ? `冷却中，约 ${seconds(remaining)} 秒后可发言` : "随时可以发言"}
    >
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={speaking ? "#a78bfa" : member.character.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: "stroke-dashoffset 900ms linear" }}
        />
      </svg>
      <span
        className={cn(
          "absolute font-mono text-[10px] tabular-nums",
          cooling ? "text-ink-2" : "text-emerald-300",
        )}
      >
        {speaking ? "…" : cooling ? `${seconds(remaining)}` : "就绪"}
      </span>
    </div>
  );
}

function MemberCard({
  member,
  now,
  speaking,
  busy,
  onEdit,
}: {
  member: Member;
  now: number;
  speaking: boolean;
  busy: boolean;
  onEdit: () => void;
}) {
  const updateMember = useChatStore((s) => s.updateMember);
  const nudge = useChatStore((s) => s.nudge);
  const [weight, setWeight] = useState(member.speakWeight);

  useEffect(() => {
    setWeight(member.speakWeight);
  }, [member.speakWeight]);

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 transition-colors",
        member.enabled
          ? "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.1]"
          : "border-white/[0.04] bg-white/[0.012]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar
          name={member.character.name}
          emoji={member.character.avatarEmoji}
          color={member.character.color}
          size={36}
          active={speaking}
          dim={!member.enabled}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">
            {member.character.name}
            {speaking ? (
              <span className="ml-1.5 align-middle text-[10px] text-violet-300">发言中</span>
            ) : null}
          </p>
          <p className="truncate text-[10.5px] text-muted">
            {member.character.persona.archetype}
            <span className="mx-1 text-white/15">·</span>
            冷却 {Math.round(member.cooldownMs / 1000)}s
          </p>
        </div>
        <CooldownRing member={member} now={now} speaking={speaking} />
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <span className="shrink-0 text-[10px] text-muted">话痨</span>
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
        <span className="w-9 shrink-0 text-right font-mono text-[10px] text-ink-2">
          {weight}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <label className="flex items-center gap-2 text-[10.5px] text-muted">
          <Switch
            checked={member.enabled}
            onCheckedChange={(checked) => void updateMember(member.id, { enabled: checked })}
            label={`${member.character.name} 是否发言`}
          />
          {member.enabled ? `让 TA ${weightLabel(weight)}` : "已静音"}
        </label>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={busy || !member.enabled}
            onClick={() => void nudge(member.characterId)}
            title="让它现在说一句"
            aria-label={`让 ${member.character.name} 现在说一句`}
          >
            <Zap size={14} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onEdit}
            title="编辑成员设置"
            aria-label={`编辑 ${member.character.name}`}
          >
            <Pencil size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MemberPanel({
  now,
  onAdd,
  onEdit,
}: {
  now: number;
  onAdd: () => void;
  onEdit: (memberId: string) => void;
}) {
  const members = useChatStore((s) => s.members);
  const typingCharacterId = useChatStore((s) => s.typingCharacterId);
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const busy = Boolean(typingCharacterId || streamingMessageId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
        <div>
          <p className="flex items-baseline gap-1.5 text-[13px] font-semibold text-ink">
            群成员
            <span className="font-mono text-[10.5px] font-normal text-muted">{members.length}</span>
          </p>
          <p className="mt-0.5 text-[10.5px] text-muted">独立的冷却与话痨程度</p>
        </div>
        <Button size="icon-sm" variant="soft" onClick={onAdd} title="添加成员" aria-label="添加成员">
          <UserPlus size={14} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.09] px-4 py-8 text-center">
            <p className="text-[12px] text-muted">还没有 AI 成员</p>
            <Button size="sm" variant="soft" className="mt-3" onClick={onAdd}>
              <UserPlus size={13} />
              添加角色
            </Button>
          </div>
        ) : (
          members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              now={now}
              speaking={member.characterId === typingCharacterId}
              busy={busy}
              onEdit={() => onEdit(member.id)}
            />
          ))
        )}
      </div>

      <div className="border-t border-white/[0.055] px-4 py-3">
        <p className="text-[10.5px] leading-relaxed text-muted">
          用户发言后 AI 会优先接话；「@昵称」可以点名让某个角色回应。
        </p>
      </div>
    </div>
  );
}
