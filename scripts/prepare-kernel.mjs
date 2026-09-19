#!/usr/bin/env node

/**
 * Atrium // Kernel preparation
 *
 * Ensures the vendored deepseek-harness checkout is installed and built so the
 * desktop bridge can spawn `dsh --profile sdk` from apps/cli/lib/bin.js.
 * Idempotent: skips work when the built CLI already matches the checkout.
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const DSH_DIR = resolve(ROOT, 'deepseek-harness')
const DSH_BIN = resolve(DSH_DIR, 'apps', 'cli', 'lib', 'bin.js')
const SDK_CLIENT = resolve(DSH_DIR, 'packages', 'sdk', 'client', 'lib', 'index.js')

console.log('[ATRIUM] preparing DeepSeek Harness kernel at', DSH_DIR)

if (!existsSync(DSH_DIR)) {
  console.error('[ATRIUM][FAIL] deepseek-harness/ is missing. Run `pnpm run sync:upstream` first.')
  process.exit(1)
}

if (existsSync(DSH_BIN) && existsSync(SDK_CLIENT)) {
  console.log('[ATRIUM][PASS] kernel already built:', DSH_BIN)
  process.exit(0)
}

console.log('[ATRIUM] installing kernel workspace dependencies (pnpm install)...')
execSync('pnpm install', { cwd: DSH_DIR, stdio: 'inherit' })

console.log('[ATRIUM] building kernel artifacts (pnpm run build)...')
execSync('pnpm run build', { cwd: DSH_DIR, stdio: 'inherit' })

if (!existsSync(DSH_BIN)) {
  console.error('[ATRIUM][FAIL] kernel build finished but the CLI entry is missing:', DSH_BIN)
  process.exit(1)
}

console.log('[ATRIUM][READY] kernel prepared:', DSH_BIN)
