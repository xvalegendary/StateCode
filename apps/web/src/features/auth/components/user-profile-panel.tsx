"use client";

import Link from "next/link";
import { Eye, EyeOff, LogOut, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AuthSession,
  getRankPalette,
  rankSystemSummary,
  ratingSystemSummary
} from "@/features/auth/lib/session";
import { RegionFlag } from "@/features/platform/components/region-flag";
import { regionName, regionOptions } from "@/features/platform/data/regions";
import { cn } from "@/lib/utils";

function parseDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatRelative(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) return "—";

  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
}

export function UserProfilePanel({
  session,
  onToggleVisibility,
  onRegionChange,
  onLogout
}: {
  session: AuthSession;
  onToggleVisibility: () => void;
  onRegionChange: (regionCode: string) => void;
  onLogout: () => void;
}) {
  const { profile } = session;
  const avatarLabel = session.username.replace("@", "").slice(0, 2).toUpperCase();

  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[340px] border bg-background p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center border bg-muted text-sm font-semibold">
            {avatarLabel}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{session.username}</span>
              <RegionFlag code={profile.regionCode} />
              <Badge variant="outline" className={cn("border-none px-0 text-xs", getRankPalette(profile.rank))}>
                {profile.rank}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">{session.title || session.role}</div>
            <div className="text-xs text-muted-foreground">{profile.profileUrl}</div>
          </div>
        </div>
        <Button variant="ghost" className="rounded-none px-2" onClick={onLogout}>
          <LogOut className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-y py-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tournaments</div>
          <div className="mt-1 font-semibold">{profile.tournamentsPlayed}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Solved</div>
          <div className="mt-1 font-semibold">{profile.solvedProblems}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Leaderboard</div>
          <div className="mt-1 font-semibold">
            {profile.leaderboardPosition ? `#${profile.leaderboardPosition}` : "Pending"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rating</div>
          <div className="mt-1 font-semibold">
            {profile.rank === "Calibrating"
              ? `${profile.calibrationSolved}/${profile.calibrationTarget}`
              : profile.leaderboardRating}
          </div>
        </div>
      </div>

      <div className="space-y-3 py-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">Profile visibility</div>
            <div className="text-xs text-muted-foreground">
              {profile.visibility === "public" ? "Visible by leaderboard and direct link." : "Visible only to you."}
            </div>
          </div>
          <Button variant="outline" className="rounded-none" onClick={onToggleVisibility}>
            {profile.visibility === "public" ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {profile.visibility === "public" ? "Set private" : "Set public"}
          </Button>
        </div>

        <label className="block space-y-2">
          <span className="font-medium">Region</span>
          <select
            value={profile.regionCode}
            onChange={(event) => onRegionChange(event.target.value)}
            className="h-10 w-full rounded-none border bg-background px-3 text-sm outline-none"
          >
            {regionOptions.map((region) => (
              <option key={region.code} value={region.code}>
                {region.code} - {region.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>
            <div className="uppercase tracking-[0.18em]">Last online</div>
            <div className="mt-1 text-sm text-foreground">{formatRelative(profile.lastOnlineAt)}</div>
          </div>
          <div>
            <div className="uppercase tracking-[0.18em]">Joined</div>
            <div className="mt-1 text-sm text-foreground">{formatDate(profile.joinedAt)}</div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3 py-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="size-4" />
          Rating system
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          {ratingSystemSummary.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {rankSystemSummary.map((item) => (
            <div key={item.rank} className="flex items-center justify-between gap-3 border-b pb-1">
              <span className={cn("font-medium", getRankPalette(item.rank))}>{item.rank}</span>
              <span className="text-muted-foreground">{item.minRating}+</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button variant="outline" className="w-full rounded-none" asChild>
          <Link href={`/${session.username}`}>Open profile</Link>
        </Button>
      </div>
      {session.role === "admin" || session.role === "moderator" ? (
        <Button variant="outline" className="mt-2 w-full rounded-none" asChild>
          <Link href="/admin">Open admin panel</Link>
        </Button>
      ) : null}
    </div>
  );
}
