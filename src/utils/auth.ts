/**
 * Authentication utilities
 * Provides automatic authentication prompts when settings are missing
 */

import * as readline from 'readline';
import { saveSettings, getConfigDirectoryPath } from './settings';
import { updateConfig, getApiKey, getApiUrl, getDataDir } from './config';

/**
 * Prompt for input
 */
function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Perform manual login - prompts for API URL, API key, and data directory
 * If apiUrl is already provided (e.g. via --api-url), skips the URL prompt
 * If dataDir is already provided (e.g. via --data-dir), skips the data dir prompt
 */
async function manualLogin(
  apiUrl?: string,
  dataDir?: string
): Promise<{ apiKey: string; apiUrl: string; dataDir: string }> {
  console.log('');

  // Prompt for API URL if not provided
  let effectiveApiUrl = apiUrl;
  if (!effectiveApiUrl) {
    effectiveApiUrl = await promptInput(
      'Enter your API URL (e.g. https://api.firecrawl.dev): '
    );
    if (!effectiveApiUrl || effectiveApiUrl.trim().length === 0) {
      throw new Error('API URL cannot be empty');
    }
    effectiveApiUrl = effectiveApiUrl.trim().replace(/\/$/, '');
  }

  // Prompt for API key
  const apiKey = await promptInput('Enter your API key: ');

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key cannot be empty');
  }

  // Prompt for data directory if not provided
  let effectiveDataDir = dataDir;
  if (!effectiveDataDir) {
    effectiveDataDir = await promptInput(
      'Enter data directory (where scraped data will be stored): '
    );
    if (!effectiveDataDir || effectiveDataDir.trim().length === 0) {
      throw new Error('Data directory cannot be empty');
    }
    effectiveDataDir = effectiveDataDir.trim();
  }

  return {
    apiKey: apiKey.trim(),
    apiUrl: effectiveApiUrl,
    dataDir: effectiveDataDir,
  };
}

/**
 * Use environment variables for authentication
 * FIRECRAWL_API_KEY, FIRECRAWL_API_URL, and FIRECRAWL_DATA_DIR must all be set
 */
function envVarLogin(): {
  apiKey: string;
  apiUrl: string;
  dataDir: string;
} | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  const apiUrl = process.env.FIRECRAWL_API_URL;
  const dataDir = process.env.FIRECRAWL_DATA_DIR;
  if (
    apiKey &&
    apiKey.length > 0 &&
    apiUrl &&
    apiUrl.length > 0 &&
    dataDir &&
    dataDir.length > 0
  ) {
    return { apiKey, apiUrl, dataDir };
  }
  return null;
}

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
 * Interactive login flow - prompts user to enter API URL, API key, and data directory
 */
async function interactiveLogin(
  apiUrl?: string,
  dataDir?: string
): Promise<{ apiKey: string; apiUrl: string; dataDir: string }> {
  // First check if env vars are set (all three: key, url, dataDir)
  const envResult = envVarLogin();
  if (envResult) {
    printBanner();
    console.log(
      '✓ Using FIRECRAWL_API_KEY, FIRECRAWL_API_URL, and FIRECRAWL_DATA_DIR from environment variables\n'
    );
    return envResult;
  }

  printBanner();

  console.log('Welcome! To get started, configure your Firecrawl settings.\n');
  printEnvHint();

  return manualLogin(apiUrl, dataDir);
}

/**
 * Print hint about environment variables
 */
function printEnvHint(): void {
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  console.log(
    `${dim}Tip: You can also set FIRECRAWL_API_URL, FIRECRAWL_API_KEY, and FIRECRAWL_DATA_DIR environment variables${reset}\n`
  );
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
 * Ensure user is fully configured before running a command
 * If not configured, prompts for login (API key, API URL, and data directory)
 * Returns the API key
 */
export async function ensureAuthenticated(): Promise<string> {
  // Check if we already have all settings
  const existingKey = getApiKey();
  const existingUrl = getApiUrl();
  const existingDataDir = getDataDir();
  if (existingKey && existingUrl && existingDataDir) {
    return existingKey;
  }

  // Missing settings - prompt for login
  try {
    const result = await interactiveLogin();

    // Save settings
    saveSettings({
      apiKey: result.apiKey,
      apiUrl: result.apiUrl,
      dataDir: result.dataDir,
    });

    // Update global config
    updateConfig({
      apiKey: result.apiKey,
      apiUrl: result.apiUrl,
      dataDir: result.dataDir,
    });

    console.log('\n✓ Login successful!');

    return result.apiKey;
  } catch (error) {
    console.error(
      '\nAuthentication failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}

/**
 * Export for direct login command usage
 */
export { manualLogin, interactiveLogin };
