export interface SecretStore {
  getSecret: (key: string) => Promise<string | null>;
  setSecret: (key: string, value: string) => Promise<boolean>;
  deleteSecret: (key: string) => Promise<boolean>;
  listKeys: () => Promise<string[]>;
}

const LOCAL_SECRET_PREFIX = 'codeye.secret.';

function getLocalStorageKey(key: string): string {
  return `${LOCAL_SECRET_PREFIX}${key}`;
}

const browserSecretStore: SecretStore = {
  async getSecret(key) {
    try {
      const value = window.localStorage.getItem(getLocalStorageKey(key));
      return value ? atob(value) : null;
    } catch {
      return null;
    }
  },
  async setSecret(key, value) {
    try {
      window.localStorage.setItem(getLocalStorageKey(key), btoa(value));
      return true;
    } catch {
      return false;
    }
  },
  async deleteSecret(key) {
    try {
      window.localStorage.removeItem(getLocalStorageKey(key));
      return true;
    } catch {
      return false;
    }
  },
  async listKeys() {
    const keys: string[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const rawKey = window.localStorage.key(i);
        if (!rawKey || !rawKey.startsWith(LOCAL_SECRET_PREFIX)) continue;
        keys.push(rawKey.slice(LOCAL_SECRET_PREFIX.length));
      }
    } catch {
      return [];
    }
    return keys;
  },
};

export function getSecretStore(): SecretStore {
  if (window.electronAPI?.secrets) {
    return {
      getSecret: (key: string) => window.electronAPI!.secrets.get(key),
      setSecret: (key: string, value: string) => window.electronAPI!.secrets.set(key, value),
      deleteSecret: (key: string) => window.electronAPI!.secrets.delete(key),
      listKeys: () => window.electronAPI!.secrets.listKeys(),
    };
  }

  return browserSecretStore;
}
