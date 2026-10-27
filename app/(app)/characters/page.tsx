import { CharacterLibrary } from "@/components/characters/CharacterLibrary";
import { listCharacters } from "@/lib/queries/characters";

export const dynamic = "force-dynamic";

export default async function CharactersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const characters = listCharacters();

  return (
    <CharacterLibrary
      initial={characters}
      initialEditId={typeof edit === "string" ? edit : null}
    />
  );
}
