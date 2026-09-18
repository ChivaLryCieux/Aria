#!/usr/bin/env node

/**
 * Aria // Desktop Packaging & Runtime Preparation Utility
 *
 * Prepares and validates the desktop distribution environment before running
 * `tauri build`. Ensures Vite assets are compiled, DSH sidecar scripts are staged,
 * and workspace package outputs are ready.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT_DIR = process.cwd();

console.log("\x1b[36m========================================================\x1b[0m");
console.log("\x1b[1m[ARIA // 智役：咏叹终端] RUNTIME PREPARATION & BUNDLING\x1b[0m");
console.log("\x1b[36m========================================================\x1b[0m\n");

// 1. Check frontend assets
console.log("[CHECK] Verifying frontend bundle dist/...");
const distIndex = resolve(ROOT_DIR, "dist/index.html");
if (!existsSync(distIndex)) {
  console.log("[BUILD] Building frontend distribution via vite...");
  execSync("pnpm run build", { cwd: ROOT_DIR, stdio: "inherit" });
} else {
  console.log("\x1b[32m[PASS] Frontend dist/index.html found.\x1b[0m");
}

// 2. Check DSH Daemon bootstrap script
console.log("[CHECK] Verifying DSH daemon entry scripts/dsh-daemon.mjs...");
const daemonScript = resolve(ROOT_DIR, "scripts/dsh-daemon.mjs");
if (existsSync(daemonScript)) {
  console.log("\x1b[32m[PASS] DSH daemon entry script verified.\x1b[0m");
} else {
  console.error("\x1b[31m[FAIL] Missing scripts/dsh-daemon.mjs.\x1b[0m");
  process.exit(1);
}

// 3. Verify packages
const packages = ["aria-core", "aria-desktop-host", "aria-dsh-plugin"];
for (const pkg of packages) {
  const pkgJson = resolve(ROOT_DIR, `packages/${pkg}/package.json`);
  if (existsSync(pkgJson)) {
    console.log(`\x1b[32m[PASS] Workspace package ${pkg} verified.\x1b[0m`);
  } else {
    console.error(`\x1b[31m[FAIL] Missing workspace package: packages/${pkg}\x1b[0m`);
    process.exit(1);
  }
}

// 4. Verify Tauri configuration
const tauriConf = resolve(ROOT_DIR, "src-tauri/tauri.conf.json");
if (existsSync(tauriConf)) {
  console.log("\x1b[32m[PASS] Tauri configuration (tauri.conf.json) verified.\x1b[0m");
} else {
  console.error("\x1b[31m[FAIL] Missing src-tauri/tauri.conf.json\x1b[0m");
  process.exit(1);
}

console.log("\n\x1b[32m[READY] Desktop runtime environment ready for 'tauri build'.\x1b[0m\n");
