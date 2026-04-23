import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { apiApp } from "./app/app.js";

type LoginBody = { login?: string; password?: string };
type RegisterBody = { login?: string; password?: string; username?: string };
type ResetBody = { login?: string };
type VisibilityBody = { visibility?: string };
type TitleBody = { title?: string };
type RoleBody = { role?: string };
type BanBody = { isBanned?: boolean };
type LeaderboardBody = { hidden?: boolean };
type CreateProblemBody = {
  title?: string;
  category?: string;
  difficulty?: number;
  status?: string;
  timeLimit?: string;
  statement?: string;
  languages?: string[];
};
type RunSubmissionBody = {
  problemId?: string;
  language?: string;
  source?: string;
  stdin?: string;
  expectedStdout?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
};
type CompleteProblemBody = {
  problemId?: string;
  problemSlug?: string;
  problemTitle?: string;
};

type AuthResponse = {
  user_id: string;
  login: string;
  email: string;
  username: string;
  token: string;
  message: string;
  role: string;
  title: string;
  visibility: string;
  tournaments_played: number;
  solved_problems: number;
  calibration_solved: number;
  calibration_target: number;
  leaderboard_position: number;
  leaderboard_rating: number;
  rank: string;
  last_online_at: string;
  joined_at: string;
  leaderboard_hidden: boolean;
  is_banned: boolean;
  profile_url: string;
};

type UserRecord = Omit<AuthResponse, "token" | "message">;
type ProblemRecord = {
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

type AdminActionResponse = { message: string; user?: UserRecord };
type AdminProblemActionResponse = { message: string; problem?: ProblemRecord };
type PasswordResetResponse = { message: string };
type LeaderboardEntry = {
  rank: number;
  username: string;
  title: string;
  rating: number;
  solved_problems: number;
  tournaments_played: number;
};

type ProtoClient = grpc.Client & {
  register(
    request: { login: string; password: string; username: string },
    callback: (error: grpc.ServiceError | null, response: AuthResponse) => void
  ): void;
  login(
    request: { login: string; password: string },
    callback: (error: grpc.ServiceError | null, response: AuthResponse) => void
  ): void;
  requestPasswordReset(
    request: { login: string },
    callback: (error: grpc.ServiceError | null, response: PasswordResetResponse) => void
  ): void;
  getCurrentUser(
    request: { token: string },
    callback: (error: grpc.ServiceError | null, response: UserRecord) => void
  ): void;
  updateProfileVisibility(
    request: { token: string; visibility: string },
    callback: (error: grpc.ServiceError | null, response: UserRecord) => void
  ): void;
  getPublicProfile(
    request: { handle: string },
    callback: (error: grpc.ServiceError | null, response: UserRecord) => void
  ): void;
  getLeaderboard(
    request: Record<string, never>,
    callback: (
      error: grpc.ServiceError | null,
      response: { entries?: LeaderboardEntry[] }
    ) => void
  ): void;
  listProblems(
    request: { token: string },
    callback: (
      error: grpc.ServiceError | null,
      response: { categories?: string[]; problems?: ProblemRecord[] }
      & { supported_languages?: string[] }
    ) => void
  ): void;
  completeProblem(
    request: { token: string; problem_id: string; problem_slug: string; problem_title: string },
    callback: (error: grpc.ServiceError | null, response: UserRecord) => void
  ): void;
  listUsers(
    request: { token: string },
    callback: (
      error: grpc.ServiceError | null,
      response: { users?: UserRecord[] }
    ) => void
  ): void;
  setUserBanState(
    request: { token: string; user_id: string; is_banned: boolean },
    callback: (error: grpc.ServiceError | null, response: AdminActionResponse) => void
  ): void;
  setUserLeaderboardState(
    request: { token: string; user_id: string; leaderboard_hidden: boolean },
    callback: (error: grpc.ServiceError | null, response: AdminActionResponse) => void
  ): void;
  resetUserCompetitiveState(
    request: { token: string; user_id: string },
    callback: (error: grpc.ServiceError | null, response: AdminActionResponse) => void
  ): void;
  assignUserTitle(
    request: { token: string; user_id: string; title: string },
    callback: (error: grpc.ServiceError | null, response: AdminActionResponse) => void
  ): void;
  setUserRole(
    request: { token: string; user_id: string; role: string },
    callback: (error: grpc.ServiceError | null, response: AdminActionResponse) => void
  ): void;
  listAdminProblems(
    request: { token: string },
    callback: (
      error: grpc.ServiceError | null,
      response: { categories?: string[]; problems?: ProblemRecord[] }
      & { supported_languages?: string[] }
    ) => void
  ): void;
  createProblem(
    request: {
      token: string;
      title: string;
      category: string;
      difficulty: number;
      status: string;
      time_limit: string;
      statement: string;
      languages: string[];
    },
    callback: (
      error: grpc.ServiceError | null,
      response: AdminProblemActionResponse
    ) => void
  ): void;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const protoPath = path.resolve(currentDir, "../../../packages/contracts/proto/auth.proto");
const defaultExecutorPath = path.resolve(
  currentDir,
  process.platform === "win32"
    ? "../../../apps/executor-rs/.cargo-artifacts/debug/executor-rs.exe"
    : "../../../apps/executor-rs/.cargo-artifacts/debug/executor-rs"
);
const executorPath = process.env.EXECUTOR_BIN ?? defaultExecutorPath;
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;
const PlatformService = ((((protoDescriptor.statecode as grpc.GrpcObject).platform as grpc.GrpcObject)
  .v1 as grpc.GrpcObject).PlatformService ?? null) as grpc.ServiceClientConstructor | null;

if (!PlatformService) {
  throw new Error("PlatformService gRPC contract could not be loaded");
}

const platformClient = new PlatformService(
  apiApp.authGrpcAddress,
  grpc.credentials.createInsecure()
) as unknown as ProtoClient;

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function getCorsOrigin(request: IncomingMessage) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    return origin;
  }

  return "http://localhost:3000";
}

function writeJson(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  payload: unknown
) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": getCorsOrigin(request),
    Vary: "Origin",
    "Access-Control-Allow-Headers": "content-type,authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(payload));
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  let raw = "";

  for await (const chunk of request) {
    raw += chunk;
  }

  if (!raw) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
}

function grpcStatusToHttp(error: grpc.ServiceError) {
  switch (error.code) {
    case grpc.status.INVALID_ARGUMENT:
      return 400;
    case grpc.status.UNAUTHENTICATED:
      return 401;
    case grpc.status.PERMISSION_DENIED:
      return 403;
    case grpc.status.NOT_FOUND:
      return 404;
    case grpc.status.ALREADY_EXISTS:
      return 409;
    default:
      return 500;
  }
}

function grpcCall<TRequest, TResponse>(
  method: (request: TRequest, callback: (error: grpc.ServiceError | null, response: TResponse) => void) => void,
  request: TRequest
) {
  return new Promise<TResponse>((resolve, reject) => {
    method(request, (error, response) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(response);
    });
  });
}

function bearerToken(request: IncomingMessage) {
  const authHeader = request.headers.authorization ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
}

function routeUserAction(pathname: string) {
  const match = pathname.match(/^\/admin\/users\/([^/]+)\/(ban|leaderboard|title|role|reset-competitive)$/);
  if (!match) {
    return null;
  }

  return {
    userId: decodeURIComponent(match[1] ?? ""),
    action: (match[2] ?? "") as "ban" | "leaderboard" | "title" | "role" | "reset-competitive"
  };
}

function runExecutor(payload: RunSubmissionBody) {
  return new Promise<unknown>((resolve, reject) => {
    if (!existsSync(executorPath)) {
      reject(new Error("executor binary not found; run npm run build --workspace @judge/executor-rs"));
      return;
    }

    const child = spawn(executorPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", () => {
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(stderr || "executor returned invalid json"));
      }
    });
    child.stdin.end(
      JSON.stringify({
        submission_id: payload.problemId ?? randomUUID(),
        language: payload.language ?? "",
        source: payload.source ?? "",
        stdin: payload.stdin ?? "",
        expected_stdout: payload.expectedStdout ?? undefined,
        time_limit_ms: payload.timeLimitMs ?? 2000,
        memory_limit_mb: payload.memoryLimitMb ?? 256,
        output_limit_bytes: 262144
      })
    );
  });
}

const server = createServer(async (request, response) => {
  if (!request.url || !request.method) {
    writeJson(request, response, 404, { error: "not found" });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": getCorsOrigin(request),
      Vary: "Origin",
      "Access-Control-Allow-Headers": "content-type,authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && pathname === "/health") {
    writeJson(request, response, 200, {
      name: apiApp.name,
      boundedContexts: apiApp.boundedContexts,
      authGrpcAddress: apiApp.authGrpcAddress
    });
    return;
  }

  try {
    if (request.method === "POST" && pathname === "/auth/register") {
      const body = await readJson<RegisterBody>(request);
      const result = await grpcCall(platformClient.register.bind(platformClient), {
        login: body.login ?? "",
        password: body.password ?? "",
        username: body.username ?? ""
      });
      writeJson(request, response, 201, result);
      return;
    }

    if (request.method === "POST" && pathname === "/auth/login") {
      const body = await readJson<LoginBody>(request);
      const result = await grpcCall(platformClient.login.bind(platformClient), {
        login: body.login ?? "",
        password: body.password ?? ""
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/auth/password-reset") {
      const body = await readJson<ResetBody>(request);
      const result = await grpcCall(platformClient.requestPasswordReset.bind(platformClient), {
        login: body.login ?? ""
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && pathname === "/auth/me") {
      const result = await grpcCall(platformClient.getCurrentUser.bind(platformClient), {
        token: bearerToken(request)
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/auth/visibility") {
      const body = await readJson<VisibilityBody>(request);
      const result = await grpcCall(platformClient.updateProfileVisibility.bind(platformClient), {
        token: bearerToken(request),
        visibility: body.visibility ?? ""
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && pathname === "/leaderboard") {
      const result = await grpcCall(platformClient.getLeaderboard.bind(platformClient), {});
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && pathname === "/problems") {
      const result = await grpcCall(platformClient.listProblems.bind(platformClient), {
        token: bearerToken(request)
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/submissions/run") {
      const body = await readJson<RunSubmissionBody>(request);
      const result = await runExecutor(body);
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/submissions/complete") {
      const body = await readJson<CompleteProblemBody>(request);
      const result = await grpcCall(platformClient.completeProblem.bind(platformClient), {
        token: bearerToken(request),
        problem_id: body.problemId ?? "",
        problem_slug: body.problemSlug ?? "",
        problem_title: body.problemTitle ?? ""
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && pathname.startsWith("/profiles/")) {
      const handle = decodeURIComponent(pathname.replace("/profiles/", ""));
      const result = await grpcCall(platformClient.getPublicProfile.bind(platformClient), {
        handle
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && pathname === "/admin/users") {
      const result = await grpcCall(platformClient.listUsers.bind(platformClient), {
        token: bearerToken(request)
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "GET" && pathname === "/admin/problems") {
      const result = await grpcCall(platformClient.listAdminProblems.bind(platformClient), {
        token: bearerToken(request)
      });
      writeJson(request, response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/admin/problems") {
      const body = await readJson<CreateProblemBody>(request);
      const result = await grpcCall(platformClient.createProblem.bind(platformClient), {
        token: bearerToken(request),
        title: body.title ?? "",
        category: body.category ?? "",
        difficulty: Number(body.difficulty ?? 0),
        status: body.status ?? "",
        time_limit: body.timeLimit ?? "",
        statement: body.statement ?? "",
        languages: Array.isArray(body.languages) ? body.languages : []
      });
      writeJson(request, response, 201, result);
      return;
    }

    const userAction = routeUserAction(pathname);
    if (request.method === "POST" && userAction) {
      const token = bearerToken(request);

      if (userAction.action === "ban") {
        const body = await readJson<BanBody>(request);
        const result = await grpcCall(platformClient.setUserBanState.bind(platformClient), {
          token,
          user_id: userAction.userId,
          is_banned: Boolean(body.isBanned)
        });
        writeJson(request, response, 200, result);
        return;
      }

      if (userAction.action === "leaderboard") {
        const body = await readJson<LeaderboardBody>(request);
        const result = await grpcCall(
          platformClient.setUserLeaderboardState.bind(platformClient),
          {
            token,
            user_id: userAction.userId,
            leaderboard_hidden: Boolean(body.hidden)
          }
        );
        writeJson(request, response, 200, result);
        return;
      }

      if (userAction.action === "title") {
        const body = await readJson<TitleBody>(request);
        const result = await grpcCall(platformClient.assignUserTitle.bind(platformClient), {
          token,
          user_id: userAction.userId,
          title: body.title ?? ""
        });
        writeJson(request, response, 200, result);
        return;
      }

      if (userAction.action === "role") {
        const body = await readJson<RoleBody>(request);
        const result = await grpcCall(platformClient.setUserRole.bind(platformClient), {
          token,
          user_id: userAction.userId,
          role: body.role ?? ""
        });
        writeJson(request, response, 200, result);
        return;
      }

      if (userAction.action === "reset-competitive") {
        const result = await grpcCall(
          platformClient.resetUserCompetitiveState.bind(platformClient),
          {
            token,
            user_id: userAction.userId
          }
        );
        writeJson(request, response, 200, result);
        return;
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const grpcError = error as grpc.ServiceError;
      writeJson(request, response, grpcStatusToHttp(grpcError), {
        error: grpcError.details || "request failed"
      });
      return;
    }

    writeJson(request, response, 500, { error: "unexpected server error" });
    return;
  }

  writeJson(request, response, 404, { error: "not found" });
});

server.listen(apiApp.port, () => {
  console.log(
    `[${apiApp.name}] http platform gateway listening on http://localhost:${apiApp.port} -> ${apiApp.authGrpcAddress}`
  );
});
