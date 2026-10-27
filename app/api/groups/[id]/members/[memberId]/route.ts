import { fail, jsonBody, ok } from "@/lib/api/http";
import { removeMember, updateMember } from "@/lib/queries/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { memberId } = await ctx.params;
  const body = await jsonBody<Record<string, unknown>>(request);
  const patch: { speakWeight?: number; cooldownMs?: number; enabled?: boolean } = {};
  if (typeof body.speakWeight === "number") patch.speakWeight = body.speakWeight;
  if (typeof body.cooldownMs === "number") patch.cooldownMs = body.cooldownMs;
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;

  const member = updateMember(memberId, patch);
  if (!member) return fail("成员不存在", 404);
  return ok({ member });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { memberId } = await ctx.params;
  removeMember(memberId);
  return ok({ deleted: true });
}
