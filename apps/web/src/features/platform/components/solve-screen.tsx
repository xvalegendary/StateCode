"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  problemCategories as fallbackCategories,
  problems as fallbackProblems,
  solveTracks
} from "@/features/platform/data/catalog";
import { fetchProblems, ProblemRecord } from "@/features/platform/lib/platform-api";

const difficultyLevels = Array.from({ length: 10 }, (_, index) => index + 1);
const seededProblems: ProblemRecord[] = fallbackProblems.map((problem) => ({
  problem_id: problem.id,
  slug: problem.title.toLowerCase().replaceAll(" ", "-"),
  title: problem.title,
  category: problem.category,
  difficulty: problem.difficulty,
  status: problem.status,
  solved_count: problem.solvedCount,
  time_limit: problem.timeLimit,
  statement: problem.title,
  created_at: new Date().toISOString()
}));

export function SolveScreen() {
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [problems, setProblems] = useState<ProblemRecord[]>(seededProblems);

  useEffect(() => {
    fetchProblems()
      .then((payload) => {
        setCategories(payload.categories);
        setProblems(payload.problems);
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-8">
        <div className="space-y-3 border-b pb-6">
          <Badge variant="outline">Solve</Badge>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Pick a category, choose a difficulty, start solving.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              This workspace is for selecting tasks by topic and target difficulty from 1 to 10.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Categories</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge key={category} variant="outline">
                    {category}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Difficulty 1-10</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-5 gap-2">
                {difficultyLevels.map((level) => (
                  <Button key={level} variant="outline" className="justify-center rounded-none">
                    {level}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Tracks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {solveTracks.map((track) => (
                  <div key={track.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{track.name}</div>
                      <Badge variant="outline">{track.range}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{track.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Suggested tasks to solve</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {problems.map((problem) => (
                <div
                  key={problem.problem_id}
                  className="flex flex-col gap-3 border-b pb-4 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{problem.title}</div>
                      <Badge variant="outline">{problem.problem_id}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {problem.category} · Difficulty {problem.difficulty} · {problem.time_limit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{problem.status}</Badge>
                    <Button className="rounded-none">Start</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
