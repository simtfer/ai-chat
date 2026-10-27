import { fail, jsonBody, ok } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { getGroup } from "@/lib/queries/groups";
import { createMessage, listMessages } from "@/lib/queries/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!getGroup(id)) return fail("群聊不存在", 404);
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? 120);
  const limit = Math.min(300, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 120));
  const beforeRaw = Number(url.searchParams.get("before") ?? 0);
  const before = Number.isFinite(beforeRaw) && beforeRaw > 0 ? beforeRaw : undefined;
  return ok({ messages: listMessages(id, limit, before) });
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!getGroup(id)) return fail("群聊不存在", 404);
  const body = await jsonBody<{ content?: string }>(request);
  const content = (body.content ?? "").trim();
  if (!content) return fail("消息不能为空");
  if (content.length > 2000) return fail("消息太长了");

  const message = createMessage({ groupId: id, senderType: "user", content });
  getDb().prepare("UPDATE groups SET updated_at = ? WHERE id = ?").run(Date.now(), id);
  return ok({ message }, { status: 201 });
}
