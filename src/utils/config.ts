/**
 * Global configuration system
 */

import { loadCredentials } from './credentials';

export interface GlobalConfig {
  apiKey?: string;
  apiUrl?: string;
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
 * Loads from: provided config > environment variables > OS credential storage
 * @param config Configuration options
 */
export function initializeConfig(config: Partial<GlobalConfig> = {}): void {
  // Priority: provided config > env vars > stored credentials
  const storedCredentials = loadCredentials();

  globalConfig = {
    apiKey:
      config.apiKey ||
      process.env.FIRECRAWL_API_KEY ||
      storedCredentials?.apiKey,
    apiUrl:
      config.apiUrl ||
      process.env.FIRECRAWL_API_URL ||
      storedCredentials?.apiUrl,
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
 * Priority: provided key > global config > env var > stored credentials
 */
export function getApiKey(providedKey?: string): string | undefined {
  if (providedKey) return providedKey;
  if (globalConfig.apiKey) return globalConfig.apiKey;
  if (process.env.FIRECRAWL_API_KEY) return process.env.FIRECRAWL_API_KEY;

  // Fallback to stored credentials if not already loaded
  const storedCredentials = loadCredentials();
  return storedCredentials?.apiKey;
}

/**
 * Get API URL from global config or provided value
 * Priority: provided url > global config > env var > stored credentials
 */
export function getApiUrl(providedUrl?: string): string | undefined {
  if (providedUrl) return providedUrl;
  if (globalConfig.apiUrl) return globalConfig.apiUrl;
  if (process.env.FIRECRAWL_API_URL) return process.env.FIRECRAWL_API_URL;

  const storedCredentials = loadCredentials();
  return storedCredentials?.apiUrl;
}

/**
 * Validate that required configuration is present
 * Both API key and API URL are required
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
}

/**
 * Reset global configuration (useful for testing)
 */
export function resetConfig(): void {
  globalConfig = {};
}
