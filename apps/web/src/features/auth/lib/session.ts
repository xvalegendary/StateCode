"use client";

export type VisibilityMode = "public" | "private";

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
  username: string;
  token: string;
  message: string;
  profile: {
    profileUrl: string;
    tournamentsPlayed: number;
    solvedProblems: number;
    visibility: VisibilityMode;
    leaderboardRating: number | null;
    leaderboardPosition: number | null;
    lastOnlineAt: string;
    joinedAt: string;
    calibrationSolved: number;
    calibrationTarget: number;
    rank: RankTier;
  };
};

type BaseAuthPayload = Omit<AuthSession, "profile">;

const STORAGE_KEY = "statecode-auth";
const AUTH_EVENT = "statecode-auth-change";
const CALIBRATION_TARGET = 5;

type RankRule = {
  min: number;
  label: Exclude<RankTier, "Calibrating">;
};

const rankRules: RankRule[] = [
  { min: 2400, label: "Legend" },
  { min: 2100, label: "Grandmaster" },
  { min: 1800, label: "Master" },
  { min: 1500, label: "Candidate Master" },
  { min: 1250, label: "Expert" },
  { min: 1000, label: "Specialist" },
  { min: 750, label: "Apprentice" },
  { min: 0, label: "Novice" }
];

function hashValue(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function createProfileUrl(username: string) {
  const normalized = username.startsWith("@") ? username : `@${username}`;
  return `https://statecode.dev/${normalized}`;
}

function computeCalibratedRating(solvedProblems: number, calibrationSolved: number) {
  if (calibrationSolved < CALIBRATION_TARGET) {
    return null;
  }

  const bonus = Math.min(Math.max(solvedProblems - CALIBRATION_TARGET, 0), 120) * 9;
  return 650 + calibrationSolved * 120 + bonus;
}

export function resolveRank(
  rating: number | null,
  calibrationSolved: number
): RankTier {
  if (calibrationSolved < CALIBRATION_TARGET || rating === null) {
    return "Calibrating";
  }

  const matchedRule = rankRules.find((rule) => rating >= rule.min);
  return matchedRule?.label ?? "Novice";
}

function estimateLeaderboardPosition(rating: number | null) {
  if (rating === null) {
    return null;
  }

  return Math.max(28, 2200 - Math.floor(rating * 0.72));
}

function buildDefaultProfile(payload: BaseAuthPayload, previous?: AuthSession | null) {
  const seed = hashValue(`${payload.user_id}:${payload.username}:${payload.login}`);
  const retainedSolved = previous?.profile.solvedProblems ?? 0;
  const retainedTournaments = previous?.profile.tournamentsPlayed ?? 0;
  const retainedJoinedAt = previous?.profile.joinedAt ?? new Date().toISOString();
  const visibility = previous?.profile.visibility ?? "public";
  const calibrationSolved = previous?.profile.calibrationSolved ?? Math.min(retainedSolved, CALIBRATION_TARGET);
  const solvedProblems = retainedSolved;
  const tournamentsPlayed =
    retainedTournaments > 0 ? retainedTournaments : Math.floor((seed % 3) / 2);
  const leaderboardRating = computeCalibratedRating(solvedProblems, calibrationSolved);

  return {
    profileUrl: createProfileUrl(payload.username),
    tournamentsPlayed,
    solvedProblems,
    visibility,
    leaderboardRating,
    leaderboardPosition: estimateLeaderboardPosition(leaderboardRating),
    lastOnlineAt: new Date().toISOString(),
    joinedAt: retainedJoinedAt,
    calibrationSolved,
    calibrationTarget: CALIBRATION_TARGET,
    rank: resolveRank(leaderboardRating, calibrationSolved)
  } satisfies AuthSession["profile"];
}

function normalizeAuthSession(
  payload: BaseAuthPayload,
  current?: AuthSession | null
): AuthSession {
  return {
    ...payload,
    profile: buildDefaultProfile(
      payload,
      current?.user_id === payload.user_id ? current : null
    )
  } satisfies AuthSession;
}

export function hydrateAuthSession(payload: BaseAuthPayload): AuthSession {
  const current = readAuthSession();
  return normalizeAuthSession(payload, current);
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
    const parsed = JSON.parse(raw) as AuthSession | BaseAuthPayload;

    if ("profile" in parsed && parsed.profile) {
      return parsed as AuthSession;
    }

    return normalizeAuthSession(parsed as BaseAuthPayload, null);
  } catch {
    return null;
  }
}

export function persistAuthSession(payload: BaseAuthPayload): AuthSession | BaseAuthPayload {
  if (typeof window === "undefined") {
    return payload;
  }

  const session = normalizeAuthSession(payload, readAuthSession());
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

export const rankSystemSummary = rankRules
  .slice()
  .reverse()
  .map((rule) => ({
    rank: rule.label,
    minRating: rule.min
  }));
