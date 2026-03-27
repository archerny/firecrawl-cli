/**
 * Authentication utilities
 * Checks configuration and reports missing settings with clear instructions
 */

import { getConfigDirectoryPath } from './settings';
import { getApiKey, getApiUrl, getDataDir } from './config';

/**
 * Print the Firecrawl CLI banner
 */
function printBanner(): void {
  const orange = '\x1b[38;5;208m';
  const reset = '\x1b[0m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';

  // Get version from package.json
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const packageJson = require('../../package.json');
  const version = packageJson.version || 'unknown';

  console.log('');
  console.log(
    `  ${orange}🔥 ${bold}firecrawl${reset} ${dim}cli${reset} ${dim}v${version}${reset}`
  );
  console.log(`  ${dim}Turn websites into LLM-ready data${reset}`);
  console.log('');
}

/**
 * Export banner for use in other places
 */
export { printBanner };

/**
 * Check if user is fully configured (API key, API URL, and data directory are all set)
 */
export function isAuthenticated(): boolean {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  const dataDir = getDataDir();
  return (
    !!apiKey &&
    apiKey.length > 0 &&
    !!apiUrl &&
    apiUrl.length > 0 &&
    !!dataDir &&
    dataDir.length > 0
  );
}

/**
 * Build a detailed error message listing missing configuration items
 * and all available configuration methods
 */
function buildMissingConfigMessage(): string {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  const dataDir = getDataDir();

  const missing: string[] = [];
  if (!apiKey) missing.push('API Key');
  if (!apiUrl) missing.push('API URL');
  if (!dataDir) missing.push('Data Directory');

  const lines: string[] = [
    `Error: Missing required configuration: ${missing.join(', ')}`,
    '',
    'Configure using one of the following methods:',
    '',
    '  1. Environment variables:',
    '     export FIRECRAWL_API_KEY="your-api-key"',
    '     export FIRECRAWL_API_URL="https://api.firecrawl.dev"',
    '     export FIRECRAWL_DATA_DIR="/path/to/data"',
    '',
    '  2. Command-line flags:',
    '     node bundle/index.cjs --api-key <key> --api-url <url> scrape <url>',
    '',
    '  3. Config command (saves to settings file):',
    '     node bundle/index.cjs config --api-key <key> --api-url <url> --data-dir <dir>',
    '',
    `  Settings file: ${getConfigDirectoryPath()}/settings.json`,
  ];

  return lines.join('\n');
}

/**
 * Ensure user is fully configured before running a command
 * If not configured, prints an error with configuration instructions and exits
 * Returns the API key
 */
export function ensureAuthenticated(): string {
  const existingKey = getApiKey();
  const existingUrl = getApiUrl();
  const existingDataDir = getDataDir();
  if (existingKey && existingUrl && existingDataDir) {
    return existingKey;
  }

  console.error(buildMissingConfigMessage());
  process.exit(1);
}
