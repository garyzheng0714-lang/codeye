import { useRef, useCallback } from 'react';

const MAX_HISTORY = 100;

export interface InputHistoryActions {
  saveToHistory: (text: string) => void;
  navigateUp: (currentInput: string) => string | null;
  navigateDown: () => string | null;
  isNavigating: () => boolean;
  resetNavigation: () => void;
}

export function useInputHistory(): InputHistoryActions {
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const draftRef = useRef('');

  const saveToHistory = useCallback((text: string) => {
    if (!text || historyRef.current[0] === text) return;
    historyRef.current.unshift(text);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.pop();
    historyIdxRef.current = -1;
    draftRef.current = '';
  }, []);

  const navigateUp = useCallback((currentInput: string): string | null => {
    if (historyRef.current.length === 0) return null;
    if (historyIdxRef.current === -1) draftRef.current = currentInput;
    const next = Math.min(historyIdxRef.current + 1, historyRef.current.length - 1);
    if (next === historyIdxRef.current) return null;
    historyIdxRef.current = next;
    return historyRef.current[next];
  }, []);

  const navigateDown = useCallback((): string | null => {
    if (historyIdxRef.current < 0) return null;
    const next = historyIdxRef.current - 1;
    historyIdxRef.current = next;
    return next < 0 ? draftRef.current : historyRef.current[next];
  }, []);

  const isNavigating = useCallback(() => historyIdxRef.current >= 0, []);

  const resetNavigation = useCallback(() => {
    historyIdxRef.current = -1;
    draftRef.current = '';
  }, []);

  return { saveToHistory, navigateUp, navigateDown, isNavigating, resetNavigation };
}
