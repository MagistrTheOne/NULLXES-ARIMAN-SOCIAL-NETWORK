import { CommunityView } from "@/components/community/community-view";

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityView slug={id} />;
}
