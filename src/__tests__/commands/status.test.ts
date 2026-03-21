/**
 * Tests for status command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStatus } from '../../commands/status';
import { initializeConfig, resetConfig } from '../../utils/config';
import * as credentials from '../../utils/credentials';

// Mock credentials module
vi.mock('../../utils/credentials', () => ({
  loadCredentials: vi.fn(),
  saveCredentials: vi.fn(),
  getConfigDirectoryPath: vi.fn().mockReturnValue('/mock/config/path'),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Status Command', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetConfig();
    vi.clearAllMocks();
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_URL;
    vi.mocked(credentials.loadCredentials).mockReturnValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStatus', () => {
    it('should return unauthenticated status when no credentials', async () => {
      initializeConfig({});

      const status = await getStatus();

      expect(status.authenticated).toBe(false);
      expect(status.authSource).toBe('none');
      expect(status.version).toBeDefined();
      expect(status.concurrency).toBeUndefined();
    });

    it('should detect env auth source', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-env-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            maxConcurrency: 10,
            activeJobsInQueue: 2,
          }),
      });

      const status = await getStatus();

      expect(status.authenticated).toBe(true);
      expect(status.authSource).toBe('env');
    });

    it('should detect stored auth source', async () => {
      vi.mocked(credentials.loadCredentials).mockReturnValue({
        apiKey: 'fc-stored-key',
        apiUrl: 'https://api.firecrawl.dev',
      });
      initializeConfig({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            maxConcurrency: 5,
            activeJobsInQueue: 0,
          }),
      });

      const status = await getStatus();

      expect(status.authenticated).toBe(true);
      expect(status.authSource).toBe('stored');
    });

    it('should include concurrency info when API returns it', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            maxConcurrency: 20,
            activeJobsInQueue: 5,
          }),
      });

      const status = await getStatus();

      expect(status.concurrency).toEqual({
        active: 5,
        max: 20,
      });
    });

    it('should handle zero active jobs', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            maxConcurrency: 10,
          }),
      });

      const status = await getStatus();

      expect(status.concurrency).toEqual({
        active: 0,
        max: 10,
      });
    });

    it('should set error when API call fails', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      });

      const status = await getStatus();

      expect(status.authenticated).toBe(true);
      expect(status.error).toBe('Invalid API key');
      expect(status.concurrency).toBeUndefined();
    });

    it('should handle fetch network error', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({});

      mockFetch.mockRejectedValue(new Error('Network error'));

      const status = await getStatus();

      expect(status.authenticated).toBe(true);
      expect(status.error).toBe('Network error');
    });

    it('should call correct queue-status endpoint', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-my-key';
      process.env.FIRECRAWL_API_URL = 'https://custom.api.dev/';
      initializeConfig({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, maxConcurrency: 5 }),
      });

      await getStatus();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.dev/v2/team/queue-status',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer fc-my-key',
          }),
        })
      );
    });

    it('should handle API response with success: false', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({});

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
          }),
      });

      const status = await getStatus();

      expect(status.concurrency).toBeUndefined();
    });

    it('should handle HTTP error without parseable JSON body', async () => {
      process.env.FIRECRAWL_API_KEY = 'fc-key';
      process.env.FIRECRAWL_API_URL = 'https://api.firecrawl.dev';
      initializeConfig({});

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('invalid json')),
      });

      const status = await getStatus();

      expect(status.error).toBe('HTTP 500: Internal Server Error');
    });
  });
});
