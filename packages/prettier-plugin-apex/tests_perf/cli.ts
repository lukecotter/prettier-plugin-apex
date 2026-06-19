#!/usr/bin/env -S tsx
//
// Cold, end-to-end CLI benchmark for prettier-plugin-apex.
//
// Where run.ts measures warm in-process `prettier.format()` (and splits it into
// buckets), this measures the wall-clock of a full `prettier --check`
// invocation via hyperfine — Node startup + plugin load + parse + format — which
// is what a user actually feels from the command line or a pre-commit hook.
//
// It benchmarks the plugin's default `native` mode unless `--modes` overrides
// it, reusing the same corpus as run.ts (the generated large class plus a few
// real fixtures).
//
// Prerequisites: a built dist (`pnpm run build`) and `hyperfine` on PATH. The
// built-in mode also needs the parser server running (`pnpm run start-server`).
//
// Usage:
//   pnpm run benchmark:cli [--modes native,built-in] [--warmup N] [--runs N]
//
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const PLUGIN = "./dist/src/index.js";

// Reuses run.ts's corpus: the generated large class on its own (the single-file
// format-on-save case) and the full mixed set (a small multi-file project run).
const LARGE_FILE = "tests_perf/corpus/PerfBenchmarkLarge.cls";
const CORPUS = [
  "tests/comments/Comments.cls",
  "tests/soql/SOQLClass.cls",
  "tests/expression/ExpressionClass.cls",
  LARGE_FILE,
];
const TARGETS: { name: string; files: string[] }[] = [
  { name: "single-large-file", files: [LARGE_FILE] },
  { name: "corpus", files: CORPUS },
];

function parseFlags(argv: string[]): {
  modes: string[];
  warmup: number;
  runs: number;
} {
  let modes = ["native"];
  let warmup = 2;
  let runs = 8;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--modes") modes = String(argv[++i]).split(",");
    else if (a === "--warmup") warmup = Number(argv[++i]);
    else if (a === "--runs") runs = Number(argv[++i]);
  }
  return { modes, warmup, runs };
}

function hyperfinePresent(): boolean {
  return (
    spawnSync("hyperfine", ["--version"], { stdio: "ignore" }).status === 0
  );
}

function gitSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: PKG_ROOT,
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function main(): void {
  const { modes, warmup, runs } = parseFlags(process.argv.slice(2));

  if (!existsSync(path.join(PKG_ROOT, "dist/src/index.js"))) {
    console.error(
      "Built plugin not found at dist/src/index.js — run `pnpm run build` first.",
    );
    process.exit(1);
  }
  if (!hyperfinePresent()) {
    console.error(
      "hyperfine is not on PATH — install it to run this benchmark.",
    );
    process.exit(1);
  }

  const require = module.createRequire(import.meta.url);
  const prettierBin = require.resolve("prettier/bin/prettier.cjs");
  const resultsDir = path.join(PKG_ROOT, "tests_perf", "results");
  mkdirSync(resultsDir, { recursive: true });
  const sha = gitSha();

  console.log(
    `Cold CLI benchmark — modes: ${modes.join(", ")}, ${warmup} warmup + ${runs} runs/target`,
  );

  for (const mode of modes) {
    for (const target of TARGETS) {
      const exportPath = path.join(
        resultsDir,
        `cli-${mode}-${target.name}-${sha}.json`,
      );
      const command =
        `node ${prettierBin} --no-config --plugin=${PLUGIN} ` +
        `--apex-standalone-parser ${mode} --check ${target.files.join(" ")}`;
      // --ignore-failure: `--check` exits non-zero when a file would be
      // reformatted, which is irrelevant to timing.
      spawnSync(
        "hyperfine",
        [
          "--warmup",
          String(warmup),
          "--runs",
          String(runs),
          "--ignore-failure",
          "--export-json",
          exportPath,
          command,
        ],
        { cwd: PKG_ROOT, stdio: "inherit" },
      );
    }
  }

  console.log(`\nResults written to ${resultsDir} (suffix -${sha}.json)`);
}

main();
