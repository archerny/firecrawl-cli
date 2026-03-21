/**
 * Tests for config command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, viewConfig } from '../../commands/config';
import { initializeConfig, resetConfig, getConfig } from '../../utils/config';
import * as settings from '../../utils/settings';
import * as auth from '../../utils/auth';

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
    manualLogin: vi.fn(),
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

    it('should trigger interactive flow when only apiKey provided', async () => {
      vi.mocked(auth.manualLogin).mockResolvedValue({
        apiKey: 'fc-manual-key',
        apiUrl: 'https://manual.api.dev',
        dataDir: '/tmp/data',
      });

      await configure({ apiKey: 'fc-some-key' });

      expect(auth.manualLogin).toHaveBeenCalled();
      expect(settings.saveSettings).toHaveBeenCalledWith({
        apiKey: 'fc-manual-key',
        apiUrl: 'https://manual.api.dev',
        dataDir: '/tmp/data',
      });
    });

    it('should pass existing apiUrl to manualLogin when only apiUrl provided', async () => {
      vi.mocked(auth.manualLogin).mockResolvedValue({
        apiKey: 'fc-key',
        apiUrl: 'https://provided.api.dev',
        dataDir: '/tmp/data',
      });

      await configure({ apiUrl: 'https://provided.api.dev' });

      expect(auth.manualLogin).toHaveBeenCalledWith(
        'https://provided.api.dev',
        undefined
      );
    });

    it('should trigger interactive flow when not configured and no options', async () => {
      vi.mocked(auth.manualLogin).mockResolvedValue({
        apiKey: 'fc-new-key',
        apiUrl: 'https://api.dev',
        dataDir: '/tmp/data',
      });

      await configure();

      expect(auth.manualLogin).toHaveBeenCalled();
    });

    it('should show existing config when already configured', async () => {
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

    it('should exit when manual login fails', async () => {
      vi.mocked(auth.manualLogin).mockRejectedValue(
        new Error('User cancelled')
      );

      await configure();

      expect(process.exit).toHaveBeenCalledWith(1);
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
