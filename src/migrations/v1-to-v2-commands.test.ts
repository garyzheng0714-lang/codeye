import { describe, expect, it } from 'vitest';
import { migrateCommandsV1ToV2 } from './v1-to-v2-commands';

describe('v1-to-v2 commands migration', () => {
  it('wraps legacy array into versioned document', () => {
    const legacy = [{ name: 'test', prompt: 'run tests', description: 'Run tests' }];
    const result = migrateCommandsV1ToV2(legacy);
    expect(result._schemaVersion).toBe(2);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].name).toBe('test');
    expect(result.commands[0].prompt).toBe('run tests');
  });

  it('returns empty v2 document for null', () => {
    const result = migrateCommandsV1ToV2(null);
    expect(result._schemaVersion).toBe(2);
    expect(result.commands).toEqual([]);
  });

  it('returns empty v2 document for undefined', () => {
    const result = migrateCommandsV1ToV2(undefined);
    expect(result._schemaVersion).toBe(2);
    expect(result.commands).toEqual([]);
  });

  it('passes through already-v2 document', () => {
    const v2 = { _schemaVersion: 2, commands: [{ name: 'a', prompt: 'b' }] };
    const result = migrateCommandsV1ToV2(v2);
    expect(result._schemaVersion).toBe(2);
    expect(result.commands).toHaveLength(1);
  });

  it('filters out invalid entries from legacy array', () => {
    const legacy = [
      { name: 'valid', prompt: 'ok' },
      'not-an-object',
      { noName: true },
      null,
    ];
    const result = migrateCommandsV1ToV2(legacy);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].name).toBe('valid');
  });
});
