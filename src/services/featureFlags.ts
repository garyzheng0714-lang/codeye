import {
  DEFAULT_LOCAL_FLAGS,
  DEFAULT_SERVER_FLAGS,
  mergeEffectiveFlags,
  parseFeatureFlagDocument,
  type FeatureFlagDocumentV1,
  type FeatureFlags,
} from '../types/featureFlags';
import type { StorageAdapter } from '../storage/adapter';
import { getDefaultStorageAdapter } from '../storage/adapter';

export const FEATURE_FLAGS_STORAGE_KEY = 'codeye.feature-flags';
const FEATURE_FLAGS_SCHEMA_VERSION = 1;

let serverDocument: FeatureFlagDocumentV1 = {
  _schemaVersion: FEATURE_FLAGS_SCHEMA_VERSION,
  flags: { ...DEFAULT_SERVER_FLAGS },
  updatedAt: 0,
};

function buildLocalDefaultDocument(now = Date.now()): FeatureFlagDocumentV1 {
  return {
    _schemaVersion: FEATURE_FLAGS_SCHEMA_VERSION,
    flags: { ...DEFAULT_LOCAL_FLAGS },
    updatedAt: now,
  };
}

function parseFromStorage(raw: string | null): FeatureFlagDocumentV1 | null {
  if (!raw) return null;
  try {
    return parseFeatureFlagDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadLocalFeatureFlagDocument(
  adapter: StorageAdapter = getDefaultStorageAdapter()
): FeatureFlagDocumentV1 {
  const parsed = parseFromStorage(adapter.getItem(FEATURE_FLAGS_STORAGE_KEY));
  if (parsed) return parsed;

  const fallback = buildLocalDefaultDocument();
  adapter.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
}

export function saveLocalFeatureFlags(
  patch: Partial<FeatureFlags>,
  adapter: StorageAdapter = getDefaultStorageAdapter()
): FeatureFlagDocumentV1 {
  const current = loadLocalFeatureFlagDocument(adapter);
  const next: FeatureFlagDocumentV1 = {
    _schemaVersion: FEATURE_FLAGS_SCHEMA_VERSION,
    flags: {
      ...current.flags,
      ...patch,
    },
    updatedAt: Date.now(),
  };
  adapter.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function applyServerFeatureFlagDocument(raw: unknown): FeatureFlagDocumentV1 {
  const parsed = parseFeatureFlagDocument(raw);
  if (parsed) {
    serverDocument = parsed;
    return serverDocument;
  }

  return serverDocument;
}

export function getServerFeatureFlagDocument(): FeatureFlagDocumentV1 {
  return serverDocument;
}

export function getEffectiveFeatureFlags(
  adapter: StorageAdapter = getDefaultStorageAdapter()
): FeatureFlags {
  const local = loadLocalFeatureFlagDocument(adapter);
  return mergeEffectiveFlags(serverDocument.flags, local.flags);
}

export function isEnabled(
  flag: keyof FeatureFlags,
  adapter: StorageAdapter = getDefaultStorageAdapter()
): boolean {
  return getEffectiveFeatureFlags(adapter)[flag];
}

export function resetFeatureFlagsStateForTests(): void {
  serverDocument = {
    _schemaVersion: FEATURE_FLAGS_SCHEMA_VERSION,
    flags: { ...DEFAULT_SERVER_FLAGS },
    updatedAt: 0,
  };
}
