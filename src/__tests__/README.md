# Testing Guide

This directory contains tests for the Firecrawl CLI. Tests use **Vitest** with **v8** coverage and mock the Firecrawl client to avoid making real API calls.

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
npx vitest run --coverage
```

## Test Structure

```
__tests__/
├── commands/                # Command implementation tests
│   ├── agent.test.ts
│   ├── browser.test.ts
│   ├── config.test.ts
│   ├── crawl.test.ts
│   ├── map.test.ts
│   ├── scrape.test.ts
│   ├── search.test.ts
│   ├── status.test.ts
│   └── version.test.ts
└── utils/                   # Utility module tests & helpers
    ├── mock-client.ts       # Shared mock client helper
    ├── auth.test.ts
    ├── browser-session.test.ts
    ├── client.test.ts
    ├── config.test.ts
    ├── options.test.ts
    ├── output.test.ts
    ├── settings.test.ts
    └── url.test.ts
```

## Writing Tests

### Key Principles

1. **No Real API Calls**: All tests mock the Firecrawl client or fetch API
2. **Verify API Call Generation**: Tests ensure commands generate correct API call parameters
3. **Verify Response Handling**: Tests ensure commands properly handle success and error responses
4. **Type Safety**: TypeScript ensures type correctness

### Example Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeScrape } from '../../commands/scrape';
import { getClient } from '../../utils/client';
import { setupTest, teardownTest } from '../utils/mock-client';

// Mock the client module
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
    mockClient = { scrape: vi.fn() };
    vi.mocked(getClient).mockReturnValue(mockClient);
  });

  it('should call scrape with correct parameters', async () => {
    mockClient.scrape.mockResolvedValue({ markdown: '# Test' });

    await executeScrape({ url: 'https://example.com' });

    expect(mockClient.scrape).toHaveBeenCalledWith('https://example.com', {
      formats: ['markdown'],
    });
  });
});
```

### Common Mock Patterns

#### Mocking Settings (src/utils/settings.ts)

```typescript
import * as settings from '../../utils/settings';

vi.mock('../../utils/settings');

vi.mocked(settings.loadSettings).mockReturnValue({
  apiKey: 'test-key',
  apiUrl: 'https://api.test.com',
  dataDir: '/tmp/test-data',
});
```

#### Mocking the Firecrawl Client

```typescript
import { getClient } from '../../utils/client';

vi.mock('../../utils/client', async () => {
  const actual = await vi.importActual('../../utils/client');
  return { ...actual, getClient: vi.fn() };
});

const mockClient = { scrape: vi.fn(), map: vi.fn() };
vi.mocked(getClient).mockReturnValue(mockClient);
```

#### Mocking Fetch API

```typescript
const mockFetch = vi.fn();
global.fetch = mockFetch;

mockFetch.mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true }),
});
```

## Test Utilities

### `setupTest()` / `teardownTest()`

Defined in `utils/mock-client.ts`. Resets client and config state between tests. Always use these in `beforeEach` / `afterEach`.

### Console Capture

Many tests capture `console.log` / `console.error` output to verify user-facing messages:

```typescript
let consoleOutput: string[];
beforeEach(() => {
  consoleOutput = [];
  vi.spyOn(console, 'log').mockImplementation((...args) => {
    consoleOutput.push(args.join(' '));
  });
});
```

## What to Test

1. **API Call Parameters**: Verify commands pass correct parameters to the client
2. **Response Handling**: Test success and error response handling
3. **Option Parsing**: Ensure CLI options are correctly converted to API parameters
4. **Edge Cases**: Test with missing/optional parameters, null values, etc.
5. **Configuration Flow**: Test settings loading, saving, and priority resolution
