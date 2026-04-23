"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readAuthSession } from "@/features/auth/lib/session";
import { solveTracks } from "@/features/platform/data/catalog";
import {
  fallbackLanguages,
  fallbackProblemCategories,
  fallbackProblemRecords
} from "@/features/platform/lib/problem-fallbacks";
import { fetchProblems, ProblemRecord } from "@/features/platform/lib/platform-api";

const difficultyLevels = Array.from({ length: 10 }, (_, index) => index + 1);

export function SolveScreen() {
  const [categories, setCategories] = useState<string[]>(fallbackProblemCategories);
  const [problems, setProblems] = useState<ProblemRecord[]>(fallbackProblemRecords);
  const [languages, setLanguages] = useState<string[]>(fallbackLanguages);

  useEffect(() => {
    const session = readAuthSession();
    fetchProblems(session?.token)
      .then((payload) => {
        setCategories(payload.categories);
        setProblems(payload.problems);
        setLanguages(payload.supported_languages);
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
              Choose a task, then open its workspace.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Start opens a dedicated problem page at /workspace/problem-id with statement on the
              left and a syntax-highlighted editor on the right.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <aside className="space-y-6">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge key={category} variant="outline">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Difficulty 1-10</div>
                  <div className="grid grid-cols-5 gap-2">
                    {difficultyLevels.map((level) => (
                      <Button key={level} variant="outline" className="justify-center rounded-none">
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Languages</div>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((language) => (
                      <Badge key={language} variant="outline">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
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
          </aside>

          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Suggested tasks to solve</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {problems.map((problem) => (
                <div
                  key={problem.problem_id}
                  className="flex flex-col gap-4 border p-4 transition-colors hover:bg-muted md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{problem.title}</span>
                      <Badge variant="outline">{problem.problem_id}</Badge>
                      <Badge>{problem.status}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{problem.category}</span>
                      {problem.solved_by_current_user ? (
                        <Badge
                          variant="outline"
                          className="rounded-none border-emerald-500/40 text-emerald-500"
                        >
                          <span className="mr-1 size-2 bg-emerald-500" />
                          solved
                        </Badge>
                      ) : null}
                      <span>
                        | Difficulty {problem.difficulty} | {problem.time_limit} |{" "}
                        {problem.solved_count} solved
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {problem.languages.map((language) => (
                        <Badge key={`${problem.problem_id}-${language}`} variant="outline">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button className="rounded-none" asChild>
                    <Link href={`/workspace/${encodeURIComponent(problem.problem_id)}`}>
                      Start
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
