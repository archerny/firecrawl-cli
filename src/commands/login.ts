/**
 * Login command implementation
 * Handles API URL and API key authentication
 */

import { saveCredentials, getConfigDirectoryPath } from '../utils/credentials';
import { updateConfig } from '../utils/config';
import { interactiveLogin, isAuthenticated } from '../utils/auth';

export interface LoginOptions {
  apiKey?: string;
  apiUrl?: string;
}

/**
 * Main login command handler
 */
export async function handleLoginCommand(
  options: LoginOptions = {}
): Promise<void> {
  const apiUrl = options.apiUrl?.replace(/\/$/, '');

  // If already authenticated and no overrides provided, let them know
  if (isAuthenticated() && !options.apiKey && !options.apiUrl) {
    console.log('You are already logged in.');
    console.log(`Credentials stored at: ${getConfigDirectoryPath()}`);
    console.log('\nTo login with a different account, run:');
    console.log('  firecrawl logout');
    console.log('  firecrawl login');
    return;
  }

  // If both API key and URL provided directly, save them
  if (options.apiKey && apiUrl) {
    try {
      saveCredentials({
        apiKey: options.apiKey,
        apiUrl: apiUrl,
      });
      console.log('✓ Login successful!');

      updateConfig({
        apiKey: options.apiKey,
        apiUrl: apiUrl,
      });
    } catch (error) {
      console.error(
        'Error saving credentials:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      process.exit(1);
    }
    return;
  }

  // Interactive login - pass apiUrl if provided (will skip URL prompt)
  try {
    const result = await interactiveLogin(apiUrl);

    // Save credentials
    saveCredentials({
      apiKey: result.apiKey,
      apiUrl: result.apiUrl,
    });

    console.log('\n✓ Login successful!');

    updateConfig({
      apiKey: result.apiKey,
      apiUrl: result.apiUrl,
    });
  } catch (error) {
    console.error(
      '\nError:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}
