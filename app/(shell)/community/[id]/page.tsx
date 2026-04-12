export default async function CommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h1 className="font-mono text-lg text-foreground">Community</h1>
      <p className="mt-2 font-mono text-sm text-muted-foreground">{id}</p>
    </div>
  );
}
