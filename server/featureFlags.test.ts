import { afterEach, describe, expect, it } from 'vitest';
import {
  getServerFeatureFlagDocument,
  getServerFlags,
  reconcileFlags,
  resetServerFlagsForTests,
  setServerFlags,
} from './featureFlags';

describe('server feature flags', () => {
  afterEach(() => {
    resetServerFlagsForTests();
  });

  it('auto-disables dependent flags when protocolV2 is off', () => {
    const out = reconcileFlags({ protocolV2: false, gitWriteFlow: true });
    expect(out.protocolV2).toBe(false);
    expect(out.gitWriteFlow).toBe(false);
    expect(out.gitReadStatus).toBe(false);
    expect(out.gitResultCards).toBe(false);
  });

  it('auto-disables write/result flags when gitReadStatus is off', () => {
    const out = reconcileFlags({
      protocolV2: true,
      gitReadStatus: false,
      gitWriteFlow: true,
      gitResultCards: true,
    });
    expect(out.gitReadStatus).toBe(false);
    expect(out.gitWriteFlow).toBe(false);
    expect(out.gitResultCards).toBe(false);
  });

  it('applies updates and returns authoritative snapshot', () => {
    setServerFlags({ commandExperience: false, streamingEnhancements: false });
    const snapshot = getServerFlags();
    expect(snapshot.commandExperience).toBe(false);
    expect(snapshot.streamingEnhancements).toBe(false);
  });

  it('builds versioned feature flag document for websocket sync', () => {
    setServerFlags({ toolApprovalBlocking: false });
    const doc = getServerFeatureFlagDocument(1234);
    expect(doc._schemaVersion).toBe(1);
    expect(doc.updatedAt).toBe(1234);
    expect(doc.flags.toolApprovalBlocking).toBe(false);
  });

  it('auto-disables toolApprovalBlocking when protocolV2 off', () => {
    const out = reconcileFlags({ protocolV2: false, toolApprovalBlocking: true });
    expect(out.toolApprovalBlocking).toBe(false);
  });

  it('auto-disables streamingEnhancements when protocolV2 off', () => {
    const out = reconcileFlags({ protocolV2: false, streamingEnhancements: true });
    expect(out.streamingEnhancements).toBe(false);
  });
});
