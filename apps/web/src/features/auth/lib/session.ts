"use client";

export type VisibilityMode = "public" | "private";
export type UserRole = "user" | "moderator" | "admin";

export type RankTier =
  | "Calibrating"
  | "Novice"
  | "Apprentice"
  | "Specialist"
  | "Expert"
  | "Candidate Master"
  | "Master"
  | "Grandmaster"
  | "Legend";

export type AuthSession = {
  user_id: string;
  login: string;
  email: string;
  username: string;
  token: string;
  message: string;
  role: UserRole;
  title: string;
  profile: {
    profileUrl: string;
    tournamentsPlayed: number;
    solvedProblems: number;
    visibility: VisibilityMode;
    leaderboardRating: number;
    leaderboardPosition: number;
    lastOnlineAt: string;
    joinedAt: string;
    calibrationSolved: number;
    calibrationTarget: number;
    rank: RankTier;
    leaderboardHidden: boolean;
    isBanned: boolean;
  };
};

export type AuthPayload = {
  user_id: string;
  login: string;
  email: string;
  username: string;
  token: string;
  message: string;
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

export type SessionUserRecord = Omit<AuthPayload, "token" | "message">;

const STORAGE_KEY = "statecode-auth";
const AUTH_EVENT = "statecode-auth-change";

function normalizePayload(payload: AuthPayload): AuthSession {
  return {
    user_id: payload.user_id,
    login: payload.login,
    email: payload.email,
    username: payload.username,
    token: payload.token,
    message: payload.message,
    role: payload.role,
    title: payload.title,
    profile: {
      profileUrl: payload.profile_url,
      tournamentsPlayed: payload.tournaments_played,
      solvedProblems: payload.solved_problems,
      visibility: payload.visibility,
      leaderboardRating: payload.leaderboard_rating,
      leaderboardPosition: payload.leaderboard_position,
      lastOnlineAt: payload.last_online_at,
      joinedAt: payload.joined_at,
      calibrationSolved: payload.calibration_solved,
      calibrationTarget: payload.calibration_target,
      rank: payload.rank,
      leaderboardHidden: payload.leaderboard_hidden,
      isBanned: payload.is_banned
    }
  };
}

function normalizeUserRecord(record: SessionUserRecord, current: AuthSession): AuthSession {
  return {
    user_id: record.user_id,
    login: record.login,
    email: record.email,
    username: record.username,
    token: current.token,
    message: current.message,
    role: record.role,
    title: record.title,
    profile: {
      profileUrl: record.profile_url,
      tournamentsPlayed: record.tournaments_played,
      solvedProblems: record.solved_problems,
      visibility: record.visibility,
      leaderboardRating: record.leaderboard_rating,
      leaderboardPosition: record.leaderboard_position,
      lastOnlineAt: record.last_online_at,
      joinedAt: record.joined_at,
      calibrationSolved: record.calibration_solved,
      calibrationTarget: record.calibration_target,
      rank: record.rank,
      leaderboardHidden: record.leaderboard_hidden,
      isBanned: record.is_banned
    }
  };
}

function isNormalizedSession(value: unknown): value is AuthSession {
  return Boolean(
    value &&
      typeof value === "object" &&
      "profile" in value &&
      value.profile &&
      typeof value.profile === "object"
  );
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession | AuthPayload;
    return isNormalizedSession(parsed) ? parsed : normalizePayload(parsed);
  } catch {
    return null;
  }
}

export function persistAuthSession(payload: AuthPayload): AuthSession {
  const session = normalizePayload(payload);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return session;
}

export function updateStoredProfile(
  updater: (session: AuthSession) => AuthSession
) {
  const current = readAuthSession();
  if (!current || typeof window === "undefined") {
    return null;
  }

  const next = updater(current);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return next;
}

export function syncStoredSession(record: SessionUserRecord) {
  const current = readAuthSession();
  if (!current || typeof window === "undefined") {
    return null;
  }

  const next = normalizeUserRecord(record, current);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(AUTH_EVENT));
  return next;
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function subscribeToAuthSession(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_EVENT, listener);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_EVENT, listener);
  };
}

export function getRankPalette(rank: RankTier) {
  switch (rank) {
    case "Legend":
      return "text-amber-500";
    case "Grandmaster":
      return "text-rose-500";
    case "Master":
      return "text-fuchsia-500";
    case "Candidate Master":
      return "text-violet-500";
    case "Expert":
      return "text-sky-500";
    case "Specialist":
      return "text-emerald-500";
    case "Apprentice":
      return "text-teal-500";
    case "Novice":
      return "text-muted-foreground";
    case "Calibrating":
    default:
      return "text-yellow-500";
  }
}

export const ratingSystemSummary = [
  "First 5 accepted tasks are calibration.",
  "Each solved task after calibration raises rating based on consistency and problem difficulty.",
  "Leaderboard placement starts only after calibration is complete."
] as const;

export const rankSystemSummary = [
  { rank: "Novice", minRating: 0 },
  { rank: "Apprentice", minRating: 750 },
  { rank: "Specialist", minRating: 1000 },
  { rank: "Expert", minRating: 1250 },
  { rank: "Candidate Master", minRating: 1500 },
  { rank: "Master", minRating: 1800 },
  { rank: "Grandmaster", minRating: 2100 },
  { rank: "Legend", minRating: 2400 }
] as const;
