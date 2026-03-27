/**
 * Config command implementation
 * Handles configuration and authentication
 */

import {
  loadSettings,
  saveSettings,
  getConfigDirectoryPath,
} from '../utils/settings';
import { getConfig, getDataDir, updateConfig } from '../utils/config';
import { isAuthenticated } from '../utils/auth';

export interface ConfigureOptions {
  apiKey?: string;
  apiUrl?: string;
  dataDir?: string;
}

/**
 * Configure - set API URL, API key, and data directory
 * All three must be provided via options. If any are missing, prints usage and exits.
 */
export async function configure(options: ConfigureOptions = {}): Promise<void> {
  // If no options provided and already authenticated, show current config
  if (!options.apiKey && !options.apiUrl && !options.dataDir) {
    if (isAuthenticated()) {
      await viewConfig();
      console.log(
        'To re-configure, run: firecrawl config --api-key <key> --api-url <url> --data-dir <dir>\n'
      );
      return;
    }

    // Not authenticated and no options - show usage
    console.error(
      'Error: All three options are required: --api-key, --api-url, --data-dir\n'
    );
    console.error('Usage:');
    console.error(
      '  firecrawl config --api-key <key> --api-url <url> --data-dir <dir>\n'
    );
    console.error('Example:');
    console.error(
      '  firecrawl config --api-key fc-xxx --api-url https://api.firecrawl.dev --data-dir /tmp/firecrawl\n'
    );
    process.exit(1);
  }

  // Some options provided but not all three - report what's missing
  if (!options.apiKey || !options.apiUrl || !options.dataDir) {
    const missing: string[] = [];
    if (!options.apiKey) missing.push('--api-key');
    if (!options.apiUrl) missing.push('--api-url');
    if (!options.dataDir) missing.push('--data-dir');

    console.error(`Error: Missing required option(s): ${missing.join(', ')}\n`);
    console.error('All three options must be provided together:');
    console.error(
      '  firecrawl config --api-key <key> --api-url <url> --data-dir <dir>\n'
    );
    process.exit(1);
  }

  // All three provided - save directly
  saveSettings({
    apiKey: options.apiKey,
    apiUrl: options.apiUrl,
    dataDir: options.dataDir,
  });
  updateConfig({
    apiKey: options.apiKey,
    apiUrl: options.apiUrl,
    dataDir: options.dataDir,
  });
  console.log('\n✓ Configuration saved successfully!\n');
}

/**
 * View current configuration (read-only)
 */
export async function viewConfig(): Promise<void> {
  const settings = loadSettings();
  const config = getConfig();

  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│          Firecrawl Configuration        │');
  console.log('└─────────────────────────────────────────┘\n');

  if (isAuthenticated()) {
    const maskedKey = settings?.apiKey
      ? `${settings.apiKey.substring(0, 6)}...${settings.apiKey.slice(-4)}`
      : 'Not set';

    console.log('Status: ✓ Configured\n');
    console.log(`API Key:   ${maskedKey}`);
    console.log(`API URL:   ${config.apiUrl || 'Not set'}`);
    console.log(`Data Dir:  ${getDataDir() || 'Not set'}`);
    console.log(`Config:    ${getConfigDirectoryPath()}`);
    console.log('\nCommands:');
    console.log('  firecrawl config       Re-configure');
    console.log('  firecrawl view-config  View configuration');
  } else {
    console.log('Status: Not configured\n');
    console.log('Run any command to start configuration, or use:');
    console.log(
      '  firecrawl config    Configure API URL, API key, and data directory'
    );
  }
  console.log('');
}
