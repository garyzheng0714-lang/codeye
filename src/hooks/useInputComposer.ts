import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import { sendClaudeQuery, stopClaude } from './useClaudeChat';
import { saveCurrentSession } from '../utils/session';
import { filterCommands, getSlashCommandByName, type SlashCommand } from '../data/slashCommands';
import type { ModelId, EffortLevel, InputAttachment, PendingMessage } from '../types';
import { startStreamTrace } from '../observability/perfBaseline';
import { parseContextReferences, CONTEXT_SUGGESTIONS } from '../services/contextReferences';
import { useInputHistory } from './useInputHistory';
import { useAttachments } from './useAttachments';
import { useBranchAutoRename } from './useBranchAutoRename';

const OPEN_SLASH_EVENT = 'codeye:open-slash-command';
const CMD_PALETTE_SELECT_EVENT = 'codeye:cmd-palette-select';
const MAX_INPUT_HEIGHT = 200;
const COMPACT_INPUT_HEIGHT = 26;
const SLASH_SELECTION_GUARD_MS = 200;
const ATTACHMENTS_ONLY_PROMPT = 'Please inspect the attached files and summarize the key points.';

function normalizePendingMessage(payload: PendingMessage): PendingMessage {
  const prompt = payload.prompt.trim() || ATTACHMENTS_ONLY_PROMPT;
  return { prompt, attachments: payload.attachments };
}

function buildUserMessageDisplay(prompt: string, attachments: InputAttachment[]): string {
  if (attachments.length === 0) return prompt;
  const listed = attachments.map((item) => item.name).join(', ');
  return `${prompt}\n\n[Attachments: ${listed}]`;
}

export function useInputComposer() {
  // --- Core input state ---
  const [input, setInput] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [showContextSuggestions, setShowContextSuggestions] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const suppressSendUntilRef = useRef(0);

  // --- Sub-hooks ---
  const history = useInputHistory();
  const { attachments, appendAttachments, handlePaste, removeAttachment, clearAttachments } = useAttachments();
  useBranchAutoRename();

  // --- Store selectors ---
  const isStreaming = useChatStore((s) => s.isStreaming);
  const mode = useChatStore((s) => s.mode);
  const pendingMessages = useChatStore((s) => s.pendingMessages);
  const pendingCount = useChatStore((s) => s.pendingMessages.length);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const startAssistantMessage = useChatStore((s) => s.startAssistantMessage);
  const enqueueMessage = useChatStore((s) => s.enqueueMessage);
  const removeQueuedMessage = useChatStore((s) => s.removeQueuedMessage);
  const clearQueue = useChatStore((s) => s.clearQueue);
  const setMode = useChatStore((s) => s.setMode);
  const setModel = useChatStore((s) => s.setModel);
  const setEffort = useChatStore((s) => s.setEffort);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);

  const contextRefs = useMemo(() => parseContextReferences(input), [input]);
  const paletteHasMatches = useMemo(() => filterCommands(slashQuery).length > 0, [slashQuery]);

  // --- Textarea helpers ---
  const setCompactTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${COMPACT_INPUT_HEIGHT}px`;
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (isStreaming) { setCompactTextareaHeight(); return; }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [isStreaming, setCompactTextareaHeight]);

  const resetTextareaHeight = useCallback(() => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      if (isStreaming) { setCompactTextareaHeight(); return; }
      el.style.height = 'auto';
    });
  }, [isStreaming, setCompactTextareaHeight]);

  /** Clears transient input state (input text, palette, context suggestions). */
  const resetInputState = useCallback(() => {
    setInput('');
    setShowPalette(false);
    setShowContextSuggestions(false);
    history.resetNavigation();
  }, [history]);

  // --- Slash command routing ---
  const markSlashSelection = useCallback(() => {
    suppressSendUntilRef.current = performance.now() + SLASH_SELECTION_GUARD_MS;
  }, []);

  const handleCommandSelect = useCallback((command: SlashCommand, commandArgs = '') => {
    markSlashSelection();
    setShowPalette(false);

    if (command.category === 'mode') {
      setMode(command.name as 'chat' | 'code' | 'plan');
      resetInputState();
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }
    if (command.category === 'model') {
      const modelMap: Record<string, ModelId> = { opus: 'opus', sonnet: 'sonnet', haiku: 'haiku' };
      if (modelMap[command.name]) setModel(modelMap[command.name]);
      resetInputState();
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }
    if (command.category === 'effort') {
      const effortMap: Record<string, EffortLevel> = {
        'think-low': 'low', 'think-med': 'medium', 'think-high': 'high',
      };
      if (effortMap[command.name]) setEffort(effortMap[command.name]);
      resetInputState();
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }
    if (command.category === 'action') {
      if (command.name === 'clear') {
        clearMessages();
        resetInputState();
        resizeTextarea();
        return;
      }
      if (command.name === 'new') {
        saveCurrentSession();
        clearMessages();
        createSession();
        resetInputState();
        resizeTextarea();
        return;
      }
      const nextInput = commandArgs.trim()
        ? `/${command.name} ${commandArgs.trim()}`
        : `/${command.name} `;
      setInput(nextInput);
      setShowContextSuggestions(false);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.selectionStart = el.selectionEnd = nextInput.length;
        resizeTextarea();
      });
      return;
    }

    // Skills: insert as pill
    setActiveSkill(command.name);
    setInput(commandArgs.trim() ? commandArgs.trim() : '');
    setShowContextSuggestions(false);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
      resizeTextarea();
    });
  }, [clearMessages, createSession, markSlashSelection, resetInputState, resizeTextarea, setEffort, setMode, setModel]);

  // --- Dispatch ---
  const dispatchPrompt = useCallback((message: PendingMessage) => {
    const normalizedMessage = normalizePendingMessage(message);
    const prompt = normalizedMessage.prompt;
    const dispatchStart = performance.now();

    if (!activeSessionId) {
      const preview = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
      createSession(preview);
    }

    addUserMessage(buildUserMessageDisplay(prompt, normalizedMessage.attachments));
    startAssistantMessage();
    setInput('');
    setActiveSkill(null);
    clearAttachments();
    setShowPalette(false);
    setShowContextSuggestions(false);
    resetTextareaHeight();

    const state = useChatStore.getState();
    startStreamTrace({
      mode,
      model: state.model,
      transport: window.electronAPI ? 'electron' : 'ws',
      inputDispatchMs: Number((performance.now() - dispatchStart).toFixed(2)),
    });
    sendClaudeQuery({
      prompt,
      mode,
      model: state.model,
      effort: state.effort,
      cwd: state.cwd || undefined,
      sessionId: state.claudeSessionId || undefined,
      attachments: normalizedMessage.attachments,
    });
  }, [activeSessionId, addUserMessage, clearAttachments, createSession, mode, resetTextareaHeight, startAssistantMessage]);

  const executeSlashInput = useCallback((rawInput: string): boolean => {
    const match = rawInput.trim().match(/^\/([^\s]+)(?:\s+(.*))?$/);
    if (!match) return false;
    const [, commandName, commandArgs = ''] = match;
    const command = getSlashCommandByName(commandName);
    if (!command) return false;
    if (command.category === 'skill') {
      dispatchPrompt({ prompt: rawInput.trim(), attachments: [] });
      return true;
    }
    handleCommandSelect(command, commandArgs);
    return true;
  }, [dispatchPrompt, handleCommandSelect]);

  // --- Send ---
  const handleSend = useCallback(() => {
    if (performance.now() < suppressSendUntilRef.current) return;

    const text = input.trim();
    const currentAttachments = attachments;

    let prompt: string | null = null;
    if (activeSkill) {
      prompt = text ? `/${activeSkill} ${text}` : `/${activeSkill}`;
      setActiveSkill(null);
    } else if (text) {
      if (text.startsWith('/') && currentAttachments.length === 0 && !isStreaming && executeSlashInput(text)) {
        return;
      }
      prompt = text;
    } else if (currentAttachments.length > 0) {
      prompt = ATTACHMENTS_ONLY_PROMPT;
    }

    if (!prompt) return;
    const outboundMessage: PendingMessage = normalizePendingMessage({
      prompt,
      attachments: currentAttachments,
    });

    history.saveToHistory(prompt);

    if (isStreaming) {
      enqueueMessage(outboundMessage);
      setInput('');
      clearAttachments();
      setShowPalette(false);
      setShowContextSuggestions(false);
      resetTextareaHeight();
    } else {
      dispatchPrompt(outboundMessage);
    }
  }, [activeSkill, attachments, clearAttachments, dispatchPrompt, enqueueMessage, executeSlashInput, history, input, isStreaming, resetTextareaHeight]);

  // --- Queue drain ---
  useEffect(() => {
    if (isStreaming || pendingCount === 0) return;
    const next = useChatStore.getState().dequeueMessage();
    if (next) {
      const timer = setTimeout(() => dispatchPrompt(next), 100);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, pendingCount, dispatchPrompt]);

  // --- Textarea streaming resize ---
  useEffect(() => {
    if (isStreaming) { setCompactTextareaHeight(); return; }
    resizeTextarea();
  }, [isStreaming, resizeTextarea, setCompactTextareaHeight]);

  // --- Global event listeners ---
  useEffect(() => {
    const handleOpenSlashCommand = () => {
      setInput('/');
      setSlashQuery('');
      setShowPalette(true);
      setShowContextSuggestions(false);
      history.resetNavigation();
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.selectionStart = el.selectionEnd = 1;
        resizeTextarea();
      });
    };
    window.addEventListener(OPEN_SLASH_EVENT, handleOpenSlashCommand);
    return () => window.removeEventListener(OPEN_SLASH_EVENT, handleOpenSlashCommand);
  }, [history, resizeTextarea]);

  useEffect(() => {
    const handleCmdPaletteSelect = (e: Event) => {
      const name = (e as CustomEvent<{ name: string }>).detail?.name;
      if (!name) return;
      const command = getSlashCommandByName(name);
      if (!command) return;
      handleCommandSelect(command);
    };
    window.addEventListener(CMD_PALETTE_SELECT_EVENT, handleCmdPaletteSelect);
    return () => window.removeEventListener(CMD_PALETTE_SELECT_EVENT, handleCmdPaletteSelect);
  }, [handleCommandSelect]);

  // --- Event handlers ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Slash palette navigation
    if (showPalette && e.key === 'Escape') {
      e.preventDefault();
      setShowPalette(false);
      return;
    }
    if (showPalette && paletteHasMatches && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)) {
      e.preventDefault();
      return;
    }

    // Send
    const isComposing = composingRef.current || e.nativeEvent.isComposing;
    if (e.key === 'Enter' && !isComposing && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Escape cascade
    if (e.key === 'Escape') {
      e.preventDefault();
      if (activeSkill) { setActiveSkill(null); return; }
      if (attachments.length > 0 && !input) { clearAttachments(); return; }
      if (isStreaming) { stopClaude(); }
      else if (input) { resetInputState(); resizeTextarea(); }
      return;
    }

    // Stop streaming
    if (e.ctrlKey && e.key === 'c' && isStreaming) {
      e.preventDefault();
      stopClaude();
      return;
    }

    // History navigation (ArrowUp)
    if (e.key === 'ArrowUp' && !e.shiftKey && !showPalette) {
      const atTop = (textareaRef.current?.selectionStart ?? 0) === 0;
      if (atTop && (input === '' || history.isNavigating())) {
        e.preventDefault();
        const entry = history.navigateUp(input);
        if (entry !== null) {
          setInput(entry);
          requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (el) { el.selectionStart = el.selectionEnd = el.value.length; }
          });
        }
        return;
      }
    }

    // History navigation (ArrowDown)
    if (e.key === 'ArrowDown' && !e.shiftKey && history.isNavigating() && !showPalette) {
      const el = textareaRef.current;
      const atBottom = (el?.selectionStart ?? 0) >= (el?.value.length ?? 0);
      if (atBottom) {
        e.preventDefault();
        const entry = history.navigateDown();
        if (entry !== null) {
          setInput(entry);
          requestAnimationFrame(() => {
            const node = textareaRef.current;
            if (!node) return;
            node.selectionStart = node.selectionEnd = node.value.length;
            resizeTextarea();
          });
        }
        return;
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    if (history.isNavigating()) history.resetNavigation();

    if (value.startsWith('/')) {
      setSlashQuery(value.slice(1));
      setShowPalette(true);
      setShowContextSuggestions(false);
    } else {
      setShowPalette(false);
      setSlashQuery('');
    }

    const cursorPos = e.target.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const hashMatch = beforeCursor.match(/#(\w*)$/);
    setShowContextSuggestions(!!hashMatch && !value.startsWith('/'));
    resizeTextarea();
  };

  const handleContextSelect = (suggestion: typeof CONTEXT_SUGGESTIONS[number]) => {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursorPos);
    const afterCursor = input.slice(cursorPos);
    const hashIdx = beforeCursor.lastIndexOf('#');
    const newInput = beforeCursor.slice(0, hashIdx) + suggestion.trigger + ' ' + afterCursor;
    setInput(newInput);
    setShowContextSuggestions(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    });
  };

  const editQueuedMessage = useCallback((index: number) => {
    const picked = removeQueuedMessage(index);
    if (!picked) return;
    setInput(picked.prompt === ATTACHMENTS_ONLY_PROMPT ? '' : picked.prompt);
    setShowPalette(false);
    setShowContextSuggestions(false);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
      resizeTextarea();
    });
  }, [removeQueuedMessage, resizeTextarea]);

  const removeQueuedMessageAt = useCallback((index: number) => {
    removeQueuedMessage(index);
  }, [removeQueuedMessage]);

  const placeholders = {
    chat: 'Ask a question...   Enter to send · / for commands',
    code: 'Describe what to build...   Enter to send · / for commands',
    plan: 'Describe what to plan...   Enter to send · / for commands',
  } as const;

  const canSend = input.trim().length > 0 || !!activeSkill || attachments.length > 0;

  return {
    input,
    mode,
    isStreaming,
    activeSkill,
    attachments,
    pendingMessages,
    pendingCount,
    canSend,
    showPalette,
    showContextSuggestions,
    slashQuery,
    contextRefs,
    textareaRef,
    composingRef,
    placeholders,
    handleKeyDown,
    handleInput,
    handlePaste,
    handleSend,
    handleCommandSelect,
    handleContextSelect,
    removeAttachment,
    clearAttachments,
    editQueuedMessage,
    removeQueuedMessageAt,
    closeQueue: clearQueue,
    clearActiveSkill: useCallback(() => setActiveSkill(null), []),
    setShowPalette,
    CONTEXT_SUGGESTIONS,
  };
}
