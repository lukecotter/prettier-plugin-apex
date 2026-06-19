#!/usr/bin/env -S tsx
//
// Server concurrency benchmark for built-in (HTTP server) mode. Fires a batch
// of parse requests against the running parsing server both sequentially and
// concurrently, and reports the wall-clock for each.
//
// The serializer is the code-generated `GeneratedAstSerializer`, built once and
// shared across the server's request threads; serialization is thread-safe and
// lock-free (each request writes its own Jackson stream). So the concurrent
// batch should finish materially faster than the sequential one — if a shared
// lock serialized marshalling, the two would be roughly equal.
//
// Requires the parsing server to be running (pnpm run start-server).
//
// Usage:
//   pnpm run benchmark:concurrency [requests] [concurrency]
import { readFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const REQUESTS = Number(process.argv[2] ?? 64);
const CONCURRENCY = Number(process.argv[3] ?? 16);
const HOST = process.env["APEX_HOST"] ?? "localhost";
const PORT = Number(process.env["APEX_PORT"] ?? 2117);
const ENDPOINT = `http://${HOST}:${PORT}/api/ast/`;

const sourceCode = readFileSync(
  path.join(PKG_ROOT, "tests_perf/corpus/PerfBenchmarkLarge.cls"),
  "utf8",
).replace(/\r\n/g, "\n");

const body = JSON.stringify({
  sourceCode,
  anonymous: false,
  prettyPrint: false,
});

const parseOnce = async (): Promise<void> => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Parse request failed: ${response.status}`);
  }
  await response.text();
};

const runSequential = async (): Promise<number> => {
  const start = performance.now();
  for (let i = 0; i < REQUESTS; i += 1) {
    await parseOnce();
  }
  return performance.now() - start;
};

const runConcurrent = async (): Promise<number> => {
  const start = performance.now();
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < REQUESTS) {
      next += 1;
      await parseOnce();
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return performance.now() - start;
};

async function main(): Promise<void> {
  // Warm up so JIT / connection setup doesn't skew the first batch.
  await parseOnce();

  const sequentialMs = await runSequential();
  const concurrentMs = await runConcurrent();

  console.log(
    `Server concurrency — endpoint: ${ENDPOINT}, requests: ${REQUESTS}, concurrency: ${CONCURRENCY}\n`,
  );
  console.log("| Strategy | Wall-clock (ms) | Per request (ms) |");
  console.log("|---|---|---|");
  console.log(
    `| Sequential | ${sequentialMs.toFixed(1)} | ${(sequentialMs / REQUESTS).toFixed(1)} |`,
  );
  console.log(
    `| Concurrent | ${concurrentMs.toFixed(1)} | ${(concurrentMs / REQUESTS).toFixed(1)} |`,
  );
  console.log(
    `\nSpeed-up: ${(sequentialMs / concurrentMs).toFixed(2)}x (higher means parallelism is working)`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
