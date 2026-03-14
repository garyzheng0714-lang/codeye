import { describe, expect, it } from 'vitest';
import { toCliPermissionMode } from './permissionMode';

describe('permissionMode', () => {
  it('maps ui modes to cli modes', () => {
    expect(toCliPermissionMode('default')).toBe('default');
    expect(toCliPermissionMode('plan')).toBe('plan');
    expect(toCliPermissionMode('full-access')).toBe('bypassPermissions');
  });

  it('accepts valid cli mode values', () => {
    expect(toCliPermissionMode('auto')).toBe('auto');
    expect(toCliPermissionMode('dontAsk')).toBe('dontAsk');
    expect(toCliPermissionMode('acceptEdits')).toBe('acceptEdits');
    expect(toCliPermissionMode('bypassPermissions')).toBe('bypassPermissions');
  });

  it('returns undefined for unknown values', () => {
    expect(toCliPermissionMode(undefined)).toBeUndefined();
    expect(toCliPermissionMode('')).toBeUndefined();
    expect(toCliPermissionMode('unknown')).toBeUndefined();
  });
});
