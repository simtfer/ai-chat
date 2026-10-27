import { fail, jsonBody, ok } from "@/lib/api/http";
import {
  deleteGroup,
  getGroupDetail,
  updateGroup,
  type GroupPatch,
} from "@/lib/queries/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const detail = getGroupDetail(id);
  if (!detail) return fail("群聊不存在", 404);
  return ok(detail);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await jsonBody<Record<string, unknown>>(request);
  const patch: GroupPatch = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) return fail("群聊名称不能为空");
    patch.title = title.slice(0, 40);
  }
  if (typeof body.topic === "string") patch.topic = body.topic.trim().slice(0, 200);
  if (typeof body.minGapMs === "number") patch.minGapMs = Math.max(500, Math.round(body.minGapMs));
  if (typeof body.maxGapMs === "number") patch.maxGapMs = Math.max(800, Math.round(body.maxGapMs));
  if (typeof body.isRunning === "boolean") patch.isRunning = body.isRunning;

  const group = updateGroup(id, patch);
  if (!group) return fail("群聊不存在", 404);
  return ok({ group });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  deleteGroup(id);
  return ok({ deleted: true });
}
