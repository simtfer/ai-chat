import { listGroups } from "@/lib/queries/groups";
import { AppShell } from "@/components/shell/AppShell";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const groups = listGroups();
  return <AppShell groups={groups}>{children}</AppShell>;
}
