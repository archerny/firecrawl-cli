/**
 * Tests for config fallback priority
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initializeConfig,
  getConfig,
  resetConfig,
  updateConfig,
  validateConfig,
} from '../../utils/config';
import { getClient, resetClient } from '../../utils/client';
import * as settings from '../../utils/settings';

// Mock settings module
vi.mock('../../utils/settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

describe('Config Fallback Priority', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset everything before each test
    resetClient();
    resetConfig();
    vi.clearAllMocks();

    // Clear env vars
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_URL;
    delete process.env.FIRECRAWL_DATA_DIR;

    // Mock loadSettings to return null by default
    vi.mocked(settings.loadSettings).mockReturnValue(null);
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('initializeConfig fallback priority', () => {
    it('should prioritize provided config over env vars', () => {
      process.env.FIRECRAWL_API_KEY = 'env-api-key';
      process.env.FIRECRAWL_API_URL = 'https://env-api-url.com';

      initializeConfig({
        apiKey: 'provided-api-key',
        apiUrl: 'https://provided-api-url.com',
      });

      const config = getConfig();
      expect(config.apiKey).toBe('provided-api-key');
      expect(config.apiUrl).toBe('https://provided-api-url.com');
    });

    it('should use env vars when provided config is not set', () => {
      process.env.FIRECRAWL_API_KEY = 'env-api-key';
      process.env.FIRECRAWL_API_URL = 'https://env-api-url.com';

      initializeConfig({});

      const config = getConfig();
      expect(config.apiKey).toBe('env-api-key');
      expect(config.apiUrl).toBe('https://env-api-url.com');
    });

    it('should fallback to stored settings when env vars are not set', () => {
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'stored-api-key',
        apiUrl: 'https://stored-api-url.com',
      });

      initializeConfig({});

      const config = getConfig();
      expect(config.apiKey).toBe('stored-api-key');
      expect(config.apiUrl).toBe('https://stored-api-url.com');
    });

    it('should prioritize provided config > env vars > stored settings', () => {
      process.env.FIRECRAWL_API_KEY = 'env-api-key';
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'stored-api-key',
      });

      // Provided config should win
      initializeConfig({ apiKey: 'provided-api-key' });
      expect(getConfig().apiKey).toBe('provided-api-key');

      // Reset and test env var priority
      resetConfig();
      initializeConfig({});
      expect(getConfig().apiKey).toBe('env-api-key');

      // Reset and test stored settings fallback
      resetConfig();
      delete process.env.FIRECRAWL_API_KEY;
      initializeConfig({});
      expect(getConfig().apiKey).toBe('stored-api-key');
    });
  });

  describe('getClient fallback priority', () => {
    beforeEach(() => {
      // Set up base config
      initializeConfig({
        apiKey: 'global-api-key',
        apiUrl: 'https://global-url.com',
        dataDir: '/tmp/firecrawl-data',
      });
    });

    it('should prioritize options over global config', () => {
      const client = getClient({ apiKey: 'option-api-key' });

      // Verify client was created with option API key
      // We can't directly inspect the client, but we can check the config was updated
      const config = getConfig();
      expect(config.apiKey).toBe('option-api-key');
    });

    it('should use global config when options not provided', () => {
      getClient();

      const config = getConfig();
      expect(config.apiKey).toBe('global-api-key');
      expect(config.apiUrl).toBe('https://global-url.com');
    });

    it('should merge options with global config', () => {
      initializeConfig({
        apiKey: 'global-api-key',
        apiUrl: 'https://global-url.com',
        dataDir: '/tmp/firecrawl-data',
        timeoutMs: 30000,
      });

      getClient({ apiKey: 'option-api-key' });

      const config = getConfig();
      expect(config.apiKey).toBe('option-api-key'); // Option overrides
      expect(config.apiUrl).toBe('https://global-url.com'); // Global preserved
      expect(config.timeoutMs).toBe(30000); // Global preserved
    });

    it('should handle undefined options gracefully', () => {
      initializeConfig({
        apiKey: 'global-api-key',
        apiUrl: 'https://global-url.com',
        dataDir: '/tmp/firecrawl-data',
      });

      getClient({ apiKey: undefined });

      // When undefined is passed, it should not override
      const config = getConfig();
      expect(config.apiKey).toBe('global-api-key');
    });
  });

  describe('Combined fallback chain', () => {
    it('should follow: options > global config > env vars > stored settings', () => {
      // Set up stored settings
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'stored-api-key',
        apiUrl: 'https://stored-url.com',
        dataDir: '/tmp/stored-data',
      });

      // Set up env vars
      process.env.FIRECRAWL_API_KEY = 'env-api-key';
      process.env.FIRECRAWL_API_URL = 'https://env-url.com';
      process.env.FIRECRAWL_DATA_DIR = '/tmp/env-data';

      // Initialize with env vars (should use env > stored)
      initializeConfig({});
      expect(getConfig().apiKey).toBe('env-api-key');

      // Options should override everything
      getClient({ apiKey: 'option-api-key' });
      expect(getConfig().apiKey).toBe('option-api-key');

      // After reset, should fall back to env
      resetConfig();
      initializeConfig({});
      expect(getConfig().apiKey).toBe('env-api-key');

      // After clearing env, should fall back to stored
      resetConfig();
      delete process.env.FIRECRAWL_API_KEY;
      delete process.env.FIRECRAWL_API_URL;
      delete process.env.FIRECRAWL_DATA_DIR;
      initializeConfig({});
      expect(getConfig().apiKey).toBe('stored-api-key');
    });

    it('should update global config when getClient is called with options', () => {
      process.env.FIRECRAWL_API_KEY = 'env-api-key';
      process.env.FIRECRAWL_API_URL = 'https://env-url.com';
      process.env.FIRECRAWL_DATA_DIR = '/tmp/env-data';
      initializeConfig({});

      // Initially should use env var
      expect(getConfig().apiKey).toBe('env-api-key');

      // Call getClient with option
      getClient({ apiKey: 'option-api-key' });

      // Global config should now be updated
      expect(getConfig().apiKey).toBe('option-api-key');

      // Subsequent getClient calls without options should use updated global config
      resetClient(); // Reset client instance
      getClient();
      expect(getConfig().apiKey).toBe('option-api-key');
    });
  });

  describe('updateConfig behavior', () => {
    it('should merge with existing config', () => {
      initializeConfig({
        apiKey: 'initial-key',
        apiUrl: 'https://initial-url.com',
      });

      updateConfig({ apiKey: 'updated-key' });

      const config = getConfig();
      expect(config.apiKey).toBe('updated-key');
      expect(config.apiUrl).toBe('https://initial-url.com'); // Should be preserved
    });

    it('should allow partial updates', () => {
      initializeConfig({
        apiKey: 'key1',
        apiUrl: 'https://url1.com',
      });

      updateConfig({ apiUrl: 'https://url2.com' });

      const config = getConfig();
      expect(config.apiKey).toBe('key1'); // Should be preserved
      expect(config.apiUrl).toBe('https://url2.com'); // Should be updated
    });
  });

  describe('validateConfig', () => {
    it('should require API key', () => {
      initializeConfig({
        apiUrl: 'https://example.com',
        dataDir: '/tmp/data',
      });
      expect(() => validateConfig()).toThrow('API key is required');
    });

    it('should require API URL', () => {
      initializeConfig({ apiKey: 'test-key', dataDir: '/tmp/data' });
      expect(() => validateConfig()).toThrow('API URL is required');
    });

    it('should require data directory', () => {
      initializeConfig({
        apiKey: 'test-key',
        apiUrl: 'https://example.com',
      });
      expect(() => validateConfig()).toThrow('Data directory is required');
    });

    it('should not throw when all three are provided', () => {
      initializeConfig({
        apiUrl: 'https://example.com',
        apiKey: 'test-key',
        dataDir: '/tmp/data',
      });
      expect(() => validateConfig()).not.toThrow();
    });

    it('should accept any API URL (no default URL concept)', () => {
      initializeConfig({
        apiUrl: 'http://localhost:3002',
        apiKey: 'test-key',
        dataDir: '/tmp/data',
      });
      expect(() => validateConfig()).not.toThrow();
    });
  });
});
