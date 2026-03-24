/**
 * Tests for scrape command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeScrape,
  urlToFilename,
  urlToNestedPath,
  getTopPaths,
} from '../../commands/scrape';
import { getClient } from '../../utils/client';
import { initializeConfig } from '../../utils/config';
import { setupTest, teardownTest } from '../utils/mock-client';

// Mock the Firecrawl client module
vi.mock('../../utils/client', async () => {
  const actual = await vi.importActual('../../utils/client');
  return {
    ...actual,
    getClient: vi.fn(),
  };
});

describe('executeScrape', () => {
  let mockClient: any;

  beforeEach(() => {
    setupTest();
    // Initialize config with test API key
    initializeConfig({
      apiKey: 'test-api-key',
      apiUrl: 'https://api.firecrawl.dev',
    });

    // Create mock client
    mockClient = {
      scrape: vi.fn(),
    };

    // Mock getClient to return our mock
    vi.mocked(getClient).mockReturnValue(mockClient as any);
  });

  afterEach(() => {
    teardownTest();
    vi.clearAllMocks();
  });

  describe('API call generation', () => {
    it('should call scrape with correct URL and default markdown format', async () => {
      const mockResponse = { markdown: '# Test Content' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
      });

      expect(mockClient.scrape).toHaveBeenCalledTimes(1);
      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],
      });
    });

    it('should pass apiUrl to getClient when provided', async () => {
      const mockResponse = { markdown: '# Test Content' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        apiUrl: 'http://localhost:3002',
      });

      expect(getClient).toHaveBeenCalledWith({
        apiKey: undefined,
        apiUrl: 'http://localhost:3002',
      });
    });

    it('should pass both apiKey and apiUrl to getClient when provided', async () => {
      const mockResponse = { markdown: '# Test Content' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        apiKey: 'fc-custom-key',
        apiUrl: 'http://localhost:3002',
      });

      expect(getClient).toHaveBeenCalledWith({
        apiKey: 'fc-custom-key',
        apiUrl: 'http://localhost:3002',
      });
    });

    it('should call scrape with specified format', async () => {
      const mockResponse = { html: '<html>...</html>' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        formats: ['html'],
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['html'],
      });
    });

    it('should call scrape with summary format when summary option is true', async () => {
      const mockResponse = { summary: 'This is a summary of the page.' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        formats: ['summary'],
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['summary'],
      });
    });

    it('should include screenshot format when screenshot option is true', async () => {
      const mockResponse = {
        markdown: '# Test',
        screenshot: 'base64image...',
      };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        screenshot: true,
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['screenshot'],
      });
    });

    it('should include screenshot format alongside other formats', async () => {
      const mockResponse = {
        markdown: '# Test',
        screenshot: 'base64image...',
      };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        formats: ['markdown'],
        screenshot: true,
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown', 'screenshot'],
      });
    });

    it('should include onlyMainContent parameter when provided', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        onlyMainContent: true,
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],

        onlyMainContent: true,
      });
    });

    it('should include waitFor parameter when provided', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        waitFor: 2000,
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],

        waitFor: 2000,
      });
    });

    it('should include includeTags parameter when provided', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        includeTags: ['article', 'main'],
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],

        includeTags: ['article', 'main'],
      });
    });

    it('should include excludeTags parameter when provided', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        excludeTags: ['nav', 'footer'],
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],

        excludeTags: ['nav', 'footer'],
      });
    });

    it('should combine all parameters correctly', async () => {
      const mockResponse = { markdown: '# Test', screenshot: 'base64...' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        formats: ['markdown'],
        screenshot: true,
        onlyMainContent: true,
        waitFor: 3000,
        includeTags: ['article'],
        excludeTags: ['nav'],
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown', 'screenshot'],

        onlyMainContent: true,
        waitFor: 3000,
        includeTags: ['article'],
        excludeTags: ['nav'],
      });
    });

    it('should include maxAge parameter when provided', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        maxAge: 3600,
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],

        maxAge: 3600,
      });
    });

    it('should include location parameter with country and languages', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        location: { country: 'US', languages: ['en'] },
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],

        location: { country: 'US', languages: ['en'] },
      });
    });

    it('should include location parameter with only country', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        location: { country: 'DE' },
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],

        location: { country: 'DE' },
      });
    });

    it('should include location parameter with only languages', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
        location: { languages: ['en', 'es'] },
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],

        location: { languages: ['en', 'es'] },
      });
    });

    it('should not include location parameter when not provided', async () => {
      const mockResponse = { markdown: '# Test' };
      mockClient.scrape.mockResolvedValue(mockResponse);

      await executeScrape({
        url: 'https://example.com',
      });

      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown'],
      });
    });
  });

  describe('Response handling', () => {
    it('should return success result with data when scrape succeeds', async () => {
      const mockResponse = {
        markdown: '# Test Content',
        url: 'https://example.com',
      };
      mockClient.scrape.mockResolvedValue(mockResponse);

      const result = await executeScrape({
        url: 'https://example.com',
      });

      expect(result).toEqual({
        success: true,
        data: mockResponse,
      });
    });

    it('should handle complex response data', async () => {
      const mockResponse = {
        markdown: '# Test',
        html: '<html>...</html>',
        screenshot: 'base64image...',
        metadata: {
          title: 'Test Page',
          description: 'Test description',
        },
      };
      mockClient.scrape.mockResolvedValue(mockResponse);

      const result = await executeScrape({
        url: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should return error result when scrape fails', async () => {
      const errorMessage = 'API Error: Invalid URL';
      mockClient.scrape.mockRejectedValue(new Error(errorMessage));

      const result = await executeScrape({
        url: 'https://example.com',
      });

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockClient.scrape.mockRejectedValue('String error');

      const result = await executeScrape({
        url: 'https://example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Type safety', () => {
    it('should accept valid ScrapeFormat types', async () => {
      const formatList: Array<'markdown' | 'html' | 'rawHtml' | 'links'> = [
        'markdown',
        'html',
        'rawHtml',
        'links',
      ];

      for (const format of formatList) {
        mockClient.scrape.mockResolvedValue({ [format]: 'test' });
        const result = await executeScrape({
          url: 'https://example.com',
          formats: [format],
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept multiple formats', async () => {
      mockClient.scrape.mockResolvedValue({
        markdown: '# Test',
        links: ['http://a.com'],
        images: ['http://img.com/a.png'],
      });

      const result = await executeScrape({
        url: 'https://example.com',
        formats: ['markdown', 'links', 'images'],
      });

      expect(result.success).toBe(true);
      expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
        formats: ['markdown', 'links', 'images'],
      });
    });
  });
});

describe('urlToFilename', () => {
  it('should generate filename from simple URL', () => {
    expect(urlToFilename('https://example.com')).toBe('example.com.md');
  });

  it('should generate filename from URL with path', () => {
    expect(urlToFilename('https://example.com/about')).toBe(
      'example.com-about.md'
    );
  });

  it('should generate filename from URL with nested path', () => {
    expect(urlToFilename('https://example.com/docs/api/v2')).toBe(
      'example.com-docs-api-v2.md'
    );
  });

  it('should strip www prefix', () => {
    expect(urlToFilename('https://www.example.com/page')).toBe(
      'example.com-page.md'
    );
  });

  it('should strip trailing slash from path', () => {
    expect(urlToFilename('https://example.com/about/')).toBe(
      'example.com-about.md'
    );
  });

  it('should handle root URL with trailing slash', () => {
    expect(urlToFilename('https://example.com/')).toBe('example.com.md');
  });

  it('should handle invalid URL by sanitizing', () => {
    const result = urlToFilename('not a valid url');
    expect(result).toMatch(/\.md$/);
    expect(result).not.toContain(' ');
  });
});

describe('urlToNestedPath', () => {
  it('should create nested path from URL with path', () => {
    expect(urlToNestedPath('https://docs.example.com/features/scrape')).toBe(
      'docs.example.com/features/scrape/index.md'
    );
  });

  it('should create path for root URL', () => {
    expect(urlToNestedPath('https://docs.example.com/')).toBe(
      'docs.example.com/index.md'
    );
  });

  it('should create path for root URL without trailing slash', () => {
    expect(urlToNestedPath('https://docs.example.com')).toBe(
      'docs.example.com/index.md'
    );
  });

  it('should strip www prefix', () => {
    expect(urlToNestedPath('https://www.example.com/docs')).toBe(
      'example.com/docs/index.md'
    );
  });

  it('should use custom filename', () => {
    expect(urlToNestedPath('https://example.com/page', 'index.html')).toBe(
      'example.com/page/index.html'
    );
  });

  it('should use empty filename for directory only', () => {
    expect(urlToNestedPath('https://example.com/path', '')).toBe(
      'example.com/path/'
    );
  });

  it('should handle invalid URL by sanitizing', () => {
    const result = urlToNestedPath('not a url');
    expect(result).toContain('index.md');
  });
});

describe('getTopPaths', () => {
  it('should extract top-level path segments with counts', () => {
    const urls = [
      'https://example.com/docs/intro',
      'https://example.com/docs/api',
      'https://example.com/docs/guide',
      'https://example.com/blog/post1',
      'https://example.com/blog/post2',
    ];

    const result = getTopPaths(urls);

    expect(result).toEqual([
      { path: '/docs', count: 3 },
      { path: '/blog', count: 2 },
    ]);
  });

  it('should sort by frequency descending', () => {
    const urls = [
      'https://example.com/a/1',
      'https://example.com/b/1',
      'https://example.com/b/2',
      'https://example.com/b/3',
      'https://example.com/c/1',
      'https://example.com/c/2',
    ];

    const result = getTopPaths(urls);

    expect(result[0].path).toBe('/b');
    expect(result[0].count).toBe(3);
    expect(result[1].path).toBe('/c');
    expect(result[1].count).toBe(2);
    expect(result[2].path).toBe('/a');
    expect(result[2].count).toBe(1);
  });

  it('should handle root URLs (no path segment)', () => {
    const urls = ['https://example.com/', 'https://example.com'];

    const result = getTopPaths(urls);

    expect(result).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(getTopPaths([])).toEqual([]);
  });

  it('should skip invalid URLs', () => {
    const urls = [
      'https://example.com/docs/intro',
      'not-a-url',
      'https://example.com/docs/api',
    ];

    const result = getTopPaths(urls);

    expect(result).toEqual([{ path: '/docs', count: 2 }]);
  });

  it('should handle single-segment paths', () => {
    const urls = ['https://example.com/about', 'https://example.com/contact'];

    const result = getTopPaths(urls);

    expect(result).toEqual([
      { path: '/about', count: 1 },
      { path: '/contact', count: 1 },
    ]);
  });
});
