import { describe, expect, it, beforeEach } from 'vitest';
import type { StorageAdapter } from '../storage/adapter';
import {
  FEATURE_FLAGS_STORAGE_KEY,
  applyServerFeatureFlagDocument,
  getEffectiveFeatureFlags,
  isEnabled,
  loadLocalFeatureFlagDocument,
  resetFeatureFlagsStateForTests,
  saveLocalFeatureFlags,
} from './featureFlags';

class TestStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe('featureFlags service', () => {
  let adapter: TestStorageAdapter;

  beforeEach(() => {
    adapter = new TestStorageAdapter();
    resetFeatureFlagsStateForTests();
  });

  it('loads local defaults with schema version when storage is empty', () => {
    const doc = loadLocalFeatureFlagDocument(adapter);
    expect(doc._schemaVersion).toBe(1);
    expect(doc.flags.gitReadStatus).toBe(true);
    expect(adapter.getItem(FEATURE_FLAGS_STORAGE_KEY)).not.toBeNull();
  });

  it('saves local overrides and keeps schema version', () => {
    const doc = saveLocalFeatureFlags({ commandPalette: true }, adapter);
    expect(doc._schemaVersion).toBe(1);
    expect(doc.flags.commandPalette).toBe(true);
  });

  it('falls back to defaults when stored document is invalid', () => {
    adapter.setItem(
      FEATURE_FLAGS_STORAGE_KEY,
      JSON.stringify({ _schemaVersion: 2, flags: {}, updatedAt: Date.now() })
    );
    const doc = loadLocalFeatureFlagDocument(adapter);
    expect(doc._schemaVersion).toBe(1);
    expect(doc.flags.protocolV2).toBe(true);
  });

  it('computes effective flags using local && server', () => {
    saveLocalFeatureFlags({ commandPalette: true, toolApproval: true }, adapter);
    applyServerFeatureFlagDocument({
      _schemaVersion: 1,
      flags: {
        protocolV2: true,
        gitReadStatus: true,
        gitWriteFlow: true,
        gitResultCards: true,
        toolApproval: false,
        streamingMarkdown: false,
        commandPalette: true,
      },
      updatedAt: Date.now(),
    });

    const effective = getEffectiveFeatureFlags(adapter);
    expect(effective.commandPalette).toBe(true);
    expect(effective.toolApproval).toBe(false);
  });

  it('isEnabled reads effective value', () => {
    saveLocalFeatureFlags({ commandPalette: true }, adapter);
    applyServerFeatureFlagDocument({
      _schemaVersion: 1,
      flags: {
        protocolV2: true,
        gitReadStatus: true,
        gitWriteFlow: true,
        gitResultCards: true,
        toolApproval: true,
        streamingMarkdown: true,
        commandPalette: false,
      },
      updatedAt: Date.now(),
    });

    expect(isEnabled('commandPalette', adapter)).toBe(false);
  });
});
