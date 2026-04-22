import { createServer } from "node:http";
import path from "node:path";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { apiApp } from "./app/app.js";

type LoginBody = {
  login?: string;
  password?: string;
};

type RegisterBody = {
  login?: string;
  password?: string;
  username?: string;
};

type ResetBody = {
  login?: string;
};

type AuthResponse = {
  user_id: string;
  login: string;
  username: string;
  token: string;
  message: string;
};

type PasswordResetResponse = {
  message: string;
};

type GrpcAuthResponse = {
  user_id?: string;
  userId?: string;
  login?: string;
  username?: string;
  token?: string;
  message?: string;
};

type ProtoClient = grpc.Client & {
  register(
    request: {
      login: string;
      password: string;
      username: string;
    },
    callback: (error: grpc.ServiceError | null, response: GrpcAuthResponse) => void
  ): void;
  login(
    request: {
      login: string;
      password: string;
    },
    callback: (error: grpc.ServiceError | null, response: GrpcAuthResponse) => void
  ): void;
  requestPasswordReset(
    request: {
      login: string;
    },
    callback: (error: grpc.ServiceError | null, response: PasswordResetResponse) => void
  ): void;
};

const authProtoPath = path.resolve(process.cwd(), "../../packages/contracts/proto/auth.proto");
const packageDefinition = protoLoader.loadSync(authProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;
const AuthService = ((((protoDescriptor.statecode as grpc.GrpcObject).auth as grpc.GrpcObject)
  .v1 as grpc.GrpcObject).AuthService ?? null) as grpc.ServiceClientConstructor | null;

if (!AuthService) {
  throw new Error("AuthService gRPC contract could not be loaded");
}

const authClient = new AuthService(
  apiApp.authGrpcAddress,
  grpc.credentials.createInsecure()
) as unknown as ProtoClient;

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ??
    "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function getCorsOrigin(request: import("node:http").IncomingMessage) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    return origin;
  }

  return "http://localhost:3000";
}

function writeJson(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown
) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": getCorsOrigin(request),
    Vary: "Origin",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(payload));
}

async function readJson<T>(request: import("node:http").IncomingMessage): Promise<T> {
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

function normalizeAuthResponse(response: GrpcAuthResponse): AuthResponse {
  return {
    user_id: response.user_id ?? response.userId ?? "",
    login: response.login ?? "",
    username: response.username ?? "",
    token: response.token ?? "",
    message: response.message ?? ""
  };
}

const server = createServer(async (request, response) => {
  if (!request.url || !request.method) {
    writeJson(request, response, 404, { error: "not found" });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": getCorsOrigin(request),
      Vary: "Origin",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    writeJson(request, response, 200, {
      name: apiApp.name,
      boundedContexts: apiApp.boundedContexts,
      authGrpcAddress: apiApp.authGrpcAddress
    });
    return;
  }

  try {
    if (request.method === "POST" && request.url === "/auth/register") {
      const body = await readJson<RegisterBody>(request);
      const result = await grpcCall(authClient.register.bind(authClient), {
        login: body.login ?? "",
        password: body.password ?? "",
        username: body.username ?? ""
      });

      writeJson(request, response, 201, normalizeAuthResponse(result));
      return;
    }

    if (request.method === "POST" && request.url === "/auth/login") {
      const body = await readJson<LoginBody>(request);
      const result = await grpcCall(authClient.login.bind(authClient), {
        login: body.login ?? "",
        password: body.password ?? ""
      });

      writeJson(request, response, 200, normalizeAuthResponse(result));
      return;
    }

    if (request.method === "POST" && request.url === "/auth/password-reset") {
      const body = await readJson<ResetBody>(request);
      const result = await grpcCall(authClient.requestPasswordReset.bind(authClient), {
        login: body.login ?? ""
      });

      writeJson(request, response, 200, result);
      return;
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
    `[${apiApp.name}] http auth gateway listening on http://localhost:${apiApp.port} -> ${apiApp.authGrpcAddress}`
  );
});
