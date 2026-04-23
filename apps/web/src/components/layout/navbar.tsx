"use client";

import Link from "next/link";
import { LayoutGrid, LogIn, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserProfilePanel } from "@/features/auth/components/user-profile-panel";
import {
  AuthSession,
  clearAuthSession,
  readAuthSession,
  syncStoredSession,
  subscribeToAuthSession,
} from "@/features/auth/lib/session";
import {
  fetchCurrentUser,
  updateProfileRegion,
  updateProfileVisibility
} from "@/features/platform/lib/platform-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/problems", label: "Problems" },
  { href: "/solve", label: "Solve" }
] as const;

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setSession(readAuthSession());
    };

    syncSession();
    const current = readAuthSession();
    if (current?.token) {
      fetchCurrentUser(current.token)
        .then((record) => {
          const next = syncStoredSession(record);
          if (next) {
            setSession(next);
          }
        })
        .catch(() => undefined);
    }

    return subscribeToAuthSession(syncSession);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!profileOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [profileOpen]);

  const handleToggleVisibility = async () => {
    if (!session?.token) {
      return;
    }

    const nextVisibility = session.profile.visibility === "public" ? "private" : "public";
    const record = await updateProfileVisibility(session.token, nextVisibility);
    const next = syncStoredSession(record);
    if (next) {
      setSession(next);
    }
  };

  const handleRegionChange = async (regionCode: string) => {
    if (!session?.token || regionCode === session.profile.regionCode) {
      return;
    }

    const record = await updateProfileRegion(session.token, regionCode);
    const next = syncStoredSession(record);
    if (next) {
      setSession(next);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setSession(null);
    setProfileOpen(false);
    router.push("/");
  };

  const avatarLabel = session?.username.replace("@", "").slice(0, 2).toUpperCase() ?? "SC";
  const visibleNavItems =
    session?.role === "admin" || session?.role === "moderator"
      ? [...navItems, { href: "/admin", label: "Admin" as const }]
      : navItems;

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="mx-auto max-w-[1320px]">
        <div
          className={cn(
            "mx-auto flex w-full flex-wrap items-center justify-between gap-3 border bg-background/88 px-4 shadow-lg backdrop-blur-xl transition-all duration-300 ease-out",
            compact ? "max-w-[1100px] py-2" : "max-w-[1240px] py-3"
          )}
        >
          <Link
            href="/"
            className="inline-flex items-center px-2 text-sm font-semibold tracking-[0.22em] uppercase text-foreground"
          >
            StateCode
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex min-h-9 items-center border px-3 text-sm transition-colors",
                    isActive
                      ? "border-border bg-muted text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle className="rounded-none" />

            {session ? (
              <div className="relative" ref={panelRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className={cn(
                    "flex min-h-10 items-center gap-3 border px-3 text-left transition-all duration-300",
                    profileOpen
                      ? "border-border bg-muted text-foreground"
                      : "border-border bg-background text-foreground"
                  )}
                >
                  <div className="flex size-8 items-center justify-center border border-current text-xs font-semibold">
                    {avatarLabel}
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <div className="truncate text-sm font-medium">{session.username}</div>
                    <div
                      className={cn(
                        "truncate text-[11px]",
                        "text-muted-foreground"
                      )}
                    >
                      {session.profile.rank}
                    </div>
                  </div>
                </button>

                {profileOpen ? (
                  <UserProfilePanel
                    session={session}
                    onToggleVisibility={handleToggleVisibility}
                    onRegionChange={handleRegionChange}
                    onLogout={handleLogout}
                  />
                ) : null}
              </div>
            ) : (
              <>
                <Button variant="ghost" className="rounded-none" asChild>
                  <Link href="/login">
                    <LogIn className="size-4" />
                    Log in
                  </Link>
                </Button>
                <Button className="rounded-none" asChild>
                  <Link href="/login?mode=signup">
                    <UserPlus className="size-4" />
                    Sign up
                  </Link>
                </Button>
              </>
            )}

            <Button variant="outline" className="hidden rounded-none md:inline-flex" asChild>
              <Link href="/">
                <LayoutGrid className="size-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
