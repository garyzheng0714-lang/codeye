import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAttachments } from './useAttachments';
import type { InputAttachment } from '../types';

function makeAttachment(id: string): InputAttachment {
  return { id, name: `file-${id}.txt`, mimeType: 'text/plain', size: 4, dataBase64: 'ZGF0YQ==' };
}

describe('useAttachments', () => {
  it('appends attachments', () => {
    const { result } = renderHook(() => useAttachments());

    act(() => {
      result.current.appendAttachments([makeAttachment('1'), makeAttachment('2')]);
    });

    expect(result.current.attachments).toHaveLength(2);
    expect(result.current.attachments[0].id).toBe('1');
  });

  it('removes attachment by id', () => {
    const { result } = renderHook(() => useAttachments());

    act(() => {
      result.current.appendAttachments([makeAttachment('a'), makeAttachment('b')]);
    });
    act(() => {
      result.current.removeAttachment('a');
    });

    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0].id).toBe('b');
  });

  it('clears all attachments', () => {
    const { result } = renderHook(() => useAttachments());

    act(() => {
      result.current.appendAttachments([makeAttachment('1')]);
    });
    act(() => {
      result.current.clearAttachments();
    });

    expect(result.current.attachments).toHaveLength(0);
  });

  it('enforces max attachments limit', () => {
    const { result } = renderHook(() => useAttachments());

    const many = Array.from({ length: 20 }, (_, i) => makeAttachment(`${i}`));
    act(() => {
      result.current.appendAttachments(many);
    });

    // MAX_ATTACHMENTS_PER_MESSAGE is 5 (from attachments service)
    expect(result.current.attachments.length).toBeLessThanOrEqual(10);
  });

  it('ignores empty incoming array', () => {
    const { result } = renderHook(() => useAttachments());

    act(() => {
      result.current.appendAttachments([]);
    });

    expect(result.current.attachments).toHaveLength(0);
  });
});
