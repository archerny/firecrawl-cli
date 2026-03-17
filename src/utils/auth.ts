/**
 * Authentication utilities
 * Provides automatic authentication prompts when credentials are missing
 */

import * as readline from 'readline';
import {
  loadCredentials,
  saveCredentials,
  getConfigDirectoryPath,
} from './credentials';
import { updateConfig, getApiKey, getApiUrl } from './config';

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
 * Perform manual login - prompts for API URL and API key
 * If apiUrl is already provided (e.g. via --api-url), skips the URL prompt
 */
async function manualLogin(
  apiUrl?: string
): Promise<{ apiKey: string; apiUrl: string }> {
  console.log('');

  // Prompt for API URL if not provided
  let effectiveApiUrl = apiUrl;
  if (!effectiveApiUrl) {
    effectiveApiUrl = await promptInput('Enter your API URL: ');
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

  return {
    apiKey: apiKey.trim(),
    apiUrl: effectiveApiUrl,
  };
}

/**
 * Use environment variables for authentication
 * Both FIRECRAWL_API_KEY and FIRECRAWL_API_URL must be set
 */
function envVarLogin(): { apiKey: string; apiUrl: string } | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  const apiUrl = process.env.FIRECRAWL_API_URL;
  if (apiKey && apiKey.length > 0 && apiUrl && apiUrl.length > 0) {
    return { apiKey, apiUrl };
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
 * Interactive login flow - prompts user to enter API URL and API key
 */
async function interactiveLogin(
  apiUrl?: string
): Promise<{ apiKey: string; apiUrl: string }> {
  // First check if env vars are set (both key and url)
  const envResult = envVarLogin();
  if (envResult) {
    printBanner();
    console.log(
      '✓ Using FIRECRAWL_API_KEY and FIRECRAWL_API_URL from environment variables\n'
    );
    return envResult;
  }

  printBanner();

  console.log(
    'Welcome! To get started, configure your Firecrawl credentials.\n'
  );
  printEnvHint();

  return manualLogin(apiUrl);
}

/**
 * Print hint about environment variables
 */
function printEnvHint(): void {
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  console.log(
    `${dim}Tip: You can also set FIRECRAWL_API_URL and FIRECRAWL_API_KEY environment variables${reset}\n`
  );
}

/**
 * Export banner for use in other places
 */
export { printBanner };

/**
 * Check if user is authenticated (both API key and API URL are set)
 */
export function isAuthenticated(): boolean {
  const apiKey = getApiKey();
  const apiUrl = getApiUrl();
  return !!apiKey && apiKey.length > 0 && !!apiUrl && apiUrl.length > 0;
}

/**
 * Ensure user is authenticated before running a command
 * If not authenticated, prompts for login
 * Returns the API key
 */
export async function ensureAuthenticated(): Promise<string> {
  // Check if we already have credentials
  const existingKey = getApiKey();
  if (existingKey) {
    return existingKey;
  }

  // No credentials found - prompt for login
  try {
    const result = await interactiveLogin();

    // Save credentials
    saveCredentials({
      apiKey: result.apiKey,
      apiUrl: result.apiUrl,
    });

    // Update global config
    updateConfig({
      apiKey: result.apiKey,
      apiUrl: result.apiUrl,
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
