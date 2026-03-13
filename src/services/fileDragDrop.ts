import { EventEmitter } from '../utils/eventEmitter';

export interface DroppedFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

const dropEmitter = new EventEmitter<(files: DroppedFile[]) => void>();

export function onFileDrop(handler: (files: DroppedFile[]) => void): () => void {
  return dropEmitter.on(handler);
}

export function setupDragDropHandlers(): () => void {
  const preventDefaults = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent) => {
    preventDefaults(e);
    document.body.classList.add('drag-over');
  };

  const handleDragLeave = (e: DragEvent) => {
    preventDefaults(e);
    if (e.relatedTarget === null || !document.body.contains(e.relatedTarget as Node)) {
      document.body.classList.remove('drag-over');
    }
  };

  const handleDrop = (e: DragEvent) => {
    preventDefaults(e);
    document.body.classList.remove('drag-over');

    const fileList = e.dataTransfer?.files;
    if (!fileList || fileList.length === 0) return;

    const files: DroppedFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      files.push({
        name: file.name,
        path: (file as File & { path?: string }).path ?? file.name,
        size: file.size,
        type: file.type || guessType(file.name),
      });
    }

    dropEmitter.emit(files);
  };

  document.addEventListener('dragenter', handleDragEnter);
  document.addEventListener('dragover', preventDefaults);
  document.addEventListener('dragleave', handleDragLeave);
  document.addEventListener('drop', handleDrop);

  return () => {
    document.removeEventListener('dragenter', handleDragEnter);
    document.removeEventListener('dragover', preventDefaults);
    document.removeEventListener('dragleave', handleDragLeave);
    document.removeEventListener('drop', handleDrop);
  };
}

function guessType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const typeMap: Record<string, string> = {
    ts: 'text/typescript',
    tsx: 'text/typescript',
    js: 'text/javascript',
    jsx: 'text/javascript',
    json: 'application/json',
    md: 'text/markdown',
    py: 'text/x-python',
    rs: 'text/x-rust',
    go: 'text/x-go',
    css: 'text/css',
    html: 'text/html',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    toml: 'text/x-toml',
    txt: 'text/plain',
  };
  return typeMap[ext] ?? 'application/octet-stream';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
