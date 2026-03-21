/**
 * Tests for browser session utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import {
  saveBrowserSession,
  loadBrowserSession,
  clearBrowserSession,
  getSessionId,
} from '../../utils/browser-session';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Mock config module to control getDataDir
vi.mock('../../utils/config', () => ({
  getDataDir: vi.fn(),
}));

import { getDataDir } from '../../utils/config';

describe('Browser Session Utility', () => {
  const TEST_DATA_DIR = '/home/testuser/firecrawl-data';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDataDir).mockReturnValue(TEST_DATA_DIR);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveBrowserSession', () => {
    it('should create data dir and save session', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const session = {
        id: 'session-123',
        cdpUrl: 'wss://browser.firecrawl.dev/session-123',
        createdAt: '2026-03-21T00:00:00Z',
      };

      saveBrowserSession(session);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        TEST_DATA_DIR,
        expect.objectContaining({ recursive: true })
      );

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('browser-session.json'),
        JSON.stringify(session, null, 2),
        'utf-8'
      );
    });

    it('should not recreate dir if it exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      saveBrowserSession({
        id: 'session-456',
        cdpUrl: 'wss://browser.firecrawl.dev/session-456',
        createdAt: '2026-03-21T00:00:00Z',
      });

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should throw when dataDir is not configured', () => {
      vi.mocked(getDataDir).mockReturnValue(undefined);

      expect(() =>
        saveBrowserSession({
          id: 'session-789',
          cdpUrl: 'wss://browser.firecrawl.dev/session-789',
          createdAt: '2026-03-21T00:00:00Z',
        })
      ).toThrow('Data directory is not configured');
    });

    it('should save session file inside dataDir', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      saveBrowserSession({
        id: 'test',
        cdpUrl: 'wss://test',
        createdAt: '2026-03-21T00:00:00Z',
      });

      const writePath = vi.mocked(fs.writeFileSync).mock.calls[0][0] as string;
      expect(writePath).toContain(TEST_DATA_DIR);
      expect(writePath).toContain('browser-session.json');
    });
  });

  describe('loadBrowserSession', () => {
    it('should return null when session file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = loadBrowserSession();

      expect(result).toBeNull();
    });

    it('should return session when file exists and is valid', () => {
      const session = {
        id: 'session-789',
        cdpUrl: 'wss://browser.firecrawl.dev/session-789',
        createdAt: '2026-03-21T00:00:00Z',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(session));

      const result = loadBrowserSession();

      expect(result).toEqual(session);
    });

    it('should return null when file is corrupted', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json');

      const result = loadBrowserSession();

      expect(result).toBeNull();
    });

    it('should return null when read throws error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = loadBrowserSession();

      expect(result).toBeNull();
    });

    it('should return null when dataDir is not configured', () => {
      vi.mocked(getDataDir).mockReturnValue(undefined);

      const result = loadBrowserSession();

      expect(result).toBeNull();
    });
  });

  describe('clearBrowserSession', () => {
    it('should delete session file when it exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      clearBrowserSession();

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('browser-session.json')
      );
    });

    it('should do nothing when session file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      clearBrowserSession();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should not throw when unlink fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => clearBrowserSession()).not.toThrow();
    });

    it('should do nothing when dataDir is not configured', () => {
      vi.mocked(getDataDir).mockReturnValue(undefined);

      clearBrowserSession();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('getSessionId', () => {
    it('should return override ID when provided', () => {
      const result = getSessionId('override-id');

      expect(result).toBe('override-id');
    });

    it('should return stored session ID when no override', () => {
      const session = {
        id: 'stored-session-id',
        cdpUrl: 'wss://browser.firecrawl.dev/stored',
        createdAt: '2026-03-21T00:00:00Z',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(session));

      const result = getSessionId();

      expect(result).toBe('stored-session-id');
    });

    it('should throw when no override and no stored session', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => getSessionId()).toThrow('No active browser session');
    });
  });
});
