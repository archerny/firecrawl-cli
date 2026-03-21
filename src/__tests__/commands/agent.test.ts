/**
 * Tests for agent command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAgent } from '../../commands/agent';
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

// Mock spinner to avoid real timers
vi.mock('../../utils/spinner', () => ({
  createSpinner: vi.fn(() => ({
    start: vi.fn(),
    update: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
}));

// Mock fs for loadSchemaFromFile
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

describe('executeAgent', () => {
  let mockClient: any;

  beforeEach(() => {
    setupTest();
    initializeConfig({
      apiKey: 'test-api-key',
      apiUrl: 'https://api.firecrawl.dev',
    });

    mockClient = {
      startAgent: vi.fn(),
      getAgentStatus: vi.fn(),
    };

    vi.mocked(getClient).mockReturnValue(mockClient as any);
  });

  afterEach(() => {
    teardownTest();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Start agent (non-wait mode)', () => {
    it('should start agent with prompt and return job ID', async () => {
      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-123',
      });

      const result = await executeAgent({
        prompt: 'Extract data from example.com',
      });

      expect(result.success).toBe(true);
      expect(result).toEqual({
        success: true,
        data: {
          jobId: 'job-123',
          status: 'processing',
        },
      });
    });

    it('should pass urls to startAgent when provided', async () => {
      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-456',
      });

      await executeAgent({
        prompt: 'Extract data',
        urls: ['https://example.com', 'https://test.com'],
      });

      expect(mockClient.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Extract data',
          urls: ['https://example.com', 'https://test.com'],
          integration: 'cli',
        })
      );
    });

    it('should pass model to startAgent when provided', async () => {
      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-789',
      });

      await executeAgent({
        prompt: 'Extract data',
        model: 'spark-1-pro',
      });

      expect(mockClient.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Extract data',
          model: 'spark-1-pro',
          integration: 'cli',
        })
      );
    });

    it('should pass apiKey and apiUrl to getClient', async () => {
      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-abc',
      });

      await executeAgent({
        prompt: 'Extract data',
        apiKey: 'fc-custom-key',
        apiUrl: 'https://custom.api.dev',
      });

      expect(getClient).toHaveBeenCalledWith({
        apiKey: 'fc-custom-key',
        apiUrl: 'https://custom.api.dev',
      });
    });

    it('should return error when startAgent fails', async () => {
      mockClient.startAgent.mockRejectedValue(new Error('API rate limit'));

      const result = await executeAgent({
        prompt: 'Extract data',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit');
    });

    it('should handle non-Error exceptions', async () => {
      mockClient.startAgent.mockRejectedValue('string error');

      const result = await executeAgent({
        prompt: 'Extract data',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });
  });

  describe('Status check mode', () => {
    it('should check status when input is a job ID (UUID)', async () => {
      const jobId = '550e8400-e29b-41d4-a716-446655440000';
      mockClient.getAgentStatus.mockResolvedValue({
        success: true,
        status: 'completed',
        data: { result: 'extracted data' },
        expiresAt: '2026-04-01T00:00:00Z',
      });

      const result = await executeAgent({
        prompt: jobId,
      });

      expect(result.success).toBe(true);
      expect(result).toEqual({
        success: true,
        data: {
          id: jobId,
          status: 'completed',
          data: { result: 'extracted data' },
          expiresAt: '2026-04-01T00:00:00Z',
        },
      });
    });

    it('should check status when status flag is set', async () => {
      mockClient.getAgentStatus.mockResolvedValue({
        success: true,
        status: 'processing',
        data: null,
      });

      const result = await executeAgent({
        prompt: 'some-id',
        status: true,
      });

      expect(result.success).toBe(true);
      expect((result as any).data.status).toBe('processing');
    });

    it('should return error when status check fails', async () => {
      mockClient.getAgentStatus.mockRejectedValue(new Error('Not found'));

      const result = await executeAgent({
        prompt: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('Wait mode', () => {
    it('should poll until agent completes', async () => {
      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-wait-1',
      });

      mockClient.getAgentStatus.mockResolvedValueOnce({
        success: true,
        status: 'completed',
        data: { answer: 'done' },
        expiresAt: '2026-04-01T00:00:00Z',
      });

      const result = await executeAgent({
        prompt: 'Extract data',
        wait: true,
        pollInterval: 0.01, // fast polling for test
      });

      expect(result.success).toBe(true);
      expect((result as any).data.status).toBe('completed');
    });

    it('should return failure when agent fails during wait', async () => {
      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-wait-fail',
      });

      mockClient.getAgentStatus.mockResolvedValueOnce({
        success: false,
        status: 'failed',
        data: null,
        error: 'Agent execution failed',
      });

      const result = await executeAgent({
        prompt: 'Extract data',
        wait: true,
        pollInterval: 0.01,
      });

      expect(result.success).toBe(false);
      expect((result as any).data.status).toBe('failed');
    });

    it('should timeout when agent takes too long', async () => {
      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-timeout',
      });

      // Always return processing
      mockClient.getAgentStatus.mockResolvedValue({
        success: true,
        status: 'processing',
        data: null,
      });

      const result = await executeAgent({
        prompt: 'Extract data',
        wait: true,
        pollInterval: 0.01,
        timeout: 0.01, // very short timeout
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });

    it('should return error when startAgent fails in wait mode', async () => {
      mockClient.startAgent.mockRejectedValue(new Error('Service unavailable'));

      const result = await executeAgent({
        prompt: 'Extract data',
        wait: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
    });
  });

  describe('Schema handling', () => {
    it('should pass inline schema to startAgent', async () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
      };
      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-schema',
      });

      await executeAgent({
        prompt: 'Extract data',
        schema,
      });

      expect(mockClient.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          schema,
        })
      );
    });

    it('should load schema from file when schemaFile is provided', async () => {
      const { readFileSync } = await import('fs');
      const schemaContent =
        '{"type":"object","properties":{"name":{"type":"string"}}}';
      vi.mocked(readFileSync).mockReturnValue(schemaContent);

      mockClient.startAgent.mockResolvedValue({
        success: true,
        id: 'job-schema-file',
      });

      await executeAgent({
        prompt: 'Extract data',
        schemaFile: '/path/to/schema.json',
      });

      expect(readFileSync).toHaveBeenCalledWith(
        '/path/to/schema.json',
        'utf-8'
      );
      expect(mockClient.startAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: { type: 'object', properties: { name: { type: 'string' } } },
        })
      );
    });

    it('should throw for non-existent schema file', async () => {
      const { readFileSync } = await import('fs');
      const error = new Error('ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(readFileSync).mockImplementation(() => {
        throw error;
      });

      const result = await executeAgent({
        prompt: 'Extract data',
        schemaFile: '/nonexistent/schema.json',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema file not found');
    });

    it('should throw for invalid JSON in schema file', async () => {
      const { readFileSync } = await import('fs');
      vi.mocked(readFileSync).mockReturnValue('not valid json{');

      const result = await executeAgent({
        prompt: 'Extract data',
        schemaFile: '/path/to/bad.json',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON in schema file');
    });
  });

  describe('Error extraction', () => {
    it('should extract error from Firecrawl SDK details array', async () => {
      const sdkError = new Error('SDK Error') as any;
      sdkError.details = [
        { message: 'Invalid prompt' },
        { message: 'Too long' },
      ];
      mockClient.startAgent.mockRejectedValue(sdkError);

      const result = await executeAgent({ prompt: 'test' });
      expect(result.error).toBe('Invalid prompt; Too long');
    });

    it('should extract error from response.data.error', async () => {
      const apiError = new Error('API Error') as any;
      apiError.response = { data: { error: 'Rate limit exceeded' } };
      mockClient.startAgent.mockRejectedValue(apiError);

      const result = await executeAgent({ prompt: 'test' });
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should extract error from response.data.message', async () => {
      const apiError = new Error('API Error') as any;
      apiError.response = { data: { message: 'Unauthorized' } };
      mockClient.startAgent.mockRejectedValue(apiError);

      const result = await executeAgent({ prompt: 'test' });
      expect(result.error).toBe('Unauthorized');
    });

    it('should stringify response.data as fallback', async () => {
      const apiError = new Error('API Error') as any;
      apiError.response = { data: { code: 500 } };
      mockClient.startAgent.mockRejectedValue(apiError);

      const result = await executeAgent({ prompt: 'test' });
      expect(result.error).toBe(JSON.stringify({ code: 500 }));
    });
  });
});
