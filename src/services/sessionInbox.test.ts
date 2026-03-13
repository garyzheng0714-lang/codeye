import { describe, expect, it, vi } from 'vitest';
import { classifySession, sortInboxEntries, groupByTier, type InboxEntry } from './sessionInbox';

describe('sessionInbox', () => {
  describe('classifySession', () => {
    it('returns needs_attention for pending approval', () => {
      const tier = classifySession({
        lastActivityAt: Date.now(),
        hasPendingApproval: true,
        hasError: false,
        isStreaming: false,
        unreadCount: 0,
      });
      expect(tier).toBe('needs_attention');
    });

    it('returns needs_attention for errors', () => {
      const tier = classifySession({
        lastActivityAt: Date.now(),
        hasPendingApproval: false,
        hasError: true,
        isStreaming: false,
        unreadCount: 0,
      });
      expect(tier).toBe('needs_attention');
    });

    it('returns active for streaming sessions', () => {
      const tier = classifySession({
        lastActivityAt: Date.now() - 20 * 60 * 1000,
        hasPendingApproval: false,
        hasError: false,
        isStreaming: true,
        unreadCount: 0,
      });
      expect(tier).toBe('active');
    });

    it('returns active for recently active sessions', () => {
      const tier = classifySession({
        lastActivityAt: Date.now() - 5 * 60 * 1000,
        hasPendingApproval: false,
        hasError: false,
        isStreaming: false,
        unreadCount: 0,
      });
      expect(tier).toBe('active');
    });

    it('returns recent for sessions within 24h', () => {
      const tier = classifySession({
        lastActivityAt: Date.now() - 2 * 60 * 60 * 1000,
        hasPendingApproval: false,
        hasError: false,
        isStreaming: false,
        unreadCount: 0,
      });
      expect(tier).toBe('recent');
    });

    it('returns archived for old sessions', () => {
      const tier = classifySession({
        lastActivityAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        hasPendingApproval: false,
        hasError: false,
        isStreaming: false,
        unreadCount: 0,
      });
      expect(tier).toBe('archived');
    });
  });

  describe('sortInboxEntries', () => {
    it('sorts by tier priority then by recency', () => {
      const entries: InboxEntry[] = [
        { sessionId: 'a', tier: 'recent', unreadCount: 0, lastActivityAt: 100, hasPendingApproval: false, hasError: false },
        { sessionId: 'b', tier: 'needs_attention', unreadCount: 1, lastActivityAt: 200, hasPendingApproval: true, hasError: false },
        { sessionId: 'c', tier: 'active', unreadCount: 0, lastActivityAt: 300, hasPendingApproval: false, hasError: false },
      ];

      const sorted = sortInboxEntries(entries);
      expect(sorted[0].sessionId).toBe('b');
      expect(sorted[1].sessionId).toBe('c');
      expect(sorted[2].sessionId).toBe('a');
    });
  });

  describe('groupByTier', () => {
    it('groups entries by their tier', () => {
      const entries: InboxEntry[] = [
        { sessionId: 'a', tier: 'active', unreadCount: 0, lastActivityAt: 100, hasPendingApproval: false, hasError: false },
        { sessionId: 'b', tier: 'active', unreadCount: 0, lastActivityAt: 200, hasPendingApproval: false, hasError: false },
        { sessionId: 'c', tier: 'archived', unreadCount: 0, lastActivityAt: 50, hasPendingApproval: false, hasError: false },
      ];

      const grouped = groupByTier(entries);
      expect(grouped.active).toHaveLength(2);
      expect(grouped.archived).toHaveLength(1);
      expect(grouped.needs_attention).toHaveLength(0);
      expect(grouped.recent).toHaveLength(0);
    });
  });
});
