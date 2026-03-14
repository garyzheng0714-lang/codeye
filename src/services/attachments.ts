import type { InputAttachment } from '../types';

export const MAX_ATTACHMENTS_PER_MESSAGE = 8;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read attachment'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read attachment'));
    reader.readAsDataURL(file);
  });
}

function inferClipboardFileName(file: File, index: number): string {
  if (file.name?.trim()) return file.name.trim();
  const ext = file.type.includes('/') ? file.type.split('/')[1] : 'bin';
  return `clipboard-${Date.now()}-${index + 1}.${ext}`;
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export async function fileToInputAttachment(file: File, index = 0): Promise<InputAttachment | null> {
  if (!file || file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) return null;
  const dataUrl = await readFileAsDataUrl(file);
  const [, dataBase64 = ''] = dataUrl.split(',', 2);
  if (!dataBase64) return null;

  return {
    id: crypto.randomUUID(),
    name: inferClipboardFileName(file, index),
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    dataBase64,
  };
}

export function takeAttachmentFilesFromClipboard(dataTransfer: DataTransfer | null | undefined): File[] {
  const items = Array.from(dataTransfer?.items ?? []);
  const files: File[] = [];

  for (const item of items) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }

  return files;
}
