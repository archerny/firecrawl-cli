/**
 * Tests for authentication utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAuthenticated, ensureAuthenticated } from '../../utils/auth';
import { initializeConfig, resetConfig } from '../../utils/config';
import * as settings from '../../utils/settings';

// Mock settings module
vi.mock('../../utils/settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  getConfigDirectoryPath: vi.fn().mockReturnValue('/mock/config/path'),
}));

describe('Authentication Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
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
    process.env = originalEnv;
  });

  describe('isAuthenticated', () => {
    it('should return true when all three fields are set in config', () => {
      initializeConfig({
        apiKey: 'fc-test-api-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      expect(isAuthenticated()).toBe(true);
    });

    it('should return true when all three fields are set via environment variables', () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-api-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      process.env.FIRECRAWL_DATA_DIR = '/tmp/firecrawl-data';
      initializeConfig({});

      expect(isAuthenticated()).toBe(true);
    });

    it('should return true when all three fields are in stored settings', () => {
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'fc-stored-api-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });
      initializeConfig({});

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when no API key is set', () => {
      initializeConfig({});

      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      initializeConfig({
        apiKey: '',
      });

      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when dataDir is missing', () => {
      initializeConfig({
        apiKey: 'fc-key',
        apiUrl: 'https://api.dev',
      });

      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('Authentication priority', () => {
    it('should prioritize provided API key over env var', () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      process.env.FIRECRAWL_DATA_DIR = '/tmp/firecrawl-data';
      initializeConfig({
        apiKey: 'fc-provided-key',
        apiUrl: 'https://custom.firecrawl.dev',
        dataDir: '/tmp/custom-data',
      });

      expect(isAuthenticated()).toBe(true);
    });

    it('should prioritize env var over stored settings', () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      process.env.FIRECRAWL_DATA_DIR = '/tmp/firecrawl-data';
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'fc-stored-key',
        apiUrl: 'https://stored.firecrawl.dev',
        dataDir: '/tmp/stored-data',
      });
      initializeConfig({});

      expect(isAuthenticated()).toBe(true);
    });

    it('should fall back to stored settings when no other source', () => {
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'fc-stored-key',
        apiUrl: 'https://stored.firecrawl.dev',
        dataDir: '/tmp/stored-data',
      });
      initializeConfig({});

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when only apiKey is set (no apiUrl or dataDir)', () => {
      initializeConfig({ apiKey: 'fc-key-only' });
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when only apiUrl is set (no apiKey or dataDir)', () => {
      initializeConfig({ apiUrl: 'https://api.dev' });
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('ensureAuthenticated', () => {
    it('should return existing API key when fully configured', () => {
      initializeConfig({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.dev',
        dataDir: '/tmp/data',
      });

      const result = ensureAuthenticated();
      expect(result).toBe('fc-existing-key');
    });

    it('should return API key from env vars without error', () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://api.dev';
      process.env.FIRECRAWL_DATA_DIR = '/tmp/env-data';
      initializeConfig({});

      const result = ensureAuthenticated();
      expect(result).toBe('fc-env-key');
    });

    it('should exit with error when no settings exist', () => {
      initializeConfig({});

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      ensureAuthenticated();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required configuration')
      );

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should report missing items when dataDir is missing', () => {
      initializeConfig({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.dev',
      });

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      ensureAuthenticated();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Data Directory')
      );

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should mention all configuration methods in error message', () => {
      initializeConfig({});

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      ensureAuthenticated();

      const errorOutput = consoleErrorSpy.mock.calls
        .map((c: any) => c[0])
        .join('\n');
      expect(errorOutput).toContain('FIRECRAWL_API_KEY');
      expect(errorOutput).toContain('FIRECRAWL_API_URL');
      expect(errorOutput).toContain('FIRECRAWL_DATA_DIR');
      expect(errorOutput).toContain('node bundle/index.cjs config');

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
