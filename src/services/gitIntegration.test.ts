import { describe, expect, it } from 'vitest';
import {
  sanitizeBranchName,
  suggestBranchName,
  isValidBranchName,
  resolveBranchConflict,
  createCheckpointRefName,
  parseCheckpointRef,
} from './gitIntegration';

describe('gitIntegration', () => {
  describe('sanitizeBranchName', () => {
    it('lowercases and replaces invalid chars', () => {
      expect(sanitizeBranchName('Fix Bug #123')).toBe('fix-bug-123');
    });

    it('collapses multiple dashes', () => {
      expect(sanitizeBranchName('hello---world')).toBe('hello-world');
    });

    it('trims leading/trailing dashes', () => {
      expect(sanitizeBranchName('-hello-')).toBe('hello');
    });

    it('truncates to 80 chars', () => {
      const long = 'a'.repeat(100);
      expect(sanitizeBranchName(long).length).toBeLessThanOrEqual(80);
    });
  });

  describe('suggestBranchName', () => {
    it('creates branch name from message', () => {
      expect(suggestBranchName('Add user authentication')).toBe('feat/add-user-authentication');
    });

    it('limits to 5 words', () => {
      const result = suggestBranchName('one two three four five six seven');
      const parts = result.replace('feat/', '').split('-');
      expect(parts.length).toBeLessThanOrEqual(5);
    });

    it('returns default for empty message', () => {
      expect(suggestBranchName('')).toBe('feat/codeye-session');
    });
  });

  describe('isValidBranchName', () => {
    it('accepts valid names', () => {
      expect(isValidBranchName('feat/my-branch')).toBe(true);
      expect(isValidBranchName('fix/bug-123')).toBe(true);
      expect(isValidBranchName('main')).toBe(true);
    });

    it('rejects invalid names', () => {
      expect(isValidBranchName('')).toBe(false);
      expect(isValidBranchName('has spaces')).toBe(false);
    });
  });

  describe('resolveBranchConflict', () => {
    it('returns original if no conflict', () => {
      expect(resolveBranchConflict('feat/new', ['main', 'dev'])).toBe('feat/new');
    });

    it('appends suffix on conflict', () => {
      expect(resolveBranchConflict('feat/new', ['feat/new'])).toBe('feat/new-2');
    });

    it('increments suffix for multiple conflicts', () => {
      expect(resolveBranchConflict('feat/new', ['feat/new', 'feat/new-2'])).toBe('feat/new-3');
    });
  });

  describe('checkpointRef', () => {
    it('creates ref name', () => {
      const ref = createCheckpointRefName('abcdefgh-1234', 3);
      expect(ref).toBe('refs/codeye/checkpoints/abcdefgh/3');
    });

    it('parses ref name', () => {
      const parsed = parseCheckpointRef('refs/codeye/checkpoints/abcdefgh/3');
      expect(parsed).toEqual({ sessionId: 'abcdefgh', turnIndex: 3 });
    });

    it('returns null for invalid ref', () => {
      expect(parseCheckpointRef('refs/heads/main')).toBeNull();
    });
  });
});
