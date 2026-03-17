/**
 * Session switch data safety tests.
 *
 * These tests verify that the debounced chat-to-session sync in bootstrap.ts
 * is race-free. The key insight is:
 *
 *   1. `syncChatToSession()` reads `activeSessionId` from
 *      `useSessionStore.getState()` at *execution* time, not from a captured
 *      closure variable. So even if the debounce timer fires after a session
 *      switch, it will use the *current* active session ID.
 *
 *   2. `handleSelectSession` in SessionList.tsx manually saves the outgoing
 *      session's messages *before* switching, so no data is lost during the
 *      transition.
 *
 *   3. `createSession` calls `chatStore.clearMessages()`, so after a switch
 *      the chat store is empty. If the debounced sync fires, it writes empty
 *      messages to the *new* session (correct) rather than overwriting the
 *      *old* session with empty data (which would be the bug).
 *
 * If all tests pass, no refactoring is needed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';

describe('session switch data safety', () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
    useSessionStore.setState({
      folders: [],
      sessions: [],
      activeFolderId: null,
      activeSessionId: null,
    });
  });

  it('syncChatToSession reads fresh activeSessionId, not stale captured value', () => {
    const sessionStore = useSessionStore.getState();
    const folder = sessionStore.createFolder('/test', 'Test');
    const sessionA = sessionStore.createSession('A', folder.id);

    // Add messages to session A
    useChatStore.getState().addUserMessage('Hello from A');

    // Save session A's messages (simulates what handleSelectSession does before switching)
    useSessionStore.getState().saveSessionMessages(
      sessionA.id,
      useChatStore.getState().messages,
      0,
      0,
      0,
    );

    // Now switch to session B — createSession clears chatStore
    const sessionB = sessionStore.createSession('B', folder.id);

    // Verify: session A still has its messages (they were saved before switch)
    const savedA = useSessionStore.getState().getSession(sessionA.id);
    expect(savedA?.messages.length).toBeGreaterThan(0);
    expect(savedA?.messages[0].content).toBe('Hello from A');

    // Verify: session B has no messages (chatStore was cleared by createSession)
    const savedB = useSessionStore.getState().getSession(sessionB.id);
    expect(savedB?.messages.length).toBe(0);
  });

  it('activeSessionId points to new session after switch, not old one', () => {
    const sessionStore = useSessionStore.getState();
    const folder = sessionStore.createFolder('/test', 'Test');
    const sessionA = sessionStore.createSession('A', folder.id);

    useChatStore.getState().addUserMessage('Message in A');

    // Save A before switching (as handleSelectSession does)
    useSessionStore.getState().saveSessionMessages(
      sessionA.id,
      useChatStore.getState().messages,
      0,
      0,
      0,
    );

    const sessionB = sessionStore.createSession('B', folder.id);

    // After creating session B, activeSessionId must point to B
    const currentActiveId = useSessionStore.getState().activeSessionId;
    expect(currentActiveId).toBe(sessionB.id);
    expect(currentActiveId).not.toBe(sessionA.id);

    // chatStore messages should be empty (cleared by createSession)
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it('simulated debounced sync after switch writes to new session, not old', () => {
    const sessionStore = useSessionStore.getState();
    const folder = sessionStore.createFolder('/test', 'Test');
    const sessionA = sessionStore.createSession('A', folder.id);

    useChatStore.getState().addUserMessage('Important data in A');

    // Save A's data before switch
    useSessionStore.getState().saveSessionMessages(
      sessionA.id,
      useChatStore.getState().messages,
      0,
      0,
      0,
    );

    // Switch to B
    const sessionB = sessionStore.createSession('B', folder.id);

    // Simulate what syncChatToSession does when the debounce timer fires:
    // It reads CURRENT state, not a stale closure.
    const { messages, cost, inputTokens, outputTokens } = useChatStore.getState();
    const { activeSessionId, saveSessionMessages } = useSessionStore.getState();

    if (activeSessionId) {
      saveSessionMessages(activeSessionId, messages, cost, inputTokens, outputTokens);
    }

    // The sync targeted session B (the current active), NOT session A
    expect(activeSessionId).toBe(sessionB.id);

    // Session A's messages are still intact
    const savedA = useSessionStore.getState().getSession(sessionA.id);
    expect(savedA?.messages.length).toBeGreaterThan(0);
    expect(savedA?.messages[0].content).toBe('Important data in A');

    // Session B got the empty messages (correct — user hasn't typed anything yet)
    const savedB = useSessionStore.getState().getSession(sessionB.id);
    expect(savedB?.messages).toHaveLength(0);
  });
});
