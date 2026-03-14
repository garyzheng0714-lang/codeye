import { create } from 'zustand';
import type { ChatMode, DisplayMessage, ToolCallDisplay, ModelId, EffortLevel } from '../types';
import {
  DEFAULT_MODEL,
  DEFAULT_EFFORT,
  getEffectiveEffort,
  normalizeEffortLevel,
  normalizeModelId,
} from '../data/models';

interface ChatState {
  messages: DisplayMessage[];
  isStreaming: boolean;
  mode: ChatMode;
  model: ModelId;
  effort: EffortLevel;
  cwd: string;
  sessionId: string | null;
  claudeSessionId: string | null;
  cost: number;
  inputTokens: number;
  outputTokens: number;

  setMode: (mode: ChatMode) => void;
  setModel: (model: ModelId) => void;
  setEffort: (effort: EffortLevel) => void;
  setCwd: (cwd: string) => void;
  setSessionId: (id: string | null) => void;
  setClaudeSessionId: (id: string | null) => void;
  addUserMessage: (content: string) => void;
  appendAssistantContent: (content: string) => void;
  startAssistantMessage: () => void;
  finishStreaming: () => void;
  addToolCall: (tool: ToolCallDisplay) => void;
  toggleToolExpand: (messageId: string, toolId: string) => void;
  updateCost: (cost: number, input: number, output: number) => void;
  clearMessages: () => void;
  loadSession: (data: { messages: DisplayMessage[]; cost: number; inputTokens: number; outputTokens: number; claudeSessionId?: string | null; model?: ModelId }) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  mode: 'code',
  model: DEFAULT_MODEL,
  effort: DEFAULT_EFFORT,
  cwd: '',
  sessionId: null,
  claudeSessionId: null,
  cost: 0,
  inputTokens: 0,
  outputTokens: 0,

  setMode: (mode) => set({ mode }),
  setModel: (model) => set({ model: normalizeModelId(model) }),
  setEffort: (effort) =>
    set((state) => {
      const normalized = getEffectiveEffort(state.model, effort);
      if (!normalized) return {};
      return { effort: normalizeEffortLevel(normalized) };
    }),
  setCwd: (cwd) => set({ cwd }),
  setSessionId: (sessionId) => set({ sessionId }),
  setClaudeSessionId: (claudeSessionId) => set({ claudeSessionId }),

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          toolCalls: [],
          timestamp: Date.now(),
        },
      ],
    })),

  startAssistantMessage: () =>
    set((state) => ({
      isStreaming: true,
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          toolCalls: [],
          timestamp: Date.now(),
          isStreaming: true,
        },
      ],
    })),

  appendAssistantContent: (content) =>
    set((state) => {
      if (!state.isStreaming) return state;
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      } else {
        msgs.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          toolCalls: [],
          timestamp: Date.now(),
          isStreaming: true,
        });
      }
      return { messages: msgs };
    }),

  finishStreaming: () =>
    set((state) => {
      const msgs = state.messages.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m
      );
      return { messages: msgs, isStreaming: false };
    }),

  addToolCall: (tool) =>
    set((state) => {
      if (!state.isStreaming) return state;
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = {
          ...last,
          toolCalls: [...last.toolCalls, tool],
        };
      } else {
        msgs.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          toolCalls: [tool],
          timestamp: Date.now(),
          isStreaming: true,
        });
      }
      return { messages: msgs };
    }),

  toggleToolExpand: (messageId, toolId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              toolCalls: m.toolCalls.map((t) =>
                t.id === toolId ? { ...t, expanded: !t.expanded } : t
              ),
            }
          : m
      ),
    })),

  updateCost: (cost, input, output) =>
    set((state) => ({
      cost: state.cost + cost,
      inputTokens: state.inputTokens + input,
      outputTokens: state.outputTokens + output,
    })),

  clearMessages: () => set({ messages: [], cost: 0, inputTokens: 0, outputTokens: 0, isStreaming: false, claudeSessionId: null }),

  loadSession: (data) =>
    set({
      messages: data.messages,
      cost: data.cost,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      claudeSessionId: data.claudeSessionId ?? null,
      model: normalizeModelId(data.model),
      isStreaming: false,
    }),
}));
