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
import * as settings from '../../utils/settings';

// Mock settings module
vi.mock('../../utils/settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
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

  describe('manualLogin', () => {
    it('should skip URL prompt when apiUrl is provided', async () => {
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('fc-test-key'); // API key
          } else {
            cb('/tmp/data'); // dataDir
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const result = await manualLogin('https://pre-set.api.dev');

      expect(result.apiUrl).toBe('https://pre-set.api.dev');
      expect(result.apiKey).toBe('fc-test-key');
      expect(result.dataDir).toBe('/tmp/data');
      // Should prompt twice (API key + dataDir), not for URL
      expect(mockRl.question).toHaveBeenCalledTimes(2);
    });

    it('should prompt for URL, key, and dataDir when none provided', async () => {
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://prompted.api.dev'); // URL
          } else if (callCount === 2) {
            cb('fc-prompted-key'); // key
          } else {
            cb('/tmp/data'); // dataDir
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const result = await manualLogin();

      expect(result.apiUrl).toBe('https://prompted.api.dev');
      expect(result.apiKey).toBe('fc-prompted-key');
      expect(result.dataDir).toBe('/tmp/data');
    });

    it('should skip dataDir prompt when dataDir is provided', async () => {
      const readline = await import('readline');
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          cb('fc-test-key');
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const result = await manualLogin(
        'https://pre-set.api.dev',
        '/tmp/pre-set-data'
      );

      expect(result.dataDir).toBe('/tmp/pre-set-data');
      // Should only prompt once (for API key)
      expect(mockRl.question).toHaveBeenCalledTimes(1);
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

    it('should throw when data directory is empty', async () => {
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('fc-key'); // API key
          } else {
            cb(''); // empty dataDir
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      await expect(manualLogin('https://api.dev')).rejects.toThrow(
        'Data directory cannot be empty'
      );
    });

    it('should trim trailing slash from API URL', async () => {
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://api.dev/'); // URL with trailing slash
          } else if (callCount === 2) {
            cb('fc-key');
          } else {
            cb('/tmp/data');
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
    it('should use env vars when all three env vars are set', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://env.api.dev';
      process.env.FIRECRAWL_DATA_DIR = '/tmp/env-data';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await interactiveLogin();

      expect(result).toEqual({
        apiKey: 'fc-env-key',
        apiUrl: 'https://env.api.dev',
        dataDir: '/tmp/env-data',
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
          } else if (callCount === 2) {
            cb('fc-manual-key');
          } else {
            cb('/tmp/manual-data');
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await interactiveLogin();

      expect(result.apiKey).toBe('fc-manual-key');
      expect(result.apiUrl).toBe('https://manual.api.dev');
      expect(result.dataDir).toBe('/tmp/manual-data');

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
          } else if (callCount === 2) {
            cb('fc-fallback-key');
          } else {
            cb('/tmp/fallback-data');
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
    it('should return existing API key when fully configured', async () => {
      initializeConfig({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.dev',
        dataDir: '/tmp/data',
      });

      const result = await ensureAuthenticated();
      expect(result).toBe('fc-existing-key');
      // Should NOT prompt or save
      expect(settings.saveSettings).not.toHaveBeenCalled();
    });

    it('should return API key from env vars without prompting', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://api.dev';
      process.env.FIRECRAWL_DATA_DIR = '/tmp/env-data';
      initializeConfig({});

      const result = await ensureAuthenticated();
      expect(result).toBe('fc-env-key');
      expect(settings.saveSettings).not.toHaveBeenCalled();
    });

    it('should prompt for login when no settings exist and save result', async () => {
      // No config, no env vars, no stored settings
      initializeConfig({});

      // Mock readline for interactive login (URL + key + dataDir)
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://interactive.api.dev');
          } else if (callCount === 2) {
            cb('fc-interactive-key');
          } else {
            cb('/tmp/interactive-data');
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await ensureAuthenticated();

      expect(result).toBe('fc-interactive-key');
      expect(settings.saveSettings).toHaveBeenCalledWith({
        apiKey: 'fc-interactive-key',
        apiUrl: 'https://interactive.api.dev',
        dataDir: '/tmp/interactive-data',
      });

      consoleSpy.mockRestore();
    });

    it('should prompt when dataDir is missing even if apiKey and apiUrl exist', async () => {
      initializeConfig({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.dev',
        // dataDir missing
      });

      // Mock readline for interactive login
      const readline = await import('readline');
      let callCount = 0;
      const mockRl = {
        question: vi.fn((_q: string, cb: (answer: string) => void) => {
          callCount++;
          if (callCount === 1) {
            cb('https://api.dev');
          } else if (callCount === 2) {
            cb('fc-existing-key');
          } else {
            cb('/tmp/new-data');
          }
        }),
        close: vi.fn(),
      };
      vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await ensureAuthenticated();

      // Should have prompted because dataDir is missing
      expect(settings.saveSettings).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
