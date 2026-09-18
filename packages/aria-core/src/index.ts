import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const ARIA_CORE_ROOT = resolve(__dirname, '..');
export const ARIA_DESKTOP_PROFILE_DIR = resolve(ARIA_CORE_ROOT, 'profiles', 'aria-desktop');
export const ARIA_DESKTOP_PATCH_FILE = resolve(ARIA_DESKTOP_PROFILE_DIR, 'cordis.patch.yml');

export const ARIA_PROFILE_NAME = 'aria-desktop';
export const ARIA_DEFAULT_PORT = 19387;

export interface AriaHarnessConfig {
  port: number;
  host: string;
  profile: string;
  profileDir: string;
  patchFile: string;
}

export function getAriaHarnessConfig(port: number = ARIA_DEFAULT_PORT): AriaHarnessConfig {
  return {
    port,
    host: '127.0.0.1',
    profile: ARIA_PROFILE_NAME,
    profileDir: ARIA_DESKTOP_PROFILE_DIR,
    patchFile: ARIA_DESKTOP_PATCH_FILE,
  };
}
