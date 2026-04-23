import { WorkspaceScreen } from "@/features/platform/components/workspace-screen";

export default async function WorkspacePage({
  params
}: {
  params: Promise<{ problemId: string }>;
}) {
  const { problemId } = await params;

  return <WorkspaceScreen problemId={problemId} />;
}
