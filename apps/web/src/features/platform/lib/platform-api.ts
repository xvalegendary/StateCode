import type { RankTier, UserRole, VisibilityMode } from "@/features/auth/lib/session";

export type LeaderboardEntry = {
  rank: number;
  username: string;
  region_code: string;
  title: string;
  rating: number;
  solved_problems: number;
  tournaments_played: number;
};

export type ProblemRecord = {
  problem_id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: number;
  status: string;
  solved_count: number;
  time_limit: string;
  statement: string;
  created_at: string;
  languages: string[];
  solved_by_current_user: boolean;
};

export type UserAdminRecord = {
  user_id: string;
  login: string;
  email: string;
  username: string;
  role: UserRole;
  title: string;
  region_code: string;
  visibility: VisibilityMode;
  tournaments_played: number;
  solved_problems: number;
  calibration_solved: number;
  calibration_target: number;
  leaderboard_position: number;
  leaderboard_rating: number;
  rank: RankTier;
  last_online_at: string;
  joined_at: string;
  leaderboard_hidden: boolean;
  is_banned: boolean;
  profile_url: string;
};

export type SandboxRunResult = {
  submission_id: string | null;
  verdict:
    | "accepted"
    | "compile-error"
    | "runtime-error"
    | "time-limit-exceeded"
    | "output-limit-exceeded"
    | "wrong-answer"
    | "tool-unavailable"
    | "internal-error";
  language: string;
  exit_code: number | null;
  compile_stdout: string;
  compile_stderr: string;
  stdout: string;
  stderr: string;
  duration_ms: number;
  time_limit_ms: number;
  memory_limit_mb: number;
  output_truncated: boolean;
  work_dir: string;
};

export type OperationsMetric = {
  id: string;
  label: string;
  value: string;
  delta: string;
  progress: number;
};

export type OperationsQueueItem = {
  id: string;
  problem: string;
  language: string;
  status: string;
  tests: string;
  runtime: string;
  memory: string;
  startedAt: number;
};

export type OperationsWorkerPool = {
  name: string;
  utilization: number;
  active: string;
};

export type OperationsSnapshot = {
  synced_at: string;
  metrics: OperationsMetric[];
  queue: OperationsQueueItem[];
  worker_pools: OperationsWorkerPool[];
  notes: string[];
  quick_actions: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(("error" in payload && payload.error) || "request failed");
  }

  return payload;
}

export async function fetchLeaderboard() {
  const response = await fetch(`${API_BASE_URL}/leaderboard`, { cache: "no-store" });
  return parseJson<{ entries: LeaderboardEntry[] }>(response);
}

export async function fetchProblems(token?: string) {
  const response = await fetch(`${API_BASE_URL}/problems`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store"
  });
  return parseJson<{
    categories: string[];
    problems: ProblemRecord[];
    supported_languages: string[];
  }>(response);
}

export async function fetchProfile(handle: string) {
  const response = await fetch(`${API_BASE_URL}/profiles/${encodeURIComponent(handle)}`, {
    cache: "no-store"
  });
  return parseJson<UserAdminRecord>(response);
}

export async function fetchOperations() {
  const response = await fetch(`${API_BASE_URL}/operations`, { cache: "no-store" });
  return parseJson<OperationsSnapshot>(response);
}

export async function fetchCurrentUser(token: string) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  return parseJson<UserAdminRecord>(response);
}

export async function updateProfileVisibility(
  token: string,
  visibility: "public" | "private"
) {
  const response = await fetch(`${API_BASE_URL}/auth/visibility`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ visibility })
  });

  return parseJson<UserAdminRecord>(response);
}

export async function updateProfileRegion(token: string, regionCode: string) {
  const response = await fetch(`${API_BASE_URL}/auth/region`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ regionCode })
  });

  return parseJson<UserAdminRecord>(response);
}

export async function fetchAdminUsers(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  return parseJson<{ users: UserAdminRecord[] }>(response);
}

export async function fetchAdminProblems(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/problems`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  return parseJson<{
    categories: string[];
    problems: ProblemRecord[];
    supported_languages: string[];
  }>(response);
}

export async function postAdminUserAction<TBody extends object>(
  token: string,
  userId: string,
  action: "ban" | "leaderboard" | "title" | "role" | "reset-competitive",
  body?: TBody
) {
  const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/${action}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body ?? {})
  });

  return parseJson<{ message: string; user: UserAdminRecord }>(response);
}

export async function createAdminProblem(
  token: string,
  body: {
    title: string;
    category: string;
    difficulty: number;
    status: string;
    timeLimit: string;
    statement: string;
    languages: string[];
  }
) {
  const response = await fetch(`${API_BASE_URL}/admin/problems`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseJson<{ message: string; problem: ProblemRecord }>(response);
}

export async function runSubmission(body: {
  problemId: string;
  language: string;
  source: string;
  stdin?: string;
  expectedStdout?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}) {
  const response = await fetch(`${API_BASE_URL}/submissions/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseJson<SandboxRunResult>(response);
}

export async function completeProblem(
  token: string,
  problem: Pick<ProblemRecord, "problem_id" | "slug" | "title">
) {
  const response = await fetch(`${API_BASE_URL}/submissions/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      problemId: problem.problem_id,
      problemSlug: problem.slug,
      problemTitle: problem.title
    })
  });

  return parseJson<UserAdminRecord>(response);
}
