import { ProfileScreen } from "@/features/profile/components/profile-screen";

export default async function HandlePage({
  params
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  return <ProfileScreen handle={decodeURIComponent(handle)} />;
}
