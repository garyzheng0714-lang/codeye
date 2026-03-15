import {
  DEFAULT_SERVER_FLAGS,
  type FeatureFlagDocumentV1,
  type FeatureFlags,
} from '../src/types/featureFlags';

let serverFlags: FeatureFlags = { ...DEFAULT_SERVER_FLAGS };

export function reconcileFlags(input: Partial<FeatureFlags>): FeatureFlags {
  const next: FeatureFlags = {
    ...DEFAULT_SERVER_FLAGS,
    ...input,
  };

  if (!next.protocolV2) {
    return {
      ...next,
      gitReadStatus: false,
      gitWriteFlow: false,
      gitResultCards: false,
      toolApproval: false,
      streamingMarkdown: false,
      commandPalette: false,
    };
  }

  if (!next.gitReadStatus) {
    next.gitWriteFlow = false;
    next.gitResultCards = false;
  }

  if (!next.gitWriteFlow) {
    next.gitResultCards = false;
  }

  return next;
}

export function getServerFlags(): FeatureFlags {
  return { ...serverFlags };
}

export function setServerFlags(update: Partial<FeatureFlags>): FeatureFlags {
  serverFlags = reconcileFlags({
    ...serverFlags,
    ...update,
  });
  return getServerFlags();
}

export function getServerFeatureFlagDocument(
  now = Date.now()
): FeatureFlagDocumentV1 {
  return {
    _schemaVersion: 1,
    flags: getServerFlags(),
    updatedAt: now,
  };
}

export function resetServerFlagsForTests(): void {
  serverFlags = { ...DEFAULT_SERVER_FLAGS };
}
