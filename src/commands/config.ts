/**
 * Config command implementation
 * Handles configuration and authentication
 */

import {
  loadCredentials,
  saveCredentials,
  getConfigDirectoryPath,
} from '../utils/credentials';
import { getConfig, updateConfig } from '../utils/config';
import { isAuthenticated, manualLogin } from '../utils/auth';

export interface ConfigureOptions {
  apiKey?: string;
  apiUrl?: string;
}

/**
 * Configure - set API URL and API key
 * If both are provided via options, saves directly.
 * Otherwise, triggers interactive prompt.
 */
export async function configure(options: ConfigureOptions = {}): Promise<void> {
  // If not authenticated or explicit options provided, trigger config flow
  if (!isAuthenticated() || options.apiKey || options.apiUrl) {
    // If both key and url are provided, save directly
    if (options.apiKey && options.apiUrl) {
      saveCredentials({ apiKey: options.apiKey, apiUrl: options.apiUrl });
      updateConfig({ apiKey: options.apiKey, apiUrl: options.apiUrl });
      console.log('\n✓ Configuration saved successfully!\n');
      return;
    }

    // Interactive flow - prompt for missing values
    try {
      const result = await manualLogin(options.apiUrl);
      saveCredentials({ apiKey: result.apiKey, apiUrl: result.apiUrl });
      updateConfig({ apiKey: result.apiKey, apiUrl: result.apiUrl });
      console.log('\n✓ Configuration saved successfully!\n');
    } catch (error) {
      console.error(
        '\nConfiguration failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      process.exit(1);
    }
    return;
  }

  // Already authenticated - show current config
  await viewConfig();
  console.log('To re-configure, run: firecrawl config --api-key <key>\n');
}

/**
 * View current configuration (read-only)
 */
export async function viewConfig(): Promise<void> {
  const credentials = loadCredentials();
  const config = getConfig();

  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│          Firecrawl Configuration        │');
  console.log('└─────────────────────────────────────────┘\n');

  if (isAuthenticated()) {
    const maskedKey = credentials?.apiKey
      ? `${credentials.apiKey.substring(0, 6)}...${credentials.apiKey.slice(-4)}`
      : 'Not set';

    console.log('Status: ✓ Authenticated\n');
    console.log(`API Key:  ${maskedKey}`);
    console.log(`API URL:  ${config.apiUrl || 'Not set'}`);
    console.log(`Config:   ${getConfigDirectoryPath()}`);
    console.log('\nCommands:');
    console.log('  firecrawl config       Re-configure');
    console.log('  firecrawl view-config  View configuration');
  } else {
    console.log('Status: Not authenticated\n');
    console.log('Run any command to start authentication, or use:');
    console.log('  firecrawl config    Configure API URL and API key');
  }
  console.log('');
}
