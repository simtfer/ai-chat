import { fail, isAbortError, jsonBody } from "@/lib/api/http";
import { pickSpeaker } from "@/lib/chat/speaker";
import { cleanupStaleStreaming, hasStreamingMessage } from "@/lib/db";
import { demoReply, streamDemo } from "@/lib/llm/demo";
import { streamOpenAI } from "@/lib/llm/openai";
import { friendlyError, type LlmConfig, type LlmError, type StreamChunk, type Usage } from "@/lib/llm/types";
import { buildChatMessages, sanitizeReply } from "@/lib/prompts/chat";
import { getGroup, listMembers, touchGroupAfterAi } from "@/lib/queries/groups";
import { createMessage, listMessages, updateMessage } from "@/lib/queries/messages";
import { getSettingsRaw } from "@/lib/queries/settings";
import type { MessageStatus, TurnReason } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

const encoder = new TextEncoder();

export async function POST(request: Request, ctx: Ctx) {
  const { id: groupId } = await ctx.params;
  const group = getGroup(groupId);
  if (!group) return fail("群聊不存在", 404);

  const body = await jsonBody<{ characterId?: string; reason?: TurnReason }>(request);
  cleanupStaleStreaming(groupId);
  if (hasStreamingMessage(groupId)) return fail("上一条消息还在生成中", 409);

  const members = listMembers(groupId);
  if (!members.length) return fail("这个群里还没有 AI，先添加几个角色", 400);

  const recent = listMessages(groupId, 80);
  const isAuto = body.reason === "auto";
  if (isAuto && !group.isRunning) return fail("自动聊天已暂停", 409);

  let characterId = body.characterId;
  if (isAuto) {
    const requested = characterId
      ? members.find((m) => m.character.id === characterId)
      : undefined;
    const ready = requested?.enabled
      ? requested.lastSpokeAt == null ||
        Date.now() - requested.lastSpokeAt >= requested.cooldownMs
      : false;
    if (!ready) {
      const pick = pickSpeaker({ members, messages: recent, now: Date.now() });
      if (!pick.characterId) {
        return Response.json(
          { error: "所有 AI 都在冷却中", waitMs: pick.waitMs ?? 4000 },
          { status: 429 },
        );
      }
      characterId = pick.characterId;
    }
  } else if (!characterId) {
    const pick = pickSpeaker({ members, messages: recent, now: Date.now(), allowSameSpeaker: true });
    characterId = pick.characterId ?? undefined;
  }
  if (!characterId) return fail("暂时没有 AI 可以发言", 400);

  const member = members.find((m) => m.character.id === characterId);
  if (!member) return fail("该角色不在这个群里", 400);
  if (!member.enabled) return fail(`${member.character.name} 已被静音`, 400);

  const settings = getSettingsRaw();
  if (settings.provider === "openai" && !settings.baseUrl.trim()) {
    return fail("请先在设置里填写模型 Base URL", 400);
  }

  const prompt = buildChatMessages({
    group,
    members,
    messages: recent,
    self: member.character,
    budgetChars: settings.contextCharBudget,
  });
  const modelName = member.character.modelOverride || settings.model;
  const config: LlmConfig = {
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: modelName,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
  };

  const message = createMessage({
    groupId,
    senderType: "ai",
    characterId,
    content: "",
    status: "streaming",
    model: modelName,
  });

  const abort = new AbortController();
  const onAbort = () => abort.abort();
  request.signal.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => abort.abort(), 90_000);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send("meta", {
        messageId: message.id,
        characterId,
        characterName: member.character.name,
        model: modelName,
      });

      let text = "";
      let usage: Usage | undefined;
      let status: MessageStatus = "complete";
      let errorText: string | null = null;

      try {
        const iterator: AsyncGenerator<StreamChunk> =
          settings.provider === "demo"
            ? streamDemo(demoReply({ self: member.character, group, members, recent }), {
                signal: abort.signal,
              })
            : streamOpenAI(config, prompt, abort.signal);

        for await (const chunk of iterator) {
          if (chunk.usage) usage = chunk.usage;
          if (chunk.text) {
            text += chunk.text;
            send("delta", { text: chunk.text });
          }
        }

        if (!text.trim()) {
          status = "error";
          errorText = "模型没有返回内容";
        } else {
          text = sanitizeReply(text, member.character.name);
        }
      } catch (error) {
        if (isAbortError(error)) {
          status = text.trim() ? "interrupted" : "error";
          errorText = "生成被中断";
        } else {
          status = text.trim() ? "interrupted" : "error";
          errorText = friendlyError(error);
          console.error("[turn] model error:", (error as LlmError)?.message ?? error);
        }
      } finally {
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", onAbort);
        const saved = updateMessage(message.id, {
          content: text,
          status,
          error: errorText,
          promptTokens: usage?.promptTokens ?? null,
          completionTokens: usage?.completionTokens ?? null,
        });
        touchGroupAfterAi(groupId, characterId!, Date.now());

        if (status === "error" || status === "interrupted") {
          send("error", { message: errorText ?? "生成失败", messageRecord: saved });
        } else {
          send("done", { message: saved });
        }

        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
        abort.abort();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
