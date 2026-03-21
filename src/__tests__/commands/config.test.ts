/**
 * Tests for config command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configure, viewConfig } from '../../commands/config';
import { initializeConfig, resetConfig, getConfig } from '../../utils/config';
import * as credentials from '../../utils/credentials';
import * as auth from '../../utils/auth';

// Mock credentials module
vi.mock('../../utils/credentials', () => ({
  loadCredentials: vi.fn(),
  saveCredentials: vi.fn(),
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
    vi.mocked(credentials.loadCredentials).mockReturnValue(null);
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
    it('should save directly when both apiKey and apiUrl are provided', async () => {
      await configure({
        apiKey: 'fc-direct-key',
        apiUrl: 'https://api.firecrawl.dev',
      });

      expect(credentials.saveCredentials).toHaveBeenCalledWith({
        apiKey: 'fc-direct-key',
        apiUrl: 'https://api.firecrawl.dev',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration saved successfully')
      );
    });

    it('should trigger interactive flow when only apiKey provided', async () => {
      vi.mocked(auth.manualLogin).mockResolvedValue({
        apiKey: 'fc-manual-key',
        apiUrl: 'https://manual.api.dev',
      });

      await configure({ apiKey: 'fc-some-key' });

      expect(auth.manualLogin).toHaveBeenCalled();
      expect(credentials.saveCredentials).toHaveBeenCalledWith({
        apiKey: 'fc-manual-key',
        apiUrl: 'https://manual.api.dev',
      });
    });

    it('should pass existing apiUrl to manualLogin when only apiUrl provided', async () => {
      vi.mocked(auth.manualLogin).mockResolvedValue({
        apiKey: 'fc-key',
        apiUrl: 'https://provided.api.dev',
      });

      await configure({ apiUrl: 'https://provided.api.dev' });

      expect(auth.manualLogin).toHaveBeenCalledWith('https://provided.api.dev');
    });

    it('should trigger interactive flow when not authenticated and no options', async () => {
      vi.mocked(auth.manualLogin).mockResolvedValue({
        apiKey: 'fc-new-key',
        apiUrl: 'https://api.dev',
      });

      await configure();

      expect(auth.manualLogin).toHaveBeenCalled();
    });

    it('should show existing config when already authenticated', async () => {
      initializeConfig({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.firecrawl.dev',
      });
      vi.mocked(credentials.loadCredentials).mockReturnValue({
        apiKey: 'fc-existing-key',
        apiUrl: 'https://api.firecrawl.dev',
      });

      await configure();

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Authenticated');
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
    it('should display authenticated status with masked key', async () => {
      initializeConfig({
        apiKey: 'fc-my-long-api-key',
        apiUrl: 'https://api.firecrawl.dev',
      });
      vi.mocked(credentials.loadCredentials).mockReturnValue({
        apiKey: 'fc-my-long-api-key',
        apiUrl: 'https://api.firecrawl.dev',
      });

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Authenticated');
      expect(output).toContain('fc-my-');
      expect(output).not.toContain('fc-my-long-api-key');
    });

    it('should display not authenticated when no credentials', async () => {
      initializeConfig({});

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Not authenticated');
    });

    it('should show config directory path', async () => {
      initializeConfig({
        apiKey: 'fc-key-123',
        apiUrl: 'https://api.firecrawl.dev',
      });
      vi.mocked(credentials.loadCredentials).mockReturnValue({
        apiKey: 'fc-key-123',
        apiUrl: 'https://api.firecrawl.dev',
      });

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('/mock/config/path');
    });

    it('should show API URL when set', async () => {
      initializeConfig({
        apiKey: 'fc-key-xyz',
        apiUrl: 'https://custom.api.dev',
      });
      vi.mocked(credentials.loadCredentials).mockReturnValue({
        apiKey: 'fc-key-xyz',
        apiUrl: 'https://custom.api.dev',
      });

      await viewConfig();

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('https://custom.api.dev');
    });
  });
});
