import { redirect } from "next/navigation";
import { listGroups } from "@/lib/queries/groups";
import { HomeEmpty } from "@/components/shell/HomeEmpty";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const groups = listGroups();
  if (groups.length > 0) {
    redirect(`/g/${groups[0].id}`);
  }
  return <HomeEmpty />;
}
