"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api/client";
import { useChatStore } from "@/stores/chat-store";
import { PACE_PRESETS } from "@/lib/types";
import { clamp } from "@/lib/utils";

export function GroupSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const group = useChatStore((s) => s.group);
  const updateGroupPatch = useChatStore((s) => s.updateGroupPatch);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [minGap, setMinGap] = useState(6);
  const [maxGap, setMaxGap] = useState(18);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !group) return;
    setTitle(group.title);
    setTopic(group.topic);
    setMinGap(Math.round(group.minGapMs / 1000));
    setMaxGap(Math.round(group.maxGapMs / 1000));
    setConfirmDelete(false);
    setSaving(false);
    setDeleting(false);
  }, [open, group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pace = useMemo(
    () =>
      PACE_PRESETS.find(
        (p) => p.minGapMs === minGap * 1000 && p.maxGapMs === maxGap * 1000,
      )?.key ?? "custom",
    [minGap, maxGap],
  );

  const changeMin = (value: number) => {
    const next = clamp(value, 1, 120);
    setMinGap(next);
    if (maxGap < next + 1) setMaxGap(Math.min(120, next + 1));
  };

  const changeMax = (value: number) => {
    const next = clamp(value, 1, 120);
    setMaxGap(next);
    if (minGap > next - 1) setMinGap(Math.max(1, next - 1));
  };

  const save = async () => {
    if (!group) return;
    if (!title.trim()) {
      toast.error("群聊名称不能为空");
      return;
    }
    setSaving(true);
    try {
      await updateGroupPatch({
        title: title.trim(),
        topic: topic.trim(),
        minGapMs: minGap * 1000,
        maxGapMs: maxGap * 1000,
      });
      toast.success("群聊设置已保存");
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!group) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await api.deleteGroup(group.id);
      toast.success("群聊已删除");
      onOpenChange(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="群聊设置"
      description="调整名字、话题与 AI 之间的聊天节奏。"
      size="md"
      footer={
        <>
          <Button
            variant={confirmDelete ? "danger" : "ghost"}
            className="mr-auto text-muted hover:text-rose-300"
            disabled={deleting}
            onClick={remove}
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {confirmDelete ? "确认删除群聊" : "删除群聊"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button variant="primary" onClick={save} disabled={saving || deleting}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="群聊名称">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
          </Field>
          <Field label="话题" hint="可选">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="AI 们会围绕它起话头"
              maxLength={200}
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-ink-2">聊天节奏</p>
              <p className="mt-0.5 text-[11px] text-muted">两次 AI 发言之间的随机等待</p>
            </div>
            <Segmented
              size="sm"
              value={pace}
              onChange={(key) => {
                if (key === "custom") return;
                const preset = PACE_PRESETS.find((p) => p.key === key);
                if (!preset) return;
                setMinGap(preset.minGapMs / 1000);
                setMaxGap(preset.maxGapMs / 1000);
              }}
              options={[
                ...PACE_PRESETS.map((p) => ({ value: p.key, label: p.label })),
                ...(pace === "custom" ? [{ value: "custom", label: "自定义" }] : []),
              ]}
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-ink-2">最短间隔</span>
                <span className="font-mono text-[11px] text-muted">{minGap} 秒</span>
              </div>
              <Slider value={minGap} min={1} max={120} step={1} onValueChange={changeMin} />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-ink-2">最长间隔</span>
                <span className="font-mono text-[11px] text-muted">{maxGap} 秒</span>
              </div>
              <Slider value={maxGap} min={1} max={120} step={1} onValueChange={changeMax} />
            </div>
            <p className="text-[11px] leading-relaxed text-muted">
              每两句话之间会在 <span className="text-ink-2">{minGap}–{maxGap} 秒</span>{" "}
              内随机，每个角色还受各自的冷却限制。用户发言或有人被 @ 时会临时加快。
            </p>
          </div>
        </div>

        <p className="rounded-xl border border-rose-500/15 bg-rose-500/[0.045] px-3.5 py-2.5 text-[11px] leading-relaxed text-muted">
          删除群聊会连同聊天记录一起移除，角色本身仍保留在角色库中。
        </p>
      </div>
    </Modal>
  );
}
