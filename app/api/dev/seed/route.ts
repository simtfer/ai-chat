import { fail, ok } from "@/lib/api/http";
import { generateCrowd } from "@/lib/persona/generator";
import { createCharacter, listCharacters } from "@/lib/queries/characters";
import { createGroup, getGroupDetail } from "@/lib/queries/groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return fail("仅在开发环境可用", 403);
  }

  let characters = listCharacters();
  if (characters.length < 3) {
    const drafts = generateCrowd(3, characters.map((c) => c.name));
    for (const draft of drafts) {
      characters.push(createCharacter(draft));
    }
  }

  const group = createGroup({
    title: "深夜编辑部",
    topic: "聊聊最近让人上火的小事",
    minGapMs: 1200,
    maxGapMs: 3000,
    isRunning: false,
    characterIds: characters.slice(0, 3).map((c) => c.id),
  });

  return ok(getGroupDetail(group.id), { status: 201 });
}
