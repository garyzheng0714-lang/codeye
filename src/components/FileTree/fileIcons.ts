import type { ComponentType } from 'react';
import {
  File,
  FileCode,
  FileText,
  FileJson,
  Image,
  Palette,
  Globe,
  Shield,
  Settings,
  Folder,
  FolderOpen,
} from 'lucide-react';

const EXT_MAP: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  mjs: FileCode,
  cjs: FileCode,
  py: FileCode,
  rs: FileCode,
  go: FileCode,
  rb: FileCode,
  java: FileCode,
  json: FileJson,
  md: FileText,
  mdx: FileText,
  txt: FileText,
  css: Palette,
  scss: Palette,
  less: Palette,
  html: Globe,
  htm: Globe,
  svg: Image,
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  webp: Image,
  ico: Image,
};

const NAME_MAP: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  '.gitignore': Shield,
  '.env': Shield,
  '.env.local': Shield,
  '.env.production': Shield,
  '.eslintrc': Settings,
  '.prettierrc': Settings,
  'tsconfig.json': Settings,
  'vite.config.ts': Settings,
  'package.json': Settings,
};

export function getFileIcon(
  name: string,
  isDirectory: boolean,
  isExpanded: boolean,
): ComponentType<{ size?: number; strokeWidth?: number }> {
  if (isDirectory) return isExpanded ? FolderOpen : Folder;

  if (NAME_MAP[name]) return NAME_MAP[name];

  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MAP[ext] ?? File;
}
