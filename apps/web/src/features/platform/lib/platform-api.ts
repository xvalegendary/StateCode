import type { RankTier, UserRole, VisibilityMode } from "@/features/auth/lib/session";

export type LeaderboardEntry = {
  rank: number;
  username: string;
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
};

export type UserAdminRecord = {
  user_id: string;
  login: string;
  email: string;
  username: string;
  role: UserRole;
  title: string;
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

export async function fetchProblems() {
  const response = await fetch(`${API_BASE_URL}/problems`, { cache: "no-store" });
  return parseJson<{ categories: string[]; problems: ProblemRecord[] }>(response);
}

export async function fetchProfile(handle: string) {
  const response = await fetch(`${API_BASE_URL}/profiles/${encodeURIComponent(handle)}`, {
    cache: "no-store"
  });
  return parseJson<UserAdminRecord>(response);
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
  return parseJson<{ categories: string[]; problems: ProblemRecord[] }>(response);
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
