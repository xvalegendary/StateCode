import { AuthScreen } from "@/features/auth/components/auth-screen";

type LoginPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "login";

  return <AuthScreen initialMode={mode} />;
}
