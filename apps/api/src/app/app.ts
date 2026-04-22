export interface ApiApp {
  readonly name: "api";
  readonly boundedContexts: readonly string[];
  readonly port: number;
  readonly authGrpcAddress: string;
}

export const apiApp: ApiApp = {
  name: "api",
  boundedContexts: ["auth", "problems", "submissions", "testcases", "languages"],
  port: Number(process.env.API_PORT ?? 4000),
  authGrpcAddress: process.env.AUTH_GRPC_ADDR ?? "127.0.0.1:50051"
};
