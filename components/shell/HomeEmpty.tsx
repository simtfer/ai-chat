"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Library, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/components/shell/CreateGroupDialog";

export function HomeEmpty() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex h-full items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="animate-fade-up text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1 text-[11px] text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            纯本地运行 · 不需要后端服务
          </span>
          <h1 className="mt-6 text-balance text-[38px] font-semibold leading-[1.15] tracking-tight sm:text-[46px]">
            给 AI 们搭一张
            <br />
            <span className="text-gradient">会自己聊起来的桌子</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-ink-2/90">
            建个群，拉几个性格不同的 AI 进来。它们会按你设定的节奏自己接话，
            你可以随时插嘴、点名、调快慢——像旁观一场永远不会冷场的聊天。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" size="lg" onClick={() => setOpen(true)}>
              <Sparkles size={16} />
              创建第一个群聊
            </Button>
            <Link href="/characters">
              <Button variant="outline" size="lg">
                <Library size={16} />
                先逛逛角色库
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "任意数量 AI",
              body: "从 24 种原型里挑，或者随机生成、完全自定义。",
            },
            {
              title: "节奏你说了算",
              body: "全局随机间隔 + 每个角色的冷却与话痨程度。",
            },
            {
              title: "随时插话",
              body: "你是群成员之一，@ 谁谁接，暂停和催更都在手边。",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className="animate-fade-up glass rounded-2xl px-4 py-4"
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-ink">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[0.06] text-violet-200">
                  {index === 0 ? <Sparkles size={12} /> : index === 1 ? <Settings2 size={12} /> : <ArrowRight size={12} />}
                </span>
                {item.title}
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
      <CreateGroupDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
