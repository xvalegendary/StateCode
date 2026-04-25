"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readAuthSession, syncStoredSession } from "@/features/auth/lib/session";
import { CodeEditor } from "@/features/platform/components/code-editor";
import { getEditorLanguage } from "@/features/platform/data/language-associations";
import {
  fallbackLanguages,
  fallbackProblemRecords
} from "@/features/platform/lib/problem-fallbacks";
import {
  completeProblem,
  fetchProblems,
  ProblemRecord,
  runSubmission,
  SandboxRunResult
} from "@/features/platform/lib/platform-api";

function buildProblemStatement(problem: ProblemRecord) {
  return problem.statement.length > problem.title.length
    ? problem.statement
    : `You are given input for "${problem.title}". Implement an efficient solution for the stated category and difficulty. Read from stdin and write to stdout.`;
}

function findProblem(problems: ProblemRecord[], problemId: string) {
  const normalized = decodeURIComponent(problemId).toLowerCase();
  return problems.find(
    (problem) =>
      problem.problem_id.toLowerCase() === normalized ||
      problem.slug.toLowerCase() === normalized
  ) ?? null;
}

export function WorkspaceScreen({ problemId }: { problemId: string }) {
  const [problem, setProblem] = useState<ProblemRecord | null>(
    findProblem(fallbackProblemRecords, problemId)
  );
  const [languages, setLanguages] = useState<string[]>(problem?.languages ?? fallbackLanguages);
  const [selectedLanguage, setSelectedLanguage] = useState(problem?.languages[0] ?? "C++17");
  const [code, setCode] = useState(getEditorLanguage(selectedLanguage).template);
  const [stdin, setStdin] = useState("5\n1 2 3 4 5\n");
  const [expectedStdout, setExpectedStdout] = useState("5\n");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SandboxRunResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    fetchProblems()
      .then((payload) => {
        const nextProblem = findProblem(payload.problems, problemId);
        setLanguages(payload.supported_languages);

        if (!nextProblem) {
          setProblem(null);
          return;
        }

        const nextLanguage = nextProblem.languages[0] ?? payload.supported_languages[0] ?? "C++17";
        setProblem(nextProblem);
        setSelectedLanguage(nextLanguage);
        setCode(getEditorLanguage(nextLanguage).template);
      })
      .catch(() => undefined);
  }, [problemId]);

  const selectableLanguages = problem?.languages.length ? problem.languages : languages;

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value;
    setSelectedLanguage(nextLanguage);
    setCode(getEditorLanguage(nextLanguage).template);
  };

  const handleSubmit = async () => {
    if (!problem) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setCompletionError(null);
    setResult(null);

    try {
      const payload = await runSubmission({
        problemId: problem.problem_id,
        language: selectedLanguage,
        source: code,
        stdin,
        expectedStdout,
        timeLimitMs: 2000,
        memoryLimitMb: 256
      });
      setResult(payload);
      if (payload.verdict === "accepted") {
        const session = readAuthSession();
        if (session?.token) {
          try {
            const user = await completeProblem(session.token, problem);
            syncStoredSession(user);
            setSolved(true);
          } catch (error) {
            setCompletionError(
              error instanceof Error ? error.message : "profile progress update failed"
            );
          }
        } else {
          setCompletionError("Login to save solved progress.");
        }
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "sandbox request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!problem) {
    return (
      <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
        <section className="mx-auto max-w-[1320px] border p-8">
          <Badge variant="outline">Workspace</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Problem not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This problem does not exist or the backend catalog is unavailable.
          </p>
          <Button className="mt-6 rounded-none" asChild>
            <Link href="/solve">Back to solve</Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
      <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
                <Badge variant="outline">Workspace / {problem.problem_id}</Badge>
                {solved ? <Badge>solved</Badge> : null}
            <div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{problem.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                {problem.category} | Difficulty {problem.difficulty} | {problem.time_limit} |{" "}
                {problem.solved_count} solved
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="h-10 border bg-background px-3 text-sm outline-none"
            >
              {selectableLanguages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <Button variant="outline" className="rounded-none" asChild>
              <Link href="/solve">All tasks</Link>
            </Button>
            <Button className="rounded-none" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Running..." : "Submit"}
            </Button>
          </div>
        </div>

        <div className="grid min-h-[780px] border bg-card xl:grid-cols-[0.9fr_1.1fr]">
          <section className="border-b p-5 xl:border-b-0 xl:border-r">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{problem.problem_id}</Badge>
                <Badge>{problem.status}</Badge>
                {problem.languages.map((language) => (
                  <Badge key={language} variant="outline">
                    {language}
                  </Badge>
                ))}
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Statement
                </h2>
                <p className="text-sm leading-6">{buildProblemStatement(problem)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Input
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm">n{"\n"}a1 a2 ... an</pre>
                </div>
                <div className="border p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Output
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm">answer</pre>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Time limit
                  </div>
                  <div className="mt-2 text-lg font-semibold">{problem.time_limit}</div>
                </div>
                <div className="border p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Difficulty
                  </div>
                  <div className="mt-2 text-lg font-semibold">{problem.difficulty}/10</div>
                </div>
                <div className="border p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    File
                  </div>
                  <div className="mt-2 text-lg font-semibold">
                    {getEditorLanguage(selectedLanguage).extension}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid min-h-[780px] grid-rows-[1fr_auto]">
            <CodeEditor code={code} language={selectedLanguage} onCodeChange={setCode} />
            <div className="border-t p-4">
              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="grid gap-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">stdin</span>
                    <textarea
                      value={stdin}
                      onChange={(event) => setStdin(event.target.value)}
                      className="min-h-24 w-full resize-y border bg-background p-3 font-mono text-sm outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium">expected stdout</span>
                    <textarea
                      value={expectedStdout}
                      onChange={(event) => setExpectedStdout(event.target.value)}
                      className="min-h-20 w-full resize-y border bg-background p-3 font-mono text-sm outline-none"
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Sandbox result</div>
                  {submitError ? (
                    <div className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {submitError}
                    </div>
                  ) : null}
                  {completionError ? (
                    <div className="border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-300">
                      Accepted locally, but progress was not saved: {completionError}
                    </div>
                  ) : null}
                  {result ? (
                    <div className="space-y-3 border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{result.verdict}</Badge>
                        <Badge variant="outline">{result.duration_ms}ms</Badge>
                        <Badge variant="outline">exit {result.exit_code ?? "none"}</Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            stdout
                          </div>
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap border bg-background p-3 text-xs">
                            {result.stdout || "(empty)"}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            stderr / compile
                          </div>
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap border bg-background p-3 text-xs">
                            {result.stderr || result.compile_stderr || "(empty)"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border p-3 text-sm text-muted-foreground">
                      Submit code to run it inside the local StateCode sandbox.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
