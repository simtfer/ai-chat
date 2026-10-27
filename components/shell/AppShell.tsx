"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquarePlus, Plus, Settings2, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/components/shell/CreateGroupDialog";
import { cn, timeAgo } from "@/lib/utils";
import type { GroupSummary } from "@/lib/types";

function SidebarContent({
  groups,
  onNavigate,
  onCreate,
}: {
  groups: GroupSummary[];
  onNavigate?: () => void;
  onCreate: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <Link href="/" onClick={onNavigate} className="group flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-[#0a0c12] shadow-[0_10px_30px_-10px_rgba(139,92,246,0.9)]">
            <Sparkles size={19} strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-ink">Nebula</span>
              <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted">
                beta
              </span>
            </span>
            <span className="mt-0.5 block text-[11px] text-muted">让 AI 们自己聊起来</span>
          </span>
        </Link>
      </div>

      <div className="px-4">
        <Button variant="primary" className="w-full justify-start" onClick={onCreate}>
          <Plus size={16} />
          新建群聊
        </Button>
      </div>

      <div className="mt-6 flex items-center justify-between px-5 pb-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted/80">
          群聊
        </span>
        <span className="font-mono text-[10px] text-muted/60">{groups.length}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {groups.length === 0 ? (
          <div className="mx-2 rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
            <MessageSquarePlus size={20} className="mx-auto mb-2 text-muted" />
            <p className="text-[12px] leading-relaxed text-muted">
              还没有群聊
              <br />
              点上面的按钮开一局
            </p>
          </div>
        ) : null}
        {groups.map((group) => {
          const active = pathname === `/g/${group.id}`;
          return (
            <Link
              key={group.id}
              href={`/g/${group.id}`}
              onClick={onNavigate}
              className={cn(
                "group relative block rounded-xl px-3 py-2.5 transition-all duration-200",
                active
                  ? "bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "hover:bg-white/[0.045]",
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-gradient-to-b from-brand to-brand-2" />
              ) : null}
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
                  {group.title}
                </span>
                {group.isRunning ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
                    <span className="h-1 w-1 animate-pulse-soft rounded-full bg-emerald-400" />
                    运行中
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="truncate text-[11.5px] leading-relaxed text-muted">
                  {group.lastMessagePreview?.replace(/\s+/g, " ") ?? "还没有消息"}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted/60">
                <span>{group.memberCount} 个 AI</span>
                {group.lastMessageAt ? (
                  <>
                    <span className="h-2.5 w-px bg-white/10" />
                    <span>{timeAgo(group.lastMessageAt)}</span>
                  </>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="space-y-1 border-t border-white/[0.06] p-3">
        <Link
          href="/characters"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition",
            pathname === "/characters"
              ? "bg-white/[0.07] text-ink"
              : "text-ink-2 hover:bg-white/[0.05] hover:text-ink",
          )}
        >
          <Users size={16} className="text-muted" />
          角色库
          <span className="ml-auto text-[10px] text-muted/60">全局</span>
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition",
            pathname === "/settings"
              ? "bg-white/[0.07] text-ink"
              : "text-ink-2 hover:bg-white/[0.05] hover:text-ink",
          )}
        >
          <Settings2 size={16} className="text-muted" />
          模型设置
        </Link>
        <div className="px-3 pt-2 text-[10px] leading-relaxed text-muted/50">
          本地运行 · 数据保存在 .data
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  groups,
  children,
}: {
  groups: GroupSummary[];
  children: React.ReactNode;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-[284px] shrink-0 border-r border-white/[0.055] bg-[#090b11]/70 backdrop-blur-2xl lg:block">
        <SidebarContent groups={groups} onCreate={() => setCreateOpen(true)} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-[286px] border-r border-white/[0.08] bg-[#0a0c13]/95 backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white/[0.07] hover:text-ink"
              aria-label="关闭菜单"
            >
              <X size={16} />
            </button>
            <SidebarContent
              groups={groups}
              onCreate={() => {
                setMobileOpen(false);
                setCreateOpen(true);
              }}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-white/[0.05] bg-[#0a0c12]/60 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-ink-2"
            aria-label="打开菜单"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-[#0a0c12]">
              <Sparkles size={14} />
            </span>
            <span className="text-sm font-semibold tracking-tight">Nebula</span>
          </div>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </div>

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
