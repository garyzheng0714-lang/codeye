import { describe, expect, it } from 'vitest';
import {
  parseContextReferences,
  stripContextReferences,
  buildContextPrompt,
} from './contextReferences';

describe('contextReferences', () => {
  describe('parseContextReferences', () => {
    it('parses file reference', () => {
      const refs = parseContextReferences('look at #file src/App.tsx');
      expect(refs).toHaveLength(1);
      expect(refs[0].type).toBe('file');
      expect(refs[0].value).toBe('src/App.tsx');
    });

    it('parses codebase reference', () => {
      const refs = parseContextReferences('search #codebase for auth');
      expect(refs).toHaveLength(1);
      expect(refs[0].type).toBe('codebase');
    });

    it('parses multiple references', () => {
      const refs = parseContextReferences('#file src/a.ts and #git_diff');
      expect(refs).toHaveLength(2);
    });

    it('deduplicates references', () => {
      const refs = parseContextReferences('#file src/a.ts and #file src/a.ts');
      expect(refs).toHaveLength(1);
    });

    it('handles no references', () => {
      const refs = parseContextReferences('just a normal message');
      expect(refs).toHaveLength(0);
    });
  });

  describe('stripContextReferences', () => {
    it('removes context references from input', () => {
      const stripped = stripContextReferences('fix #file src/a.ts please');
      expect(stripped).toBe('fix please');
    });

    it('handles multiple references', () => {
      const stripped = stripContextReferences('#codebase look at #git_diff');
      expect(stripped).toBe('look at');
    });
  });

  describe('buildContextPrompt', () => {
    it('builds prompt from references', () => {
      const refs = parseContextReferences('#file src/a.ts');
      const prompt = buildContextPrompt(refs);
      expect(prompt).toContain('Read file');
      expect(prompt).toContain('src/a.ts');
    });

    it('returns empty for no refs', () => {
      expect(buildContextPrompt([])).toBe('');
    });
  });
});
