export interface CustomCommandV2 {
  name: string;
  prompt: string;
  description?: string;
}

export interface CommandDocumentV2 {
  _schemaVersion: 2;
  commands: CustomCommandV2[];
}

export function migrateCommandsV1ToV2(raw: unknown): CommandDocumentV2 {
  if (!raw) return { _schemaVersion: 2, commands: [] };

  if (typeof raw === 'object' && raw !== null && '_schemaVersion' in raw) {
    const doc = raw as Record<string, unknown>;
    if (doc._schemaVersion === 2) return raw as CommandDocumentV2;
  }

  if (Array.isArray(raw)) {
    const commands: CustomCommandV2[] = raw
      .filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).name === 'string'
      )
      .map((item) => ({
        name: String(item.name),
        prompt: String(item.prompt || ''),
        description: typeof item.description === 'string' ? item.description : undefined,
      }));
    return { _schemaVersion: 2, commands };
  }

  return { _schemaVersion: 2, commands: [] };
}
