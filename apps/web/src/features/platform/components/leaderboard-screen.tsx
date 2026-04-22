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
import { leaderboardEntries } from "@/features/platform/data/catalog";

export function LeaderboardScreen() {
  const leader = leaderboardEntries[0];

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
                <div className="text-lg font-semibold">{leader.handle}</div>
                <div className="text-xs text-muted-foreground">{leader.rating} rating</div>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Flame className="size-4" />
                  Best streak
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-lg font-semibold">32 days</div>
                <div className="text-xs text-muted-foreground">without breaking submissions</div>
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
                <div className="text-lg font-semibold">18,420</div>
                <div className="text-xs text-muted-foreground">active competitors</div>
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
                  <TableHead>Handle</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Solved</TableHead>
                  <TableHead>Streak</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardEntries.map((entry) => (
                  <TableRow key={entry.handle}>
                    <TableCell className="font-medium">{entry.rank}</TableCell>
                    <TableCell>{entry.handle}</TableCell>
                    <TableCell>{entry.country}</TableCell>
                    <TableCell>{entry.solved}</TableCell>
                    <TableCell>{entry.streak}d</TableCell>
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
