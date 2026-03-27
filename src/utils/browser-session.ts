/**
 * Browser session persistence utility
 * Stores active browser session info in the user-configured data directory
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDataDir } from './config';

export interface StoredBrowserSession {
  id: string;
  cdpUrl: string;
  createdAt: string;
}

/**
 * Get the browser session file path inside the data directory.
 * Returns null if dataDir is not configured.
 */
function getSessionPath(): string | null {
  const dataDir = getDataDir();
  if (!dataDir) return null;
  return path.join(path.resolve(dataDir), 'browser-session.json');
}

/**
 * Ensure the data directory exists
 */
function ensureDataDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save active browser session to disk
 */
export function saveBrowserSession(session: StoredBrowserSession): void {
  const sessionPath = getSessionPath();
  if (!sessionPath) {
    throw new Error(
      'Data directory is not configured. Run "node bundle/index.cjs config" to set it up.'
    );
  }
  ensureDataDir(path.dirname(sessionPath));
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
}

/**
 * Load stored browser session from disk
 */
export function loadBrowserSession(): StoredBrowserSession | null {
  try {
    const sessionPath = getSessionPath();
    if (!sessionPath || !fs.existsSync(sessionPath)) {
      return null;
    }
    const data = fs.readFileSync(sessionPath, 'utf-8');
    return JSON.parse(data) as StoredBrowserSession;
  } catch {
    return null;
  }
}

/**
 * Clear stored browser session from disk
 */
export function clearBrowserSession(): void {
  try {
    const sessionPath = getSessionPath();
    if (sessionPath && fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Resolve session ID from override flag or stored session
 */
export function getSessionId(overrideId?: string): string {
  if (overrideId) return overrideId;

  const stored = loadBrowserSession();
  if (stored) return stored.id;

  throw new Error(
    'No active browser session. Launch one with: node bundle/index.cjs browser launch-session\n' +
      'Or specify a session ID with: --session <id>'
  );
}
