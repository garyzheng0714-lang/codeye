import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSessionStore } from '../stores/sessionStore';
import { sendClaudeQuery, stopClaude } from './useClaudeChat';
import { saveCurrentSession } from '../utils/session';
import { filterCommands, getSlashCommandByName, type SlashCommand } from '../data/slashCommands';
import type { ModelId, EffortLevel } from '../types';
import { startStreamTrace } from '../observability/perfBaseline';
import { parseContextReferences, CONTEXT_SUGGESTIONS } from '../services/contextReferences';

const OPEN_SLASH_EVENT = 'codeye:open-slash-command';
const MAX_INPUT_HEIGHT = 200;
const COMPACT_INPUT_HEIGHT = 26;
const SLASH_SELECTION_GUARD_MS = 200;

export function useInputComposer() {
  const [input, setInput] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [showContextSuggestions, setShowContextSuggestions] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const draftRef = useRef('');
  const suppressSendUntilRef = useRef(0);

  const isStreaming = useChatStore((s) => s.isStreaming);
  const mode = useChatStore((s) => s.mode);
  const pendingCount = useChatStore((s) => s.pendingMessages.length);
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const startAssistantMessage = useChatStore((s) => s.startAssistantMessage);
  const enqueueMessage = useChatStore((s) => s.enqueueMessage);
  const setMode = useChatStore((s) => s.setMode);
  const setModel = useChatStore((s) => s.setModel);
  const setEffort = useChatStore((s) => s.setEffort);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const createSession = useSessionStore((s) => s.createSession);

  const contextRefs = useMemo(() => parseContextReferences(input), [input]);
  const paletteHasMatches = useMemo(() => filterCommands(slashQuery).length > 0, [slashQuery]);

  const setCompactTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${COMPACT_INPUT_HEIGHT}px`;
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (isStreaming) {
      setCompactTextareaHeight();
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [isStreaming, setCompactTextareaHeight]);

  const resetTextareaHeight = useCallback(() => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      if (isStreaming) {
        setCompactTextareaHeight();
        return;
      }
      el.style.height = 'auto';
    });
  }, [isStreaming, setCompactTextareaHeight]);

  const markSlashSelection = useCallback(() => {
    suppressSendUntilRef.current = performance.now() + SLASH_SELECTION_GUARD_MS;
  }, []);

  const dispatchPrompt = useCallback((prompt: string) => {
    const dispatchStart = performance.now();

    if (!activeSessionId) {
      const preview = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
      createSession(preview);
    }

    addUserMessage(prompt);
    startAssistantMessage();
    setInput('');
    setActiveSkill(null);
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
    });
  }, [activeSessionId, addUserMessage, createSession, mode, resetTextareaHeight, startAssistantMessage]);

  const handleCommandSelect = useCallback((command: SlashCommand, commandArgs = '') => {
    markSlashSelection();
    setShowPalette(false);

    if (command.category === 'mode') {
      setMode(command.name as 'chat' | 'code' | 'plan');
      setInput('');
      setShowContextSuggestions(false);
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'model') {
      const modelMap: Record<string, ModelId> = { opus: 'opus', sonnet: 'sonnet', haiku: 'haiku' };
      if (modelMap[command.name]) setModel(modelMap[command.name]);
      setInput('');
      setShowContextSuggestions(false);
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'effort') {
      const effortMap: Record<string, EffortLevel> = {
        'think-low': 'low', 'think-med': 'medium', 'think-high': 'high',
      };
      if (effortMap[command.name]) setEffort(effortMap[command.name]);
      setInput('');
      setShowContextSuggestions(false);
      resizeTextarea();
      textareaRef.current?.focus();
      return;
    }

    if (command.category === 'action') {
      if (command.name === 'clear') {
        clearMessages();
        setInput('');
        setShowContextSuggestions(false);
        resizeTextarea();
        historyIdxRef.current = -1;
        draftRef.current = '';
        return;
      }
      if (command.name === 'new') {
        saveCurrentSession();
        clearMessages();
        createSession();
        setInput('');
        setShowContextSuggestions(false);
        resizeTextarea();
        historyIdxRef.current = -1;
        draftRef.current = '';
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

    // Skills: insert as pill, don't send immediately
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
  }, [clearMessages, createSession, markSlashSelection, resizeTextarea, setEffort, setMode, setModel]);

  const executeSlashInput = useCallback((rawInput: string): boolean => {
    const match = rawInput.trim().match(/^\/([^\s]+)(?:\s+(.*))?$/);
    if (!match) return false;

    const [, commandName, commandArgs = ''] = match;
    const command = getSlashCommandByName(commandName);
    if (!command) return false;

    if (command.category === 'skill') {
      dispatchPrompt(rawInput.trim());
      return true;
    }

    handleCommandSelect(command, commandArgs);
    return true;
  }, [dispatchPrompt, handleCommandSelect]);

  const clearActiveSkill = useCallback(() => {
    setActiveSkill(null);
  }, []);

  const handleSend = useCallback(() => {
    if (performance.now() < suppressSendUntilRef.current) {
      return;
    }

    const text = input.trim();

    // Compose prompt from activeSkill + input
    let prompt: string | null = null;
    if (activeSkill) {
      prompt = text ? `/${activeSkill} ${text}` : `/${activeSkill}`;
      setActiveSkill(null);
    } else if (text) {
      // Non-skill slash commands are handled inline (mode/model/effort/action)
      if (text.startsWith('/') && !isStreaming && executeSlashInput(text)) {
        return;
      }
      prompt = text;
    }

    if (!prompt) return;

    // Save to history
    if (historyRef.current[0] !== prompt) {
      historyRef.current.unshift(prompt);
      if (historyRef.current.length > 100) historyRef.current.pop();
    }
    historyIdxRef.current = -1;
    draftRef.current = '';

    // Queue if streaming, dispatch if idle
    if (isStreaming) {
      enqueueMessage(prompt);
      setInput('');
      setShowPalette(false);
      setShowContextSuggestions(false);
      resetTextareaHeight();
    } else {
      dispatchPrompt(prompt);
    }
  }, [activeSkill, dispatchPrompt, enqueueMessage, executeSlashInput, input, isStreaming, resetTextareaHeight]);

  // Queue drain: when streaming finishes and there are pending messages, dispatch next
  useEffect(() => {
    if (isStreaming || pendingCount === 0) return;
    const next = useChatStore.getState().dequeueMessage();
    if (next) {
      // Small delay to let UI settle before next dispatch
      const timer = setTimeout(() => dispatchPrompt(next), 100);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, pendingCount, dispatchPrompt]);

  useEffect(() => {
    if (isStreaming) {
      setCompactTextareaHeight();
      return;
    }
    resizeTextarea();
  }, [isStreaming, resizeTextarea, setCompactTextareaHeight]);

  useEffect(() => {
    const handleOpenSlashCommand = () => {
      setInput('/');
      setSlashQuery('');
      setShowPalette(true);
      setShowContextSuggestions(false);
      historyIdxRef.current = -1;
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
  }, [resizeTextarea]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showPalette && e.key === 'Escape') {
      e.preventDefault();
      setShowPalette(false);
      return;
    }

    if (showPalette && paletteHasMatches) {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }

    const isComposing = composingRef.current || e.nativeEvent.isComposing;
    if (e.key === 'Enter' && !isComposing && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (activeSkill) {
        setActiveSkill(null);
        return;
      }
      if (isStreaming) {
        stopClaude();
      } else if (input) {
        setInput('');
        setShowPalette(false);
        setShowContextSuggestions(false);
        historyIdxRef.current = -1;
        draftRef.current = '';
        resizeTextarea();
      }
      return;
    }

    if (e.ctrlKey && e.key === 'c' && isStreaming) {
      e.preventDefault();
      stopClaude();
      return;
    }

    if (e.key === 'ArrowUp' && !e.shiftKey && !showPalette) {
      const atTop = (textareaRef.current?.selectionStart ?? 0) === 0;
      if (atTop && (input === '' || historyIdxRef.current >= 0)) {
        e.preventDefault();
        if (historyIdxRef.current === -1) draftRef.current = input;
        const next = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1);
        if (next >= 0 && next < historyRef.current.length) {
          historyIdxRef.current = next;
          setInput(historyRef.current[next]);
          requestAnimationFrame(() => {
            const el = textareaRef.current;
            if (el) { el.selectionStart = el.selectionEnd = el.value.length; }
          });
        }
        return;
      }
    }

    if (e.key === 'ArrowDown' && !e.shiftKey && historyIdxRef.current >= 0 && !showPalette) {
      const el = textareaRef.current;
      const atBottom = (el?.selectionStart ?? 0) >= (el?.value.length ?? 0);
      if (atBottom) {
        e.preventDefault();
        const next = historyIdxRef.current - 1;
        historyIdxRef.current = next;
        setInput(next < 0 ? draftRef.current : historyRef.current[next]);
        requestAnimationFrame(() => {
          const node = textareaRef.current;
          if (!node) return;
          node.selectionStart = node.selectionEnd = node.value.length;
          resizeTextarea();
        });
        return;
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    if (historyIdxRef.current >= 0) {
      historyIdxRef.current = -1;
    }

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

  const placeholders = {
    chat: 'Ask a question...   Enter to send · / for commands',
    code: 'Describe what to build...   Enter to send · / for commands',
    plan: 'Describe what to plan...   Enter to send · / for commands',
  } as const;

  return {
    input,
    mode,
    isStreaming,
    activeSkill,
    pendingCount,
    showPalette,
    showContextSuggestions,
    slashQuery,
    contextRefs,
    textareaRef,
    composingRef,
    placeholders,
    handleKeyDown,
    handleInput,
    handleSend,
    handleCommandSelect,
    handleContextSelect,
    clearActiveSkill,
    setShowPalette,
    CONTEXT_SUGGESTIONS,
  };
}
