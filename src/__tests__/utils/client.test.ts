/**
 * Tests for Firecrawl client utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getClient, resetClient } from '../../utils/client';
import { initializeConfig, resetConfig } from '../../utils/config';
import * as settings from '../../utils/settings';

// Mock settings module
vi.mock('../../utils/settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  getConfigDirectoryPath: vi.fn().mockReturnValue('/mock/config/path'),
}));

// Track constructor calls
const constructorCalls: any[] = [];

// Mock Firecrawl SDK with a proper class
vi.mock('@mendable/firecrawl-js', () => {
  class MockFirecrawl {
    _options: any;
    constructor(options: any) {
      this._options = options;
      constructorCalls.push(options);
    }
    scrape = vi.fn();
  }
  return { default: MockFirecrawl };
});

describe('Client Utility', () => {
  beforeEach(() => {
    resetClient();
    resetConfig();
    vi.clearAllMocks();
    constructorCalls.length = 0;
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_URL;
    delete process.env.FIRECRAWL_DATA_DIR;
    vi.mocked(settings.loadSettings).mockReturnValue(null);
  });

  afterEach(() => {
    resetClient();
    resetConfig();
  });

  describe('getClient', () => {
    it('should create client with global config', () => {
      initializeConfig({
        apiKey: 'fc-test-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/data',
      });

      const client = getClient();

      expect(client).toBeDefined();
      expect((client as any)._options).toEqual(
        expect.objectContaining({
          apiKey: 'fc-test-key',
          apiUrl: 'https://api.firecrawl.dev',
        })
      );
    });

    it('should return singleton instance on repeated calls without options', () => {
      initializeConfig({
        apiKey: 'fc-test-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/data',
      });

      const client1 = getClient();
      const client2 = getClient();

      expect(client1).toBe(client2);
    });

    it('should create new instance when options are provided', () => {
      initializeConfig({
        apiKey: 'fc-global-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/data',
      });

      const client1 = getClient();
      const client2 = getClient({
        apiKey: 'fc-override-key',
        apiUrl: 'https://custom.api.dev',
      });

      // With options, a new instance is always created (not singleton)
      expect(client2).not.toBe(client1);
    });

    it('should update global config when options include apiKey', () => {
      initializeConfig({
        apiKey: 'fc-initial-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/data',
      });

      getClient({ apiKey: 'fc-updated-key' });

      // The next singleton call should use updated config
      resetClient();
      const client = getClient();
      expect((client as any)._options.apiKey).toBe('fc-updated-key');
    });

    it('should throw when apiKey is missing', () => {
      initializeConfig({});

      expect(() => getClient()).toThrow('API key is required');
    });

    it('should throw when apiUrl is missing', () => {
      initializeConfig({ apiKey: 'fc-key', dataDir: '/tmp/data' });

      expect(() => getClient()).toThrow('API URL is required');
    });

    it('should throw when dataDir is missing', () => {
      initializeConfig({
        apiKey: 'fc-key',
        apiUrl: 'https://api.firecrawl.dev',
      });

      expect(() => getClient()).toThrow('Data directory is required');
    });

    it('should pass timeoutMs option', () => {
      initializeConfig({
        apiKey: 'fc-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/data',
      });

      const client = getClient({ timeoutMs: 30000 });

      expect((client as any)._options.timeoutMs).toBe(30000);
    });

    it('should pass maxRetries option', () => {
      initializeConfig({
        apiKey: 'fc-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/data',
      });

      const client = getClient({ maxRetries: 5 });

      expect((client as any)._options.maxRetries).toBe(5);
    });

    it('should pass backoffFactor option', () => {
      initializeConfig({
        apiKey: 'fc-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/data',
      });

      const client = getClient({ backoffFactor: 2 });

      expect((client as any)._options.backoffFactor).toBe(2);
    });

    it('should use provided apiUrl over global config', () => {
      initializeConfig({
        apiKey: 'fc-key',
        apiUrl: 'https://global.api.dev',
        dataDir: '/tmp/data',
      });

      const client = getClient({ apiUrl: 'https://override.api.dev' });

      expect((client as any)._options.apiUrl).toBe('https://override.api.dev');
    });
  });

  describe('resetClient', () => {
    it('should clear singleton instance', () => {
      initializeConfig({
        apiKey: 'fc-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/data',
      });

      const client1 = getClient();
      resetClient();
      const client2 = getClient();

      expect(client1).not.toBe(client2);
    });
  });
});
