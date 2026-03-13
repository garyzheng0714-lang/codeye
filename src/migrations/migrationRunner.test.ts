import { describe, expect, it } from 'vitest';
import { migrateData, getSchemaVersion, registerMigration } from './migrationRunner';

describe('migrationRunner', () => {
  it('detects schema version from data', () => {
    expect(getSchemaVersion({ _schemaVersion: 3 })).toBe(3);
    expect(getSchemaVersion({})).toBe(1);
    expect(getSchemaVersion(null)).toBe(1);
    expect(getSchemaVersion({ _schemaVersion: 'invalid' })).toBe(1);
  });

  it('runs chain migrations', () => {
    registerMigration(1, 2, (data) => ({
      ...data,
      newFieldV2: true,
    }));

    registerMigration(2, 3, (data) => ({
      ...data,
      newFieldV3: 'hello',
    }));

    const result = migrateData(
      { _schemaVersion: 1, name: 'test' },
      1,
      3
    );

    expect(result._schemaVersion).toBe(3);
    expect(result.newFieldV2).toBe(true);
    expect(result.newFieldV3).toBe('hello');
    expect(result.name).toBe('test');
  });

  it('returns data unchanged if already at target version', () => {
    const data = { _schemaVersion: 3, name: 'test' };
    const result = migrateData(data, 3, 3);
    expect(result).toEqual(data);
  });

  it('throws on non-sequential migration registration', () => {
    expect(() => registerMigration(1, 3, (d) => d)).toThrow('sequential');
  });

  it('throws on missing migration in chain', () => {
    expect(() => migrateData({ _schemaVersion: 5 }, 5, 7)).toThrow('Missing migration');
  });
});
