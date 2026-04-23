"use client";

import { useEffect, useState } from "react";
import { Crown, Flame, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { leaderboardEntries as fallbackEntries } from "@/features/platform/data/catalog";
import { RegionFlag } from "@/features/platform/components/region-flag";
import { regionName } from "@/features/platform/data/regions";
import {
  fetchLeaderboard,
  LeaderboardEntry
} from "@/features/platform/lib/platform-api";

const seededFallback: LeaderboardEntry[] = fallbackEntries.map((entry) => ({
  rank: entry.rank,
  username: `@${entry.handle}`,
  region_code: "UN",
  title: "",
  rating: entry.rating,
  solved_problems: entry.solved,
  tournaments_played: entry.streak
}));

export function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(seededFallback);

  useEffect(() => {
    fetchLeaderboard()
      .then((payload) => {
        if (payload.entries.length > 0) {
          setEntries(payload.entries);
        }
      })
      .catch(() => undefined);
  }, []);

  const leader = entries[0] ?? seededFallback[0];

  return (
    <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-8">
        <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline">Leaderboard</Badge>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Top rated competitors and active streaks.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Global ranking across rated contests, daily solving, and accepted submissions.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Trophy className="size-4" />
                  Current leader
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-lg font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <RegionFlag code={leader.region_code} />
                    {leader.username}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{leader.rating} rating</div>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Flame className="size-4" />
                  Competitive titles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-lg font-semibold">{entries.filter((entry) => entry.title).length}</div>
                <div className="text-xs text-muted-foreground">players with admin-assigned titles</div>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Crown className="size-4" />
                  Rated pool
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-lg font-semibold">{entries.length}</div>
                <div className="text-xs text-muted-foreground">visible ranked competitors</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Global standings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Solved</TableHead>
                  <TableHead>Tournaments</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={`${entry.rank}-${entry.username}`}>
                    <TableCell className="font-medium">{entry.rank}</TableCell>
                    <TableCell>{entry.username}</TableCell>
                    <TableCell title={regionName(entry.region_code)}>
                      <span className="inline-flex items-center gap-2">
                        <RegionFlag code={entry.region_code} />
                        {entry.region_code}
                      </span>
                    </TableCell>
                    <TableCell>{entry.title || "Ranked"}</TableCell>
                    <TableCell>{entry.solved_problems}</TableCell>
                    <TableCell>{entry.tournaments_played}</TableCell>
                    <TableCell className="text-right">{entry.rating}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
