/**
 * Tests for authentication utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAuthenticated,
  manualLogin,
  interactiveLogin,
  ensureAuthenticated,
} from '../../utils/auth';
import { initializeConfig, resetConfig, getConfig } from '../../utils/config';
import * as credentials from '../../utils/credentials';

// Mock credentials module
vi.mock('../../utils/credentials', () => ({
  loadCredentials: vi.fn(),
  saveCredentials: vi.fn(),
  getConfigDirectoryPath: vi.fn().mockReturnValue('/mock/config/path'),
}));

// Mock readline for interactive prompts
vi.mock('readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn(),
    close: vi.fn(),
  }),
}));

describe('Authentication Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetConfig();
    vi.clearAllMocks();
    // Clear env vars
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_URL;
    // Mock loadCredentials to return null by default
    vi.mocked(credentials.loadCredentials).mockReturnValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isAuthenticated', () => {
    it('should return true when API key is set in config', () => {
      initializeConfig({
        apiKey: 'fc-test-api-key',
        apiUrl: 'https://api.firecrawl.dev',
      });

      expect(isAuthenticated()).toBe(true);
    });

    it('should return true when API key and URL are set via environment variables', () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-api-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({});

      expect(isAuthenticated()).toBe(true);
    });

    it('should return true when API key and URL are in stored credentials', () => {
      vi.mocked(credentials.loadCredentials).mockReturnValue({
        apiKey: 'fc-stored-api-key',
        apiUrl: 'https://api.firecrawl.dev',
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
  });

  describe('Authentication priority', () => {
    it('should prioritize provided API key over env var', () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({
        apiKey: 'fc-provided-key',
        apiUrl: 'https://custom.firecrawl.dev',
      });

      expect(isAuthenticated()).toBe(true);
    });

    it('should prioritize env var over stored credentials', () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      vi.mocked(credentials.loadCredentials).mockReturnValue({
        apiKey: 'fc-stored-key',
        apiUrl: 'https://stored.firecrawl.dev',
      });
      initializeConfig({});

      expect(isAuthenticated()).toBe(true);
    });

    it('should fall back to stored credentials when no other source', () => {
      vi.mocked(credentials.loadCredentials).mockReturnValue({
        apiKey: 'fc-stored-key',
        apiUrl: 'https://stored.firecrawl.dev',
      });
      initializeConfig({});

      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when only apiKey is set (no apiUrl)', () => {
      initializeConfig({ apiKey: 'fc-key-only' });
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when only apiUrl is set (no apiKey)', () => {
      initializeConfig({ apiUrl: 'https://api.dev' });
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('manualLogin', () => {
    it('should skip URL prompt when apiUrl is provided', async () => {
      const readline = await import('readline');
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          cb('fc-test-key');
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const result = await manualLogin('https://pre-set.api.dev');

      expect(result.apiUrl).toBe('https://pre-set.api.dev');
      expect(result.apiKey).toBe('fc-test-key');
      // Should only prompt once (for API key), not for URL
      expect(mockRl.question).toHaveBeenCalledTimes(1);
      expect(mockRl.question).toHaveBeenCalledWith(
        expect.stringContaining('API key'),
        expect.any(Function)
      );
    });

    it('should prompt for both URL and key when apiUrl not provided', async () => {
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://prompted.api.dev');
          } else {
            cb('fc-prompted-key');
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const result = await manualLogin();

      expect(result.apiUrl).toBe('https://prompted.api.dev');
      expect(result.apiKey).toBe('fc-prompted-key');
    });

    it('should throw when API URL is empty', async () => {
      const readline = await import('readline');
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          cb('');
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      await expect(manualLogin()).rejects.toThrow('API URL cannot be empty');
    });

    it('should throw when API key is empty', async () => {
      const readline = await import('readline');
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          cb('');
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      await expect(manualLogin('https://api.dev')).rejects.toThrow(
        'API key cannot be empty'
      );
    });

    it('should trim trailing slash from API URL', async () => {
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://api.dev/');
          } else {
            cb('fc-key');
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const result = await manualLogin();
      expect(result.apiUrl).toBe('https://api.dev');
    });
  });

  describe('interactiveLogin', () => {
    it('should use env vars when both FIRECRAWL_API_KEY and FIRECRAWL_API_URL are set', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://env.api.dev';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await interactiveLogin();

      expect(result).toEqual({
        apiKey: 'fc-env-key',
        apiUrl: 'https://env.api.dev',
      });

      consoleSpy.mockRestore();
    });

    it('should fall back to manual login when env vars are not set', async () => {
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://manual.api.dev');
          } else {
            cb('fc-manual-key');
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await interactiveLogin();

      expect(result.apiKey).toBe('fc-manual-key');
      expect(result.apiUrl).toBe('https://manual.api.dev');

      consoleSpy.mockRestore();
    });

    it('should not use env vars when only API key is set', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-only-key';

      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://fallback.api.dev');
          } else {
            cb('fc-fallback-key');
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await interactiveLogin();

      // Should have prompted, not used env vars
      expect(result.apiUrl).toBe('https://fallback.api.dev');

      consoleSpy.mockRestore();
    });
  });

  describe('ensureAuthenticated', () => {
    it('should return existing API key when already in global config', async () => {
      initializeConfig({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.dev',
      });

      const result = await ensureAuthenticated();
      expect(result).toBe('fc-existing-key');
      // Should NOT prompt or save
      expect(credentials.saveCredentials).not.toHaveBeenCalled();
    });

    it('should return API key from env vars without prompting', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      initializeConfig({});

      const result = await ensureAuthenticated();
      expect(result).toBe('fc-env-key');
      expect(credentials.saveCredentials).not.toHaveBeenCalled();
    });

    it('should prompt for login when no credentials exist and save result', async () => {
      // No config, no env vars, no stored credentials
      initializeConfig({});

      // Mock readline for interactive login (URL + key)
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://interactive.api.dev');
          } else {
            cb('fc-interactive-key');
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await ensureAuthenticated();

      expect(result).toBe('fc-interactive-key');
      expect(credentials.saveCredentials).toHaveBeenCalledWith({
        apiKey: 'fc-interactive-key',
        apiUrl: 'https://interactive.api.dev',
      });

      consoleSpy.mockRestore();
    });
  });
});
