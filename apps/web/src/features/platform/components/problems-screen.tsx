"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, FolderCode, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readAuthSession } from "@/features/auth/lib/session";
import {
  problemCategories as fallbackCategories,
  problems as fallbackProblems
} from "@/features/platform/data/catalog";
import { fetchProblems, ProblemRecord } from "@/features/platform/lib/platform-api";

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
  created_at: new Date().toISOString(),
  languages: ["C++17", "Rust", "Python 3.12"],
  solved_by_current_user: false
}));

export function ProblemsScreen() {
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [problems, setProblems] = useState<ProblemRecord[]>(seededProblems);

  useEffect(() => {
    const session = readAuthSession();
    fetchProblems(session?.token)
      .then((payload) => {
        setCategories(payload.categories);
        setProblems(payload.problems);
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-8">
        <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline">Problems</Badge>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Browse the full programming problem catalog.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                Filter by category, difficulty, and current popularity before moving into solve
                mode.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 6).map((category) => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {problems.map((problem) => (
            <Card key={problem.problem_id} className="border bg-card">
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">{problem.problem_id}</div>
                    <CardTitle className="text-base">{problem.title}</CardTitle>
                  </div>
                  <Badge>{problem.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{problem.category}</Badge>
                  {problem.solved_by_current_user ? (
                    <Badge
                      variant="outline"
                      className="rounded-none border-emerald-500/40 text-emerald-500"
                    >
                      <span className="mr-1 size-2 bg-emerald-500" />
                      solved
                    </Badge>
                  ) : null}
                  <Badge variant="outline">Difficulty {problem.difficulty}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TimerReset className="size-4" />
                    {problem.time_limit}
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderCode className="size-4" />
                    {problem.solved_count} solved
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {problem.languages.map((language) => (
                    <Badge key={`${problem.problem_id}-${language}`} variant="outline">
                      {language}
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" className="w-full justify-between rounded-none" asChild>
                  <a href="/solve">
                    Open in solve
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
