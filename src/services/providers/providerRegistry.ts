import type { AIProvider } from './types';
import { ClaudeProvider } from './claudeProvider';

const providers = new Map<string, AIProvider>();

export function registerProvider(provider: AIProvider): void {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): AIProvider | undefined {
  return providers.get(id);
}

export function getDefaultProvider(): AIProvider {
  return providers.get('claude')!;
}

export function listProviders(): AIProvider[] {
  return Array.from(providers.values());
}

registerProvider(new ClaudeProvider());
