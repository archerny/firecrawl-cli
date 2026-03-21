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
import { isAuthenticated, manualLogin } from '../utils/auth';

export interface ConfigureOptions {
  apiKey?: string;
  apiUrl?: string;
  dataDir?: string;
}

/**
 * Configure - set API URL, API key, and data directory
 * If all three are provided via options, saves directly.
 * Otherwise, triggers interactive prompt.
 */
export async function configure(options: ConfigureOptions = {}): Promise<void> {
  // If not authenticated or explicit options provided, trigger config flow
  if (
    !isAuthenticated() ||
    options.apiKey ||
    options.apiUrl ||
    options.dataDir
  ) {
    // If all three are provided, save directly
    if (options.apiKey && options.apiUrl && options.dataDir) {
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
      return;
    }

    // Interactive flow - prompt for missing values
    try {
      const result = await manualLogin(options.apiUrl, options.dataDir);
      saveSettings({
        apiKey: result.apiKey,
        apiUrl: result.apiUrl,
        dataDir: result.dataDir,
      });
      updateConfig({
        apiKey: result.apiKey,
        apiUrl: result.apiUrl,
        dataDir: result.dataDir,
      });
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
