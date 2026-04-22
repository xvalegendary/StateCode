"use client";

import { useMemo } from "react";
import { Eye, EyeOff, ShieldCheck, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AuthSession,
  getRankPalette,
  rankSystemSummary,
  ratingSystemSummary,
  readAuthSession
} from "@/features/auth/lib/session";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function buildFallbackSession(handle: string): AuthSession {
  const username = handle.startsWith("@") ? handle : `@${handle}`;

  return {
    user_id: "guest-profile",
    login: username.replace("@", ""),
    username,
    token: "",
    message: "",
    profile: {
      profileUrl: `https://statecode.dev/${username}`,
      tournamentsPlayed: 0,
      solvedProblems: 0,
      visibility: "public",
      leaderboardRating: null,
      leaderboardPosition: null,
      lastOnlineAt: new Date().toISOString(),
      joinedAt: new Date().toISOString(),
      calibrationSolved: 0,
      calibrationTarget: 5,
      rank: "Calibrating"
    }
  };
}

export function ProfileScreen({ handle }: { handle: string }) {
  const currentSession = useMemo(() => readAuthSession(), []);
  const session = useMemo(() => {
    if (currentSession && currentSession.username === handle) {
      return currentSession;
    }

    return buildFallbackSession(handle);
  }, [currentSession, handle]);

  const ownsProfile = currentSession?.username === handle;
  const isPrivate = session.profile.visibility === "private" && !ownsProfile;
  const avatarLabel = session.username.replace("@", "").slice(0, 2).toUpperCase();

  if (isPrivate) {
    return (
      <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
        <section className="mx-auto flex max-w-[1320px] flex-col gap-6 border p-8">
          <div className="space-y-3">
            <Badge variant="outline">Private profile</Badge>
            <h1 className="text-4xl font-semibold tracking-tight">{session.username}</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              This profile is set to private. Only the account owner can view competitive details.
            </p>
          </div>
          <Button className="w-fit rounded-none" asChild>
            <Link href="/solve">Open solve workspace</Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
      <section className="mx-auto flex max-w-[1320px] flex-col gap-10">
        <div className="grid gap-8 border p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex size-16 items-center justify-center border bg-muted text-lg font-semibold">
                {avatarLabel}
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-4xl font-semibold tracking-tight">{session.username}</div>
                  <div className="text-sm text-muted-foreground">{session.profile.profileUrl}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("rounded-none", getRankPalette(session.profile.rank))}>
                    {session.profile.rank}
                  </Badge>
                  <Badge variant="outline" className="rounded-none">
                    {session.profile.visibility === "public" ? (
                      <>
                        <Eye className="size-3.5" />
                        Public
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3.5" />
                        Private
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rating</div>
                <div className="mt-2 text-2xl font-semibold">
                  {session.profile.leaderboardRating ?? "Calibrating"}
                </div>
              </div>
              <div className="border p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Leaderboard</div>
                <div className="mt-2 text-2xl font-semibold">
                  {session.profile.leaderboardPosition ? `#${session.profile.leaderboardPosition}` : "Pending"}
                </div>
              </div>
              <div className="border p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Solved</div>
                <div className="mt-2 text-2xl font-semibold">{session.profile.solvedProblems}</div>
              </div>
              <div className="border p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tournaments</div>
                <div className="mt-2 text-2xl font-semibold">{session.profile.tournamentsPlayed}</div>
              </div>
            </div>
          </div>

          <div className="border p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4" />
              Account metadata
            </div>
            <div className="mt-6 grid gap-5 text-sm">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Registered</div>
                <div className="mt-1 font-medium">{formatDate(session.profile.joinedAt)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last online</div>
                <div className="mt-1 font-medium">{formatDate(session.profile.lastOnlineAt)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Calibration</div>
                <div className="mt-1 font-medium">
                  {session.profile.calibrationSolved}/{session.profile.calibrationTarget} solved tasks
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button className="rounded-none" asChild>
                <Link href="/solve">Solve tasks</Link>
              </Button>
              <Button variant="outline" className="rounded-none" asChild>
                <Link href="/leaderboard">Open leaderboard</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="border p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="size-4" />
              Rating model
            </div>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              {ratingSystemSummary.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
            <Separator className="my-6" />
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rank tiers</div>
            <div className="mt-4 grid gap-2">
              {rankSystemSummary.map((tier) => (
                <div key={tier.rank} className="flex items-center justify-between border p-3 text-sm">
                  <span className={cn("font-medium", getRankPalette(tier.rank))}>{tier.rank}</span>
                  <span className="text-muted-foreground">{tier.minRating}+</span>
                </div>
              ))}
            </div>
          </section>

          <section className="border p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Swords className="size-4" />
              Competitive path
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="border p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Calibration</div>
                <div className="mt-2 text-lg font-semibold">5 tasks</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Finish the first five accepted problems to unlock visible rating.
                </p>
              </div>
              <div className="border p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rated climb</div>
                <div className="mt-2 text-lg font-semibold">Difficulty weighted</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Harder solved tasks and sustained activity push the score higher.
                </p>
              </div>
              <div className="border p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Leaderboard</div>
                <div className="mt-2 text-lg font-semibold">Live rank</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Once calibrated, the account receives placement inside the rated ladder.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
