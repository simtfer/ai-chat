import { jsonBody, ok } from "@/lib/api/http";
import { mockEcho } from "@/lib/llm/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MockMessage = { role?: string; content?: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A tiny OpenAI-compatible endpoint. Pointing the app at
 * `/api/mock/v1` exercises the real fetch + SSE parsing + abort path
 * without spending tokens.
 */
export async function POST(request: Request) {
  const body = await jsonBody<{ messages?: MockMessage[]; stream?: boolean; model?: string }>(request);
  const messages = body.messages ?? [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const text = mockEcho(lastUser);
  const model = body.model || "mock-1";

  if (body.stream === false) {
    return ok({
      id: `chatcmpl-mock-${Date.now()}`,
      object: "chat.completion",
      model,
      choices: [
        { index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" },
      ],
      usage: { prompt_tokens: 10, completion_tokens: text.length },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // client is gone
        }
      };
      const id = `chatcmpl-mock-${Date.now()}`;
      const base = { id, object: "chat.completion.chunk", model };
      send({ ...base, choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }] });
      for (let i = 0; i < text.length; i += 2) {
        await sleep(18);
        send({
          ...base,
          choices: [{ index: 0, delta: { content: text.slice(i, i + 2) }, finish_reason: null }],
        });
      }
      send({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
      try {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {
        // already closed
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
