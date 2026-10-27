import { fail, jsonBody, ok } from "@/lib/api/http";
import { createGroup, listGroups } from "@/lib/queries/groups";
import { getGroupDetail } from "@/lib/queries/groups";
import { DEFAULT_PACE } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ groups: listGroups() });
}

type CreateBody = {
  title?: string;
  topic?: string;
  minGapMs?: number;
  maxGapMs?: number;
  isRunning?: boolean;
  characterIds?: string[];
};

export async function POST(request: Request) {
  const body = await jsonBody<CreateBody>(request);
  const title = (body.title ?? "").trim();
  if (!title) return fail("群聊名称不能为空");
  if (title.length > 40) return fail("群聊名称太长");

  const characterIds = Array.isArray(body.characterIds)
    ? body.characterIds.filter((id): id is string => typeof id === "string").slice(0, 60)
    : [];

  const group = createGroup({
    title,
    topic: (body.topic ?? "").trim().slice(0, 200),
    minGapMs: body.minGapMs ?? DEFAULT_PACE.minGapMs,
    maxGapMs: body.maxGapMs ?? DEFAULT_PACE.maxGapMs,
    isRunning: body.isRunning ?? true,
    characterIds,
  });

  return ok(getGroupDetail(group.id), { status: 201 });
}
