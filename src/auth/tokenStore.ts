import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in seconds
  client_id: string;
}

const CREDENTIALS_DIR = join(homedir(), '.eremos');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function bestEffortChmod(path: string, mode: number): void {
  // Windows has different permission semantics. Best-effort only.
  if (platform() === 'win32') return;
  try {
    chmodSync(path, mode);
  } catch {
    // ignore
  }
}

function validateTokens(tokens: StoredTokens): void {
  if (!tokens.access_token || typeof tokens.access_token !== 'string') throw new Error('Invalid access_token');
  if (!tokens.refresh_token || typeof tokens.refresh_token !== 'string') throw new Error('Invalid refresh_token');
  if (!Number.isFinite(tokens.expires_at)) throw new Error('Invalid expires_at');
  if (!tokens.client_id || typeof tokens.client_id !== 'string') throw new Error('Invalid client_id');
}

/**
 * Save tokens to local file storage (~/.eremos/credentials.json)
 *
 * Security properties:
 * - Reject symlinks for dir/file (defense against local link attacks)
 * - Best-effort restrictive permissions (0700 dir / 0600 file) on non-Windows
 * - Atomic write (tmp file + rename)
 */
export function saveTokens(tokens: StoredTokens): void {
  validateTokens(tokens);

  if (existsSync(CREDENTIALS_DIR) && isSymlink(CREDENTIALS_DIR)) {
    throw new Error(`Refusing to use symlinked credentials directory: ${CREDENTIALS_DIR}`);
  }

  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }

  bestEffortChmod(CREDENTIALS_DIR, 0o700);

  if (existsSync(CREDENTIALS_FILE) && isSymlink(CREDENTIALS_FILE)) {
    throw new Error(`Refusing to write to symlinked credentials file: ${CREDENTIALS_FILE}`);
  }

  const tmpFile = join(CREDENTIALS_DIR, `credentials.${process.pid}.${Date.now()}.tmp`);

  // Create with restrictive mode where supported.
  writeFileSync(tmpFile, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  bestEffortChmod(tmpFile, 0o600);

  // Atomic replace. On Windows, rename may fail if destination exists.
  try {
    renameSync(tmpFile, CREDENTIALS_FILE);
  } catch {
    try {
      unlinkSync(CREDENTIALS_FILE);
    } catch {
      // ignore
    }
    renameSync(tmpFile, CREDENTIALS_FILE);
  }

  bestEffortChmod(CREDENTIALS_FILE, 0o600);
}

/**
 * Load tokens from local file storage
 */
export function loadTokens(): StoredTokens | null {
  if (!existsSync(CREDENTIALS_FILE)) return null;
  if (isSymlink(CREDENTIALS_FILE)) throw new Error(`Refusing to read symlinked credentials file: ${CREDENTIALS_FILE}`);

  try {
    const content = readFileSync(CREDENTIALS_FILE, 'utf-8');
    const parsed = JSON.parse(content) as Partial<StoredTokens>;

    if (
      !parsed ||
      typeof parsed.access_token !== 'string' ||
      typeof parsed.refresh_token !== 'string' ||
      typeof parsed.client_id !== 'string' ||
      typeof parsed.expires_at !== 'number'
    ) {
      return null;
    }

    return parsed as StoredTokens;
  } catch {
    return null;
  }
}

/**
 * Delete stored tokens (logout)
 *
 * Note: secure deletion is not guaranteed on modern filesystems/SSDs.
 */
export function deleteTokens(): void {
  if (!existsSync(CREDENTIALS_FILE)) return;
  if (isSymlink(CREDENTIALS_FILE)) throw new Error(`Refusing to delete symlinked credentials file: ${CREDENTIALS_FILE}`);

  try {
    unlinkSync(CREDENTIALS_FILE);
  } catch {
    // ignore
  }
}

/**
 * Check if tokens are expired (with 60s buffer)
 */
export function isTokenExpired(tokens: StoredTokens): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= tokens.expires_at - 60;
}
