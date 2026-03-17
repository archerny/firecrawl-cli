/**
 * Login command implementation
 * Handles manual API key entry authentication
 */

import { saveCredentials, getConfigDirectoryPath } from '../utils/credentials';
import { updateConfig, getApiKey, DEFAULT_API_URL } from '../utils/config';
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
  const apiUrl = options.apiUrl?.replace(/\/$/, '') || DEFAULT_API_URL;
  const isCustomUrl = apiUrl !== DEFAULT_API_URL;

  // If already authenticated, let them know
  if (isAuthenticated() && !options.apiKey && !isCustomUrl) {
    console.log('You are already logged in.');
    console.log(`Credentials stored at: ${getConfigDirectoryPath()}`);
    console.log('\nTo login with a different account, run:');
    console.log('  firecrawl logout');
    console.log('  firecrawl login');
    return;
  }

  // If only a custom --api-url is provided (no --api-key), persist the new URL
  // alongside the existing API key rather than starting an interactive login flow.
  if (isCustomUrl && !options.apiKey) {
    const existingApiKey = getApiKey();
    try {
      saveCredentials({
        apiKey: existingApiKey,
        apiUrl: apiUrl,
      });
      updateConfig({ apiKey: existingApiKey, apiUrl });
      console.log('✓ API URL updated successfully!');
    } catch (error) {
      console.error(
        'Error saving credentials:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      process.exit(1);
    }
    return;
  }

  // If API key provided directly, save it
  if (options.apiKey) {
    // Only validate fc- prefix for cloud API
    if (!isCustomUrl && !options.apiKey.startsWith('fc-')) {
      console.error(
        'Error: Invalid API key format. API keys should start with "fc-"'
      );
      process.exit(1);
    }

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

  try {
    const result = await interactiveLogin(apiUrl);

    // Save credentials
    saveCredentials({
      apiKey: result.apiKey,
      apiUrl: result.apiUrl || apiUrl,
    });

    console.log('\n✓ Login successful!');

    updateConfig({
      apiKey: result.apiKey,
      apiUrl: result.apiUrl || apiUrl,
    });
  } catch (error) {
    console.error(
      '\nError:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}
