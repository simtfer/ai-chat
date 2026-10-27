import { fail, jsonBody, ok } from "@/lib/api/http";
import { addMembers, getGroup, listMembers } from "@/lib/queries/groups";
import { getCharacter } from "@/lib/queries/characters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!getGroup(id)) return fail("群聊不存在", 404);
  return ok({ members: listMembers(id) });
}

type AddBody = { characterId?: string; characterIds?: string[] };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!getGroup(id)) return fail("群聊不存在", 404);

  const body = await jsonBody<AddBody>(request);
  const ids = new Set<string>();
  if (typeof body.characterId === "string") ids.add(body.characterId);
  for (const characterId of body.characterIds ?? []) {
    if (typeof characterId === "string") ids.add(characterId);
  }
  const valid: string[] = [];
  for (const characterId of ids) {
    if (getCharacter(characterId)) valid.push(characterId);
  }
  if (!valid.length) return fail("请选择要加入的角色");
  if (valid.length > 40) return fail("一次最多添加 40 个角色");

  return ok({ members: addMembers(id, valid) }, { status: 201 });
}
