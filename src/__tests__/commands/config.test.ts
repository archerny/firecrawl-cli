/**
 * Tests for config command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, viewConfig } from '../../commands/config';
import { initializeConfig, resetConfig } from '../../utils/config';
import * as settings from '../../utils/settings';

// Mock settings module
vi.mock('../../utils/settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  getConfigDirectoryPath: vi.fn().mockReturnValue('/mock/config/path'),
}));

// Mock auth module
vi.mock('../../utils/auth', async () => {
  const actual = await vi.importActual('../../utils/auth');
  return {
    ...actual,
  };
});

describe('Config Command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalExit = process.exit;

  beforeEach(() => {
    resetConfig();
    vi.clearAllMocks();
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_URL;
    delete process.env.FIRECRAWL_DATA_DIR;
    vi.mocked(settings.loadSettings).mockReturnValue(null);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exit = originalExit;
  });

  describe('configure', () => {
    it('should save directly when apiKey, apiUrl, and dataDir are all provided', async () => {
      await configure({
        apiKey: 'fc-direct-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      expect(settings.saveSettings).toHaveBeenCalledWith({
        apiKey: 'fc-direct-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration saved successfully')
      );
    });

    it('should exit with error when only apiKey provided (missing apiUrl and dataDir)', async () => {
      await configure({ apiKey: 'fc-some-key' });

      expect(process.exit).toHaveBeenCalledWith(1);
      const errorOutput = consoleErrorSpy.mock.calls
        .map((c: any) => c[0])
        .join('\n');
      expect(errorOutput).toContain('--api-url');
      expect(errorOutput).toContain('--data-dir');
    });

    it('should exit with error when only apiUrl provided (missing apiKey and dataDir)', async () => {
      await configure({ apiUrl: 'https://api.dev' });

      expect(process.exit).toHaveBeenCalledWith(1);
      const errorOutput = consoleErrorSpy.mock.calls
        .map((c: any) => c[0])
        .join('\n');
      expect(errorOutput).toContain('--api-key');
      expect(errorOutput).toContain('--data-dir');
    });

    it('should exit with error when not configured and no options', async () => {
      await configure();

      expect(process.exit).toHaveBeenCalledWith(1);
      const errorOutput = consoleErrorSpy.mock.calls
        .map((c: any) => c[0])
        .join('\n');
      expect(errorOutput).toContain('--api-key');
      expect(errorOutput).toContain('--api-url');
      expect(errorOutput).toContain('--data-dir');
    });

    it('should show existing config when already configured and no options', async () => {
      initializeConfig({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      await configure();

      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('Configured');
      expect(output).toContain('fc-exi');
    });
  });

  describe('viewConfig', () => {
    it('should display configured status with masked key', async () => {
      initializeConfig({
        apiKey: 'fc-my-long-api-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'fc-my-long-api-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('Configured');
      expect(output).toContain('fc-my-');
      expect(output).not.toContain('fc-my-long-api-key');
    });

    it('should display not configured when no settings', async () => {
      initializeConfig({});

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('Not configured');
    });

    it('should show config directory path', async () => {
      initializeConfig({
        apiKey: 'fc-key-123',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'fc-key-123',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('/mock/config/path');
    });

    it('should show API URL when set', async () => {
      initializeConfig({
        apiKey: 'fc-key-xyz',
        apiUrl: 'https://custom.api.dev',
        dataDir: '/tmp/firecrawl-data',
      });
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'fc-key-xyz',
        apiUrl: 'https://custom.api.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('https://custom.api.dev');
    });

    it('should show data directory when set', async () => {
      initializeConfig({
        apiKey: 'fc-key-xyz',
        apiUrl: 'https://api.dev',
        dataDir: '/tmp/firecrawl-data',
      });
      vi.mocked(settings.loadSettings).mockReturnValue({
        apiKey: 'fc-key-xyz',
        apiUrl: 'https://api.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c: any) => c[0]).join('\n');
      expect(output).toContain('/tmp/firecrawl-data');
    });
  });
});
