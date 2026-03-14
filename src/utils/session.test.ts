import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import { saveCurrentSession } from './session';

function resetStores() {
  useChatStore.setState({
    messages: [],
    isStreaming: false,
    mode: 'code',
    model: 'sonnet',
    effort: 'high',
    cwd: '',
    sessionId: null,
    claudeSessionId: null,
    cost: 0,
    inputTokens: 0,
    outputTokens: 0,
  });

  useSessionStore.setState({
    folders: [],
    sessions: [],
    activeFolderId: null,
    activeSessionId: null,
  });
}

describe('saveCurrentSession', () => {
  beforeEach(() => {
    resetStores();
  });

  it('persists active session even when messages are empty', () => {
    const saveSessionMessages = vi.fn();
    useSessionStore.setState({
      activeSessionId: 'session-1',
      saveSessionMessages: saveSessionMessages as never,
    });

    saveCurrentSession();

    expect(saveSessionMessages).toHaveBeenCalledWith(
      'session-1',
      [],
      0,
      0,
      0,
      {
        model: 'sonnet',
        claudeSessionId: null,
        cwd: '',
      }
    );
  });
});
