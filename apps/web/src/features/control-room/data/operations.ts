export const executionMetrics = [
  {
    id: "accepted-latency",
    label: "median runtime on accepted submissions",
    value: "2.3s",
    delta: "-180ms vs 1h ago",
    progress: 74
  },
  {
    id: "sandbox-capacity",
    label: "workers available across sandbox pool",
    value: "14",
    delta: "3 warm spares online",
    progress: 61
  },
  {
    id: "execution-reliability",
    label: "successful executions in the last 24 hours",
    value: "99.2%",
    delta: "0.4% above weekly median",
    progress: 99
  }
] as const;

export const executionQueue = [
  {
    id: "SB-2081",
    problem: "matrix-paths",
    language: "TypeScript",
    status: "Queued",
    tests: "0 / 16",
    runtime: "--",
    memory: "--"
  },
  {
    id: "SB-2079",
    problem: "interval-cover",
    language: "Rust",
    status: "Running",
    tests: "9 / 14",
    runtime: "1.8s",
    memory: "86 MB"
  },
  {
    id: "SB-2074",
    problem: "dynamic-grid",
    language: "Node.js",
    status: "Accepted",
    tests: "21 / 21",
    runtime: "2.1s",
    memory: "112 MB"
  }
] as const;

export const workerPools = [
  {
    name: "ts-node pool",
    utilization: 68,
    active: "4 / 6 active"
  },
  {
    name: "rust-native pool",
    utilization: 44,
    active: "2 / 5 active"
  },
  {
    name: "cpp-sandbox pool",
    utilization: 83,
    active: "5 / 6 active"
  }
] as const;

export const executionNotes = [
  "Queue pressure is within target",
  "Compilation cache hit-rate is stable",
  "No sandbox failures in the last 3 hours"
] as const;

export const quickActions = [
  "Open submission trace",
  "Inspect failed testcase",
  "Drain noisy worker"
] as const;
