"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plug,
  Save,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Provider } from "@/lib/types";

const PROVIDERS: Array<{
  key: Provider;
  label: string;
  hint: string;
  detail: string;
  icon: typeof Sparkles;
}> = [
  {
    key: "demo",
    label: "演示模式",
    hint: "零配置",
    detail: "不需要 API Key，用本地生成器模拟 AI 发言，先体验节奏和界面。",
    icon: Sparkles,
  },
  {
    key: "openai",
    label: "OpenAI 兼容接口",
    hint: "真实模型",
    detail: "接入 DeepSeek、Kimi、硅基流动、Ollama 或任何兼容服务。",
    icon: Plug,
  },
];

const BASE_PRESETS: Array<{ label: string; baseUrl: string; model: string }> = [
  { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  { label: "Kimi", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  { label: "硅基流动", baseUrl: "https://api.siliconflow.cn/v1", model: "Qwen/Qwen2.5-7B-Instruct" },
  { label: "Ollama", baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
];

function Card({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="text-[14px] font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ModelSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState<Provider>("demo");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyHint, setApiKeyHint] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [temperature, setTemperature] = useState(0.95);
  const [maxTokens, setMaxTokens] = useState(220);
  const [contextBudget, setContextBudget] = useState(6000);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    models: string[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then((s) => {
        if (cancelled) return;
        setProvider(s.provider);
        setBaseUrl(s.baseUrl);
        setModel(s.model);
        setHasApiKey(s.hasApiKey);
        setApiKeyHint(s.apiKeyHint);
        setTemperature(s.temperature);
        setMaxTokens(s.maxTokens);
        setContextBudget(s.contextCharBudget);
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const keyPayload = () => {
    if (clearKey) return "";
    return apiKey.trim() || "__unchanged__";
  };

  const save = async () => {
    if (provider === "openai" && !baseUrl.trim()) {
      toast.error("请填写 Base URL");
      return;
    }
    if (provider === "openai" && !model.trim()) {
      toast.error("请填写模型名");
      return;
    }
    setSaving(true);
    try {
      const next = await api.saveSettings({
        provider,
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        apiKey: keyPayload(),
        temperature,
        maxTokens,
        contextCharBudget: contextBudget,
      });
      setProvider(next.provider);
      setBaseUrl(next.baseUrl);
      setModel(next.model);
      setHasApiKey(next.hasApiKey);
      setApiKeyHint(next.apiKeyHint);
      setTemperature(next.temperature);
      setMaxTokens(next.maxTokens);
      setContextBudget(next.contextCharBudget);
      setApiKey("");
      setClearKey(false);
      toast.success("模型设置已保存");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testSettings({
        provider,
        baseUrl: baseUrl.trim(),
        apiKey: keyPayload(),
        model: model.trim(),
      });
      setTestResult(result);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      const message = (error as Error).message;
      setTestResult({ ok: false, message, models: [] });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex items-center gap-2 text-[12.5px] text-muted">
          <Loader2 size={15} className="animate-spin" />
          正在读取设置…
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 lg:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink">模型设置</h1>
            <p className="mt-1.5 text-[12.5px] text-muted">
              所有角色默认使用这里的模型，单个角色可以在角色编辑里覆盖。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={test} disabled={testing || saving}>
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
              测试连接
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving || testing}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              保存设置
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Card title="接入方式" description="没有 Key 也能先用演示模式把整个流程跑通。">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PROVIDERS.map((item) => {
                const Icon = item.icon;
                const active = provider === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setProvider(item.key)}
                    className={cn(
                      "relative rounded-xl border p-4 text-left transition-all duration-200",
                      active
                        ? "border-brand/45 bg-brand/[0.1]"
                        : "border-white/[0.06] bg-black/15 hover:border-white/[0.12] hover:bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-lg",
                          active ? "bg-brand/25 text-violet-100" : "bg-white/[0.05] text-muted",
                        )}
                      >
                        <Icon size={15} />
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-ink">{item.label}</p>
                        <p className="text-[10px] text-muted">{item.hint}</p>
                      </div>
                      {active ? (
                        <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                          <Check size={11} strokeWidth={3} />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-muted">{item.detail}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {provider === "demo" ? (
            <Card title="演示模式" description="适合先体验自动群聊的节奏、UI 和流式输出。">
              <div className="flex gap-3 rounded-xl border border-brand/15 bg-brand/[0.05] p-3.5">
                <Wand2 size={16} className="mt-0.5 shrink-0 text-violet-300" />
                <div className="space-y-1 text-[11.5px] leading-relaxed text-muted">
                  <p>
                    每个角色会按自己的人设、口头禅和观点，从本地模板里组合出中文短句，并按打字节奏逐字输出。
                  </p>
                  <p>不需要联网、不产生费用，随时可以切到真实模型。</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="连接配置" description="任何实现了 /chat/completions 的 OpenAI 兼容服务都可以。">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] text-muted">快捷填入</span>
                  {BASE_PRESETS.map((preset) => {
                    const active = baseUrl.replace(/\/+$/, "") === preset.baseUrl;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setBaseUrl(preset.baseUrl);
                          setModel(preset.model);
                          setTestResult(null);
                        }}
                        className={cn(
                          "rounded-lg border px-2 py-1 text-[11px] transition",
                          active
                            ? "border-brand/45 bg-brand/15 text-violet-100"
                            : "border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.15] hover:text-ink-2",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <Field label="Base URL" hint="不要以 / 结尾">
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.deepseek.com/v1"
                    spellCheck={false}
                    className="font-mono text-[12.5px]"
                  />
                </Field>

                <Field
                  label="API Key"
                  hint={hasApiKey ? `已保存 ${apiKeyHint}` : "仅保存在本机"}
                >
                  <div className="relative">
                    <KeyRound
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                    <Input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setClearKey(false);
                      }}
                      placeholder={hasApiKey ? "留空表示继续使用已保存的 Key" : "sk-…"}
                      autoComplete="off"
                      spellCheck={false}
                      className="pl-8.5 pr-9 font-mono text-[12.5px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((prev) => !prev)}
                      className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-white/[0.07] hover:text-ink"
                      aria-label={showKey ? "隐藏 Key" : "显示 Key"}
                    >
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {hasApiKey ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10.5px] text-muted/80">
                        {clearKey ? "保存后将清除已保存的 Key" : "已保存的 Key 不会回显"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setClearKey((prev) => !prev);
                          setApiKey("");
                        }}
                        className={cn(
                          "text-[10.5px] transition",
                          clearKey
                            ? "text-rose-300 hover:text-rose-200"
                            : "text-muted hover:text-rose-300",
                        )}
                      >
                        {clearKey ? "撤销清除" : "清除已保存的 Key"}
                      </button>
                    </div>
                  ) : null}
                </Field>

                <Field label="模型名" hint="也可以按角色单独覆盖">
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="deepseek-chat"
                    spellCheck={false}
                    className="font-mono text-[12.5px]"
                  />
                </Field>

                {testResult ? (
                  <div
                    className={cn(
                      "rounded-xl border px-3.5 py-3 text-[11.5px] leading-relaxed",
                      testResult.ok
                        ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
                        : "border-rose-400/20 bg-rose-400/[0.06] text-rose-200",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {testResult.ok ? (
                        <Check size={14} className="mt-0.5 shrink-0" />
                      ) : (
                        <Plug size={14} className="mt-0.5 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.models.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {testResult.models.slice(0, 12).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setModel(item)}
                            className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-100 transition hover:bg-emerald-400/20"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-black/15 px-3 py-2 text-[10.5px] text-muted">
                  <ShieldCheck size={13} className="shrink-0 text-emerald-300/80" />
                  Key 只保存在本机 SQLite（.data/ai-chat.db）中，接口不会返回明文。
                </div>
              </div>
            </Card>
          )}

          <Card title="生成参数" description="影响所有没有单独覆盖模型的角色。">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={13} className="text-muted" />
                    <span className="text-[12.5px] text-ink-2">创造力 (temperature)</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted">{temperature.toFixed(2)}</span>
                </div>
                <Slider
                  value={temperature}
                  min={0}
                  max={2}
                  step={0.05}
                  onValueChange={setTemperature}
                />
                <p className="text-[10.5px] text-muted/80">
                  越高越跳脱，越低越稳定。群聊建议 0.8–1.1。
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="单条最大 tokens" hint="32–2000">
                  <Input
                    type="number"
                    value={maxTokens}
                    min={32}
                    max={2000}
                    step={10}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="font-mono text-[12.5px]"
                  />
                </Field>
                <Field label="上下文预算（字）" hint="1000–20000">
                  <Input
                    type="number"
                    value={contextBudget}
                    min={1000}
                    max={20000}
                    step={500}
                    onChange={(e) => setContextBudget(Number(e.target.value))}
                    className="font-mono text-[12.5px]"
                  />
                </Field>
              </div>
              <p className="text-[10.5px] leading-relaxed text-muted/80">
                上下文预算决定每次发言会带上多少历史消息；预算越小越省钱，但 AI 越容易忘记前文。
              </p>
            </div>
          </Card>

          <div className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.015] px-5 py-4">
            <p className="text-[11px] text-muted">改完记得保存，正在进行的群聊会从下一句开始使用新配置。</p>
            <Button variant="primary" size="sm" onClick={save} disabled={saving || testing}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              保存设置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
