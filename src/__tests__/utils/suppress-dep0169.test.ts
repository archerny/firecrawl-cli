import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for the DEP0169 url.parse() deprecation warning suppression
 * that is applied in src/index.ts.
 *
 * Since the suppression directly patches process.emitWarning at startup,
 * we replicate the same patching logic here to verify it in isolation.
 */

function installDep0169Filter(spy: ReturnType<typeof vi.fn>): () => void {
  const originalEmitWarning = process.emitWarning;
  // We spy on the original function to track which warnings pass through
  const wrappedOriginal = ((...args: unknown[]) => {
    spy(...args);
    // Don't actually call originalEmitWarning to avoid real warnings in test output
  }) as typeof process.emitWarning;

  process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
    if (
      typeof warning === 'string' &&
      warning.includes('url.parse()') &&
      (args[0] === 'DeprecationWarning' ||
        (typeof args[0] === 'object' &&
          args[0] !== null &&
          'code' in args[0] &&
          (args[0] as Record<string, unknown>).code === 'DEP0169'))
    ) {
      return;
    }
    if (
      warning instanceof Error &&
      warning.message.includes('url.parse()') &&
      ((warning as NodeJS.ErrnoException).code === 'DEP0169' ||
        args[0] === 'DeprecationWarning')
    ) {
      return;
    }
    return wrappedOriginal.call(process, warning, ...args);
  }) as typeof process.emitWarning;

  return () => {
    process.emitWarning = originalEmitWarning;
  };
}

describe('DEP0169 url.parse() deprecation suppression', () => {
  let restore: () => void;
  let passThroughSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    passThroughSpy = vi.fn();
    restore = installDep0169Filter(passThroughSpy);
  });

  afterEach(() => {
    restore();
  });

  it('should suppress string-based DEP0169 warning with DeprecationWarning type', () => {
    process.emitWarning(
      '`url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead.',
      'DeprecationWarning'
    );
    expect(passThroughSpy).not.toHaveBeenCalled();
  });

  it('should suppress string-based DEP0169 warning with code option', () => {
    process.emitWarning('`url.parse()` behavior is not standardized', {
      code: 'DEP0169',
      type: 'DeprecationWarning',
    } as never);
    expect(passThroughSpy).not.toHaveBeenCalled();
  });

  it('should suppress Error-based DEP0169 warning', () => {
    const err = new Error(
      '`url.parse()` behavior is not standardized'
    ) as NodeJS.ErrnoException;
    err.code = 'DEP0169';
    process.emitWarning(err);
    expect(passThroughSpy).not.toHaveBeenCalled();
  });

  it('should suppress Error-based warning with url.parse() message and DeprecationWarning type', () => {
    const err = new Error('`url.parse()` is deprecated');
    process.emitWarning(err, 'DeprecationWarning');
    expect(passThroughSpy).not.toHaveBeenCalled();
  });

  it('should NOT suppress unrelated deprecation warnings', () => {
    process.emitWarning(
      'Buffer() is deprecated due to security and usability issues.',
      'DeprecationWarning'
    );
    expect(passThroughSpy).toHaveBeenCalledTimes(1);
    expect(passThroughSpy).toHaveBeenCalledWith(
      'Buffer() is deprecated due to security and usability issues.',
      'DeprecationWarning'
    );
  });

  it('should NOT suppress non-deprecation warnings', () => {
    process.emitWarning('Something went wrong');
    expect(passThroughSpy).toHaveBeenCalledTimes(1);
    expect(passThroughSpy).toHaveBeenCalledWith('Something went wrong');
  });

  it('should NOT suppress warnings with url.parse in unrelated context', () => {
    process.emitWarning('Consider using url.parse() alternative');
    // This message contains 'url.parse()' but doesn't have the DeprecationWarning type
    // Our filter checks both the message AND the type/code, so plain warnings pass through
    expect(passThroughSpy).toHaveBeenCalledTimes(1);
  });
});
