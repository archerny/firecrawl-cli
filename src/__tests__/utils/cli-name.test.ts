/**
 * Tests for CLI name utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCliName, resetCliName, setCliName } from '../../utils/cli-name';

describe('CLI Name Utility', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    resetCliName();
  });

  afterEach(() => {
    process.argv = originalArgv;
    resetCliName();
  });

  describe('getCliName', () => {
    it('should return "node <relative-path>" when invoked with node', () => {
      // Simulate: node bundle/index.cjs
      process.argv = [
        '/usr/local/bin/node',
        `${process.cwd()}/bundle/index.cjs`,
      ];
      const name = getCliName();
      expect(name).toBe('node bundle/index.cjs');
    });

    it('should return "node <relative-path>" for scripts/index.js', () => {
      process.argv = [
        '/usr/local/bin/node',
        `${process.cwd()}/scripts/index.js`,
      ];
      const name = getCliName();
      expect(name).toBe('node scripts/index.js');
    });

    it('should return "node <relative-path>" for dist/index.js', () => {
      process.argv = ['/usr/local/bin/node', `${process.cwd()}/dist/index.js`];
      const name = getCliName();
      expect(name).toBe('node dist/index.js');
    });

    it('should use absolute path when script is outside cwd', () => {
      process.argv = ['/usr/local/bin/node', '/some/other/path/index.js'];
      const name = getCliName();
      expect(name).toBe('node /some/other/path/index.js');
    });

    it('should cache the result after first call', () => {
      process.argv = [
        '/usr/local/bin/node',
        `${process.cwd()}/bundle/index.cjs`,
      ];
      const first = getCliName();
      // Change argv — should not affect cached result
      process.argv = [
        '/usr/local/bin/node',
        `${process.cwd()}/other/script.js`,
      ];
      const second = getCliName();
      expect(second).toBe(first);
    });

    it('should return "firecrawl" when argv has fewer than 2 elements', () => {
      process.argv = ['/usr/local/bin/node'];
      const name = getCliName();
      expect(name).toBe('firecrawl');
    });
  });

  describe('setCliName', () => {
    it('should override the CLI name', () => {
      setCliName('my-custom-cli');
      expect(getCliName()).toBe('my-custom-cli');
    });
  });

  describe('resetCliName', () => {
    it('should clear the cached name', () => {
      setCliName('cached-name');
      expect(getCliName()).toBe('cached-name');

      resetCliName();
      // After reset, it should re-derive from process.argv
      process.argv = [
        '/usr/local/bin/node',
        `${process.cwd()}/bundle/index.cjs`,
      ];
      expect(getCliName()).toBe('node bundle/index.cjs');
    });
  });
});
