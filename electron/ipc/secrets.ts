import { IpcMain, app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

interface SecretEntry {
  value: string;
  encrypted: boolean;
  updatedAt: number;
}

interface SecretFile {
  _schemaVersion: 1;
  secrets: Record<string, SecretEntry>;
}

const SECRET_FILE_NAME = 'secrets.json';
const SECRET_SCHEMA_VERSION = 1;

function getSecretsPath(): string {
  return path.join(app.getPath('userData'), SECRET_FILE_NAME);
}

function readSecretFile(): SecretFile {
  const filePath = getSecretsPath();
  if (!fs.existsSync(filePath)) {
    return { _schemaVersion: SECRET_SCHEMA_VERSION, secrets: {} };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SecretFile>;
    if (parsed._schemaVersion !== SECRET_SCHEMA_VERSION || !parsed.secrets) {
      return { _schemaVersion: SECRET_SCHEMA_VERSION, secrets: {} };
    }
    return { _schemaVersion: SECRET_SCHEMA_VERSION, secrets: parsed.secrets };
  } catch {
    return { _schemaVersion: SECRET_SCHEMA_VERSION, secrets: {} };
  }
}

function writeSecretFile(data: SecretFile): void {
  const filePath = getSecretsPath();
  fs.writeFileSync(filePath, JSON.stringify(data), { encoding: 'utf8' });
}

function encodeSecret(value: string): SecretEntry {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value).toString('base64');
    return { value: encrypted, encrypted: true, updatedAt: Date.now() };
  }

  // Fallback for environments without OS keychain integration.
  const encoded = Buffer.from(value, 'utf8').toString('base64');
  return { value: encoded, encrypted: false, updatedAt: Date.now() };
}

function decodeSecret(entry: SecretEntry): string | null {
  try {
    const buffer = Buffer.from(entry.value, 'base64');
    if (entry.encrypted) {
      return safeStorage.decryptString(buffer);
    }
    return buffer.toString('utf8');
  } catch {
    return null;
  }
}

function sanitizeSecretKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 200) return null;
  return trimmed;
}

export function registerSecretHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('secret:get', (_event, keyRaw: unknown) => {
    const key = sanitizeSecretKey(keyRaw);
    if (!key) return null;

    const store = readSecretFile();
    const entry = store.secrets[key];
    if (!entry) return null;
    return decodeSecret(entry);
  });

  ipcMain.handle('secret:set', (_event, keyRaw: unknown, valueRaw: unknown) => {
    const key = sanitizeSecretKey(keyRaw);
    const value = typeof valueRaw === 'string' ? valueRaw : null;
    if (!key || value === null) return false;

    const store = readSecretFile();
    store.secrets[key] = encodeSecret(value);
    writeSecretFile(store);
    return true;
  });

  ipcMain.handle('secret:delete', (_event, keyRaw: unknown) => {
    const key = sanitizeSecretKey(keyRaw);
    if (!key) return false;

    const store = readSecretFile();
    if (!store.secrets[key]) return true;
    delete store.secrets[key];
    writeSecretFile(store);
    return true;
  });

  ipcMain.handle('secret:list-keys', () => {
    const store = readSecretFile();
    return Object.keys(store.secrets);
  });
}
