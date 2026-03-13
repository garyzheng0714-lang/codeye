type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

interface MigrationEntry {
  from: number;
  to: number;
  migrate: MigrationFn;
}

const migrations: MigrationEntry[] = [];

export function registerMigration(from: number, to: number, migrate: MigrationFn): void {
  if (to !== from + 1) {
    throw new Error(`Migration must be sequential: v${from} -> v${from + 1}, got v${from} -> v${to}`);
  }
  migrations.push({ from, to, migrate });
  migrations.sort((a, b) => a.from - b.from);
}

export function migrateData(
  data: Record<string, unknown>,
  currentVersion: number,
  targetVersion: number
): Record<string, unknown> {
  if (currentVersion >= targetVersion) return data;

  let result = { ...data };

  for (let v = currentVersion; v < targetVersion; v++) {
    const entry = migrations.find((m) => m.from === v);
    if (!entry) {
      throw new Error(`Missing migration: v${v} -> v${v + 1}`);
    }
    result = entry.migrate(result);
    result._schemaVersion = entry.to;
  }

  return result;
}

export function getSchemaVersion(data: unknown): number {
  if (data && typeof data === 'object' && '_schemaVersion' in data) {
    const version = (data as Record<string, unknown>)._schemaVersion;
    if (typeof version === 'number' && Number.isFinite(version)) {
      return version;
    }
  }
  return 1;
}

