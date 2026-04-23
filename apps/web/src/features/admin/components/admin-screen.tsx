"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shield, Swords, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { readAuthSession } from "@/features/auth/lib/session";
import {
  createAdminProblem,
  fetchAdminProblems,
  fetchAdminUsers,
  postAdminUserAction,
  ProblemRecord,
  UserAdminRecord
} from "@/features/platform/lib/platform-api";

export function AdminScreen() {
  const [sessionToken, setSessionToken] = useState("");
  const [role, setRole] = useState<"user" | "moderator" | "admin" | "">("");
  const [users, setUsers] = useState<UserAdminRecord[]>([]);
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "",
    difficulty: "4",
    status: "Draft",
    timeLimit: "2s",
    statement: "",
    languages: ["C++17", "Rust"]
  });

  const loadData = async (token: string) => {
    const [usersPayload, problemsPayload] = await Promise.all([
      fetchAdminUsers(token),
      fetchAdminProblems(token)
    ]);
    setUsers(usersPayload.users);
    setProblems(problemsPayload.problems);
    setSupportedLanguages(problemsPayload.supported_languages);
  };

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      setError("Log in as admin to open the platform panel.");
      return;
    }

    setSessionToken(session.token);
    setRole(session.role);

    if (session.role !== "admin" && session.role !== "moderator") {
      setError("Admin panel is available only to moderator or admin accounts.");
      return;
    }

    loadData(session.token).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load admin data.");
    });
  }, []);

  const runUserAction = async (
    userId: string,
    action: "ban" | "leaderboard" | "title" | "role" | "reset-competitive",
    body?: Record<string, unknown>
  ) => {
    if (!sessionToken) {
      return;
    }

    const result = await postAdminUserAction(sessionToken, userId, action, body);
    setUsers((current) =>
      current.map((user) => (user.user_id === userId ? result.user : user))
    );
  };

  const handleCreateProblem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionToken) {
      return;
    }

    const result = await createAdminProblem(sessionToken, {
      title: form.title,
      category: form.category,
      difficulty: Number(form.difficulty),
      status: form.status,
      timeLimit: form.timeLimit,
      statement: form.statement,
      languages: form.languages
    });

    setProblems((current) => [result.problem, ...current]);
    setForm({
      title: "",
      category: "",
      difficulty: "4",
      status: "Draft",
      timeLimit: "2s",
      statement: "",
      languages: ["C++17", "Rust"]
    });
  };

  const toggleLanguage = (language: string) => {
    setForm((current) => ({
      ...current,
      languages: current.languages.includes(language)
        ? current.languages.filter((item) => item !== language)
        : [...current.languages, language]
    }));
  };

  if (error) {
    return (
      <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
        <section className="mx-auto max-w-[1320px] border p-8">
          <Badge variant="outline">Admin</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">StateCode platform control</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-28 md:px-8 lg:px-10">
      <section className="mx-auto flex max-w-[1320px] flex-col gap-8">
        <div className="space-y-3 border-b pb-6">
          <Badge variant="outline">Admin</Badge>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            StateCode platform control.
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
            Manage users, moderation state, leaderboard visibility, titles, roles, and the
            programming problem catalog from one backend-driven panel.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="size-4" />
                User management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {users.map((user) => (
                <div key={user.user_id} className="border p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{user.username}</div>
                        <Badge variant="outline">{user.role}</Badge>
                        <Badge variant="outline">{user.rank}</Badge>
                        {user.is_banned ? <Badge variant="destructive">Banned</Badge> : null}
                        {user.leaderboard_hidden ? <Badge variant="secondary">Leaderboard hidden</Badge> : null}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.login} | {user.email} | {user.profile_url}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rating {user.leaderboard_rating || "Pending"} | Solved {user.solved_problems} |
                        Tournaments {user.tournaments_played}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="rounded-none"
                        onClick={() => runUserAction(user.user_id, "ban", { isBanned: !user.is_banned })}
                      >
                        {user.is_banned ? "Unban" : "Ban"}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-none"
                        onClick={() =>
                          runUserAction(user.user_id, "leaderboard", {
                            hidden: !user.leaderboard_hidden
                          })
                        }
                      >
                        {user.leaderboard_hidden ? "Restore leaderboard" : "Hide leaderboard"}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-none"
                        onClick={() => runUserAction(user.user_id, "reset-competitive")}
                      >
                        Reset rank
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-none"
                        onClick={() => {
                          const nextTitle = window.prompt("Issue title", user.title || "");
                          if (nextTitle !== null) {
                            runUserAction(user.user_id, "title", { title: nextTitle });
                          }
                        }}
                      >
                        Set title
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-none"
                        disabled={role !== "admin"}
                        onClick={() => {
                          const nextRole = window.prompt("Role: user | moderator | admin", user.role);
                          if (nextRole) {
                            runUserAction(user.user_id, "role", { role: nextRole });
                          }
                        }}
                      >
                        Set role
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Swords className="size-4" />
                  New problem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleCreateProblem}>
                  <Input
                    placeholder="Problem title"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  />
                  <Input
                    placeholder="Category"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Difficulty"
                      value={form.difficulty}
                      onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
                    />
                    <Input
                      placeholder="Time limit"
                      value={form.timeLimit}
                      onChange={(event) => setForm((current) => ({ ...current, timeLimit: event.target.value }))}
                    />
                  </div>
                  <Input
                    placeholder="Status"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  />
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Languages</div>
                    <div className="flex flex-wrap gap-2">
                      {supportedLanguages.map((language) => (
                        <Button
                          key={language}
                          type="button"
                          variant={form.languages.includes(language) ? "default" : "outline"}
                          className="rounded-none"
                          onClick={() => toggleLanguage(language)}
                        >
                          {language}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Input
                    placeholder="Statement"
                    value={form.statement}
                    onChange={(event) => setForm((current) => ({ ...current, statement: event.target.value }))}
                  />
                  <Button type="submit" className="w-full rounded-none">
                    Create problem
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="size-4" />
                  Problem inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {problems.slice(0, 8).map((problem, index) => (
                  <div key={problem.problem_id}>
                    {index > 0 ? <Separator className="mb-3" /> : null}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{problem.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {problem.category} | Difficulty {problem.difficulty} | {problem.time_limit}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {problem.languages.map((language) => (
                            <Badge key={`${problem.problem_id}-${language}`} variant="outline">
                              {language}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge variant="outline">{problem.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
