import { notFound } from "next/navigation";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { getGroupDetail } from "@/lib/queries/groups";
import { listMessages } from "@/lib/queries/messages";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const detail = getGroupDetail(groupId);
  if (!detail) notFound();

  const messages = listMessages(groupId, 150);

  return (
    <ChatRoom
      initialGroup={detail.group}
      initialMembers={detail.members}
      initialMessages={messages}
    />
  );
}
