import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleInitCommand } from '../../commands/init';

describe('handleInitCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs non-interactive mode with skipAuth and completes', async () => {
    await handleInitCommand({
      yes: true,
      skipAuth: true,
    });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Setup complete')
    );
  });
});
