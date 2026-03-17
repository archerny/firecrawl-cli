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
import { updateConfig, getApiKey, DEFAULT_API_URL } from './config';

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
 * Perform manual API key login
 * For custom API URLs (local development), API key is optional
 */
async function manualLogin(
  apiUrl: string = DEFAULT_API_URL
): Promise<{ apiKey: string; apiUrl: string }> {
  const isCustomUrl = apiUrl !== DEFAULT_API_URL;

  console.log('');

  if (isCustomUrl) {
    const apiKey = await promptInput(
      'Enter your API key (press Enter to skip): '
    );
    return {
      apiKey: apiKey.trim(),
      apiUrl,
    };
  }

  const apiKey = await promptInput('Enter your Firecrawl API key: ');

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key cannot be empty');
  }

  if (!apiKey.startsWith('fc-')) {
    throw new Error('Invalid API key format. API keys should start with "fc-"');
  }

  return {
    apiKey: apiKey.trim(),
    apiUrl,
  };
}

/**
 * Use environment variable for authentication
 */
function envVarLogin(): { apiKey: string; apiUrl: string } | null {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey && apiKey.length > 0) {
    return {
      apiKey,
      apiUrl: process.env.FIRECRAWL_API_URL || DEFAULT_API_URL,
    };
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
 * Interactive login flow - prompts user to enter API key
 */
async function interactiveLogin(
  apiUrl?: string
): Promise<{ apiKey: string; apiUrl: string }> {
  const effectiveApiUrl = apiUrl || DEFAULT_API_URL;

  // First check if env var is set
  const envResult = envVarLogin();
  if (envResult) {
    printBanner();
    console.log('✓ Using FIRECRAWL_API_KEY from environment variable\n');
    return envResult;
  }

  printBanner();

  console.log(
    'Welcome! To get started, authenticate with your Firecrawl account.\n'
  );
  printEnvHint();

  return manualLogin(effectiveApiUrl);
}

/**
 * Print hint about environment variable
 */
function printEnvHint(): void {
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  console.log(
    `${dim}Tip: You can also set FIRECRAWL_API_KEY environment variable${reset}\n`
  );
}

/**
 * Export banner for use in other places
 */
export { printBanner };

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const apiKey = getApiKey();
  return !!apiKey && apiKey.length > 0;
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
