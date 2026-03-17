import { useState, useRef, useCallback } from 'react';
import type { InputAttachment } from '../types';
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  fileToInputAttachment,
  takeAttachmentFilesFromClipboard,
} from '../services/attachments';

export interface AttachmentsState {
  attachments: InputAttachment[];
}

export interface AttachmentsActions {
  appendAttachments: (incoming: InputAttachment[]) => void;
  handlePaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => Promise<void>;
  removeAttachment: (attachmentId: string) => void;
  clearAttachments: () => void;
}

export function useAttachments(): AttachmentsState & AttachmentsActions {
  const [attachments, setAttachments] = useState<InputAttachment[]>([]);
  const pasteTokenRef = useRef(0);

  const appendAttachments = useCallback((incoming: InputAttachment[]) => {
    if (incoming.length === 0) return;
    setAttachments((prev) => {
      if (prev.length >= MAX_ATTACHMENTS_PER_MESSAGE) return prev;
      const room = MAX_ATTACHMENTS_PER_MESSAGE - prev.length;
      return [...prev, ...incoming.slice(0, room)];
    });
  }, []);

  const handlePaste = useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = takeAttachmentFilesFromClipboard(event.clipboardData);
    if (files.length === 0) return;

    event.preventDefault();

    const currentCount = attachments.length;
    if (currentCount >= MAX_ATTACHMENTS_PER_MESSAGE) return;

    const nextToken = pasteTokenRef.current + 1;
    pasteTokenRef.current = nextToken;
    const room = MAX_ATTACHMENTS_PER_MESSAGE - currentCount;
    const filesToConvert = files.slice(0, room);

    const converted = await Promise.allSettled(
      filesToConvert.map((file, index) => fileToInputAttachment(file, index))
    );

    if (pasteTokenRef.current !== nextToken) return;

    const results = converted.flatMap((result) => {
      if (result.status !== 'fulfilled' || !result.value) return [];
      return [result.value];
    });
    appendAttachments(results);
  }, [appendAttachments, attachments.length]);

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return { attachments, appendAttachments, handlePaste, removeAttachment, clearAttachments };
}
