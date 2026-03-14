import type { PermissionMode } from '../stores/uiStore';

export type CliPermissionMode =
  | 'default'
  | 'plan'
  | 'auto'
  | 'dontAsk'
  | 'acceptEdits'
  | 'bypassPermissions';

const UI_TO_CLI_MODE: Record<PermissionMode, CliPermissionMode> = {
  default: 'default',
  plan: 'plan',
  'full-access': 'bypassPermissions',
};

const VALID_CLI_MODES = new Set<CliPermissionMode>([
  'default',
  'plan',
  'auto',
  'dontAsk',
  'acceptEdits',
  'bypassPermissions',
]);

export function toCliPermissionMode(input?: string | null): CliPermissionMode | undefined {
  if (!input) return undefined;

  const normalized = input.trim();
  if (!normalized) return undefined;

  if (normalized === 'default' || normalized === 'plan' || normalized === 'full-access') {
    return UI_TO_CLI_MODE[normalized];
  }

  if (VALID_CLI_MODES.has(normalized as CliPermissionMode)) {
    return normalized as CliPermissionMode;
  }

  return undefined;
}
