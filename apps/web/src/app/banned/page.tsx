"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AuthSession,
  clearAuthSession,
  readAuthSession,
  subscribeToAuthSession
} from "@/features/auth/lib/session";

export default function BannedPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setSession(readAuthSession());
    };

    syncSession();
    return subscribeToAuthSession(syncSession);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.replace("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 md:px-10">
      <section className="w-full max-w-[720px] border bg-background">
        <div className="border-b px-6 py-5 md:px-8">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <ShieldAlert className="size-4 text-yellow-500" />
            Access restricted
          </div>
        </div>

        <div className="space-y-8 px-6 py-8 md:px-8 md:py-10">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Account suspended
            </h1>
            <p className="max-w-[48ch] text-sm leading-7 text-muted-foreground md:text-base">
              {session?.username
                ? `${session.username}, access to StateCode is currently blocked.`
                : "Access to StateCode is currently blocked for this account."}{" "}
              If you think this was applied by mistake, contact platform administration.
            </p>
          </div>

          <div className="grid gap-3 border p-4 text-sm md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Status
              </div>
              <div className="font-medium text-foreground">Banned</div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Account
              </div>
              <div className="font-medium text-foreground">
                {session?.username ?? "Unknown user"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Access
              </div>
              <div className="font-medium text-foreground">Disabled</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="rounded-none sm:min-w-40" onClick={handleLogout}>
              Log out
            </Button>
            <Button variant="outline" className="rounded-none sm:min-w-40" asChild>
              <Link href="mailto:admin@statecode.com">Contact admin</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
