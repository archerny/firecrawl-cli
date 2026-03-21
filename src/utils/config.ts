/**
 * Global configuration system
 */

import { loadSettings } from './settings';

export interface GlobalConfig {
  apiKey?: string;
  apiUrl?: string;
  dataDir?: string;
  timeoutMs?: number;
  maxRetries?: number;
  backoffFactor?: number;
}

/**
 * Global configuration instance
 */
let globalConfig: GlobalConfig = {};

/**
 * Initialize global configuration
 * Loads from: provided config > environment variables > OS settings storage
 * @param config Configuration options
 */
export function initializeConfig(config: Partial<GlobalConfig> = {}): void {
  // Priority: provided config > env vars > stored settings
  const storedSettings = loadSettings();

  globalConfig = {
    apiKey:
      config.apiKey || process.env.FIRECRAWL_API_KEY || storedSettings?.apiKey,
    apiUrl:
      config.apiUrl || process.env.FIRECRAWL_API_URL || storedSettings?.apiUrl,
    dataDir:
      config.dataDir ||
      process.env.FIRECRAWL_DATA_DIR ||
      storedSettings?.dataDir,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    backoffFactor: config.backoffFactor,
  };
}

/**
 * Get the current global configuration
 */
export function getConfig(): GlobalConfig {
  return { ...globalConfig };
}

/**
 * Update global configuration (merges with existing)
 */
export function updateConfig(config: Partial<GlobalConfig>): void {
  globalConfig = {
    ...globalConfig,
    ...config,
  };
}

/**
 * Get API key from global config or provided value
 * Priority: provided key > global config > env var > stored settings
 */
export function getApiKey(providedKey?: string): string | undefined {
  if (providedKey) return providedKey;
  if (globalConfig.apiKey) return globalConfig.apiKey;
  if (process.env.FIRECRAWL_API_KEY) return process.env.FIRECRAWL_API_KEY;

  // Fallback to stored settings if not already loaded
  const storedSettings = loadSettings();
  return storedSettings?.apiKey;
}

/**
 * Get API URL from global config or provided value
 * Priority: provided url > global config > env var > stored settings
 */
export function getApiUrl(providedUrl?: string): string | undefined {
  if (providedUrl) return providedUrl;
  if (globalConfig.apiUrl) return globalConfig.apiUrl;
  if (process.env.FIRECRAWL_API_URL) return process.env.FIRECRAWL_API_URL;

  const storedSettings = loadSettings();
  return storedSettings?.apiUrl;
}

/**
 * Get data directory from global config or provided value
 * Priority: provided dir > global config > env var > stored settings
 */
export function getDataDir(providedDir?: string): string | undefined {
  if (providedDir) return providedDir;
  if (globalConfig.dataDir) return globalConfig.dataDir;
  if (process.env.FIRECRAWL_DATA_DIR) return process.env.FIRECRAWL_DATA_DIR;

  const storedSettings = loadSettings();
  return storedSettings?.dataDir;
}

/**
 * Validate that required configuration is present
 * API key, API URL, and data directory are all required
 */
export function validateConfig(apiKey?: string): void {
  const key = getApiKey(apiKey);
  if (!key) {
    throw new Error(
      'API key is required. Set FIRECRAWL_API_KEY environment variable, use --api-key flag, or run "firecrawl config" to configure.'
    );
  }

  const url = getApiUrl();
  if (!url) {
    throw new Error(
      'API URL is required. Set FIRECRAWL_API_URL environment variable, use --api-url flag, or run "firecrawl config" to configure.'
    );
  }

  const dataDir = getDataDir();
  if (!dataDir) {
    throw new Error(
      'Data directory is required. Set FIRECRAWL_DATA_DIR environment variable, use --data-dir flag, or run "firecrawl config" to configure.'
    );
  }
}

/**
 * Reset global configuration (useful for testing)
 */
export function resetConfig(): void {
  globalConfig = {};
}
