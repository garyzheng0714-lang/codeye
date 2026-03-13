export type InboxTier = 'needs_attention' | 'active' | 'recent' | 'archived';

export interface InboxEntry {
  sessionId: string;
  tier: InboxTier;
  unreadCount: number;
  lastActivityAt: number;
  hasPendingApproval: boolean;
  hasError: boolean;
}

const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000;
const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function classifySession(opts: {
  lastActivityAt: number;
  hasPendingApproval: boolean;
  hasError: boolean;
  isStreaming: boolean;
  unreadCount: number;
}): InboxTier {
  if (opts.hasPendingApproval || opts.hasError) {
    return 'needs_attention';
  }

  const elapsed = Date.now() - opts.lastActivityAt;

  if (opts.isStreaming || elapsed < ACTIVE_THRESHOLD_MS) {
    return 'active';
  }

  if (elapsed < RECENT_THRESHOLD_MS) {
    return 'recent';
  }

  return 'archived';
}

export function sortInboxEntries(entries: InboxEntry[]): InboxEntry[] {
  const tierOrder: Record<InboxTier, number> = {
    needs_attention: 0,
    active: 1,
    recent: 2,
    archived: 3,
  };

  return [...entries].sort((a, b) => {
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return b.lastActivityAt - a.lastActivityAt;
  });
}

export function groupByTier(entries: InboxEntry[]): Record<InboxTier, InboxEntry[]> {
  const grouped: Record<InboxTier, InboxEntry[]> = {
    needs_attention: [],
    active: [],
    recent: [],
    archived: [],
  };

  for (const entry of entries) {
    grouped[entry.tier].push(entry);
  }

  return grouped;
}
