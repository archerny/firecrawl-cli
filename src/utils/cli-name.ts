/**
 * CLI name utility
 * Dynamically resolves the command name based on how the CLI was invoked,
 * so help text and error messages show the correct command.
 *
 * Examples:
 *   node bundle/index.cjs  → "node bundle/index.cjs"
 *   node scripts/index.js  → "node scripts/index.js"
 *   node dist/index.js     → "node dist/index.js"
 *   firecrawl              → "firecrawl"
 */

import * as path from 'path';

let cachedCliName: string | undefined;

/**
 * Get the CLI command name based on how the process was invoked.
 * The result is cached after the first call.
 */
export function getCliName(): string {
  if (cachedCliName !== undefined) return cachedCliName;

  const argv = process.argv;

  // process.argv[0] = node executable path
  // process.argv[1] = script path (e.g. /abs/path/to/bundle/index.cjs)
  if (argv.length >= 2) {
    const scriptPath = argv[1];

    // Try to make the script path relative to cwd for a cleaner display
    const relativePath = path.relative(process.cwd(), scriptPath);

    // If the relative path is simpler (doesn't start with too many ../),
    // use it; otherwise use the absolute path
    const displayPath =
      !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
        ? relativePath
        : scriptPath;

    cachedCliName = `node ${displayPath}`;
  } else {
    cachedCliName = 'firecrawl';
  }

  return cachedCliName;
}

/**
 * Reset cached CLI name (useful for testing)
 */
export function resetCliName(): void {
  cachedCliName = undefined;
}

/**
 * Override the CLI name (useful for testing or custom setups)
 */
export function setCliName(name: string): void {
  cachedCliName = name;
}
