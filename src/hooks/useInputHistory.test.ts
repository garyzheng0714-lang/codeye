import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useInputHistory } from './useInputHistory';

describe('useInputHistory', () => {
  it('saves to history and navigates up', () => {
    const { result } = renderHook(() => useInputHistory());

    act(() => { result.current.saveToHistory('hello'); });
    act(() => { result.current.saveToHistory('world'); });

    let entry: string | null = null;
    act(() => { entry = result.current.navigateUp(''); });
    expect(entry).toBe('world');

    act(() => { entry = result.current.navigateUp(''); });
    expect(entry).toBe('hello');
  });

  it('navigates down back to draft', () => {
    const { result } = renderHook(() => useInputHistory());

    act(() => { result.current.saveToHistory('first'); });
    act(() => { result.current.saveToHistory('second'); });

    // Navigate up twice
    act(() => { result.current.navigateUp('my draft'); });
    act(() => { result.current.navigateUp('my draft'); });

    // Navigate down to more recent entry
    let entry: string | null = null;
    act(() => { entry = result.current.navigateDown(); });
    expect(entry).toBe('second');

    // Navigate down to draft
    act(() => { entry = result.current.navigateDown(); });
    expect(entry).toBe('my draft');
  });

  it('returns null when navigating up with empty history', () => {
    const { result } = renderHook(() => useInputHistory());

    let entry: string | null = null;
    act(() => { entry = result.current.navigateUp(''); });
    expect(entry).toBeNull();
  });

  it('deduplicates consecutive identical entries', () => {
    const { result } = renderHook(() => useInputHistory());

    act(() => { result.current.saveToHistory('same'); });
    act(() => { result.current.saveToHistory('same'); });

    let first: string | null = null;
    let second: string | null = null;
    act(() => { first = result.current.navigateUp(''); });
    act(() => { second = result.current.navigateUp(''); });

    expect(first).toBe('same');
    expect(second).toBeNull(); // No second entry
  });

  it('resets navigation state', () => {
    const { result } = renderHook(() => useInputHistory());

    act(() => { result.current.saveToHistory('test'); });
    act(() => { result.current.navigateUp(''); });
    expect(result.current.isNavigating()).toBe(true);

    act(() => { result.current.resetNavigation(); });
    expect(result.current.isNavigating()).toBe(false);
  });

  it('ignores empty strings', () => {
    const { result } = renderHook(() => useInputHistory());

    act(() => { result.current.saveToHistory(''); });

    let entry: string | null = null;
    act(() => { entry = result.current.navigateUp(''); });
    expect(entry).toBeNull();
  });
});
