const workerDomains = ["queue-consumer", "sandbox-prep", "result-aggregation"] as const;

console.log(`[worker] bootstrap placeholder: ${workerDomains.join(", ")}`);
