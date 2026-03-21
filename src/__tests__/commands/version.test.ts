/**
 * Tests for version command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleVersionCommand } from '../../commands/version';
import { initializeConfig, resetConfig } from '../../utils/config';
import * as settings from '../../utils/settings';

// Mock settings module
vi.mock('../../utils/settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  getConfigDirectoryPath: vi.fn().mockReturnValue('/mock/config/path'),
}));

describe('Version Command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetConfig();
    vi.clearAllMocks();
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_URL;
    vi.mocked(settings.loadSettings).mockReturnValue(null);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('handleVersionCommand', () => {
    it('should output version', () => {
      handleVersionCommand();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('version:')
      );
    });

    it('should output auth status when authStatus option is true', () => {
      initializeConfig({});

      handleVersionCommand({ authStatus: true });

      const calls = consoleSpy.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toContainEqual(expect.stringContaining('version:'));
      expect(calls).toContainEqual(expect.stringContaining('authenticated:'));
    });

    it('should show authenticated: true when settings are set', () => {
      initializeConfig({
        apiKey: 'fc-test-key',
        apiUrl: 'https://api.firecrawl.dev',
        dataDir: '/tmp/firecrawl-data',
      });

      handleVersionCommand({ authStatus: true });

      expect(consoleSpy).toHaveBeenCalledWith('authenticated: true');
    });

    it('should show authenticated: false when no settings', () => {
      initializeConfig({});

      handleVersionCommand({ authStatus: true });

      expect(consoleSpy).toHaveBeenCalledWith('authenticated: false');
    });

    it('should not output auth status when authStatus is not set', () => {
      handleVersionCommand();

      const calls = consoleSpy.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).not.toContainEqual(
        expect.stringContaining('authenticated:')
      );
    });

    it('should not output auth status when options is empty', () => {
      handleVersionCommand({});

      const calls = consoleSpy.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).not.toContainEqual(
        expect.stringContaining('authenticated:')
      );
    });
  });
});
