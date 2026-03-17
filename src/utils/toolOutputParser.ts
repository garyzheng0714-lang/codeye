import type { ToolCallDisplay } from '../types';

export interface ParsedEditTool {
  kind: 'edit';
  filePath: string;
  fileName: string;
  oldString?: string;
  newString?: string;
  added: number;
  removed: number;
}

export interface ParsedReadTool {
  kind: 'read';
  filePath: string;
  fileName: string;
  lineCount: number;
  snippet: string;
}

export interface ParsedBashTool {
  kind: 'bash';
  command: string;
  output: string;
  isError: boolean;
}

export interface ParsedSearchTool {
  kind: 'search';
  toolName: string;
  pattern?: string;
  matchCount: number;
  files: string[];
  truncated: boolean;
}

export interface ParsedWriteTool {
  kind: 'write';
  filePath: string;
  fileName: string;
  lineCount: number;
  contentPreview?: string;
}

export interface ParsedGenericTool {
  kind: 'generic';
  output: string;
}

export type ParsedTool =
  | ParsedEditTool
  | ParsedReadTool
  | ParsedBashTool
  | ParsedSearchTool
  | ParsedWriteTool
  | ParsedGenericTool;

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

function fileNameFromPath(filePath: string): string {
  return filePath.split('/').pop() ?? filePath;
}

function countDiffLines(oldStr: string, newStr: string): { added: number; removed: number } {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  let added = 0;
  let removed = 0;
  let oi = 0;
  let ni = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length) {
      if (oldLines[oi] === newLines[ni]) {
        oi++;
        ni++;
      } else {
        removed++;
        added++;
        oi++;
        ni++;
      }
    } else if (oi < oldLines.length) {
      removed++;
      oi++;
    } else {
      added++;
      ni++;
    }
  }
  return { added, removed };
}

function parseDiffCounts(output: string): { added: number; removed: number } {
  const addMatch = output.match(/(\d+)\s*(?:insertion|addition|line)/);
  const delMatch = output.match(/(\d+)\s*(?:deletion|removal)/);
  return {
    added: addMatch ? parseInt(addMatch[1], 10) : 0,
    removed: delMatch ? parseInt(delMatch[1], 10) : 0,
  };
}

function parseEdit(tool: ToolCallDisplay): ParsedEditTool {
  const filePath = str(tool.input.file_path);
  const oldString = tool.input.old_string != null ? str(tool.input.old_string) : undefined;
  const newString = tool.input.new_string != null ? str(tool.input.new_string) : undefined;

  let added = 0;
  let removed = 0;
  if (oldString != null && newString != null) {
    const counts = countDiffLines(oldString, newString);
    added = counts.added;
    removed = counts.removed;
  } else if (tool.output) {
    const counts = parseDiffCounts(tool.output);
    added = counts.added;
    removed = counts.removed;
  }

  return {
    kind: 'edit',
    filePath,
    fileName: fileNameFromPath(filePath),
    oldString,
    newString,
    added,
    removed,
  };
}

function parseRead(tool: ToolCallDisplay): ParsedReadTool {
  const filePath = str(tool.input.file_path);
  const output = tool.output ?? '';
  const lines = output.split('\n');
  return {
    kind: 'read',
    filePath,
    fileName: fileNameFromPath(filePath),
    lineCount: output ? lines.length : 0,
    snippet: lines.slice(0, 8).join('\n'),
  };
}

function parseBash(tool: ToolCallDisplay): ParsedBashTool {
  const command = str(tool.input.command);
  const output = tool.output ?? '';
  const isError = output.startsWith('Error:') || output.startsWith('error:') || output.includes('command not found');
  return { kind: 'bash', command, output, isError };
}

function parseSearch(tool: ToolCallDisplay): ParsedSearchTool {
  const pattern = str(tool.input.pattern);
  const output = tool.output ?? '';
  const allLines = output.split('\n').filter(Boolean);
  const truncated = allLines.length > 20;
  const files = allLines.slice(0, 20);
  return {
    kind: 'search',
    toolName: tool.name,
    pattern: pattern || undefined,
    matchCount: allLines.length,
    files,
    truncated,
  };
}

function parseWrite(tool: ToolCallDisplay): ParsedWriteTool {
  const filePath = str(tool.input.file_path);
  const content = tool.input.content != null ? str(tool.input.content) : undefined;
  const lines = content?.split('\n') ?? [];
  return {
    kind: 'write',
    filePath,
    fileName: fileNameFromPath(filePath),
    lineCount: lines.length,
    contentPreview: content ? lines.slice(0, 15).join('\n') : undefined,
  };
}

export function parseToolOutput(tool: ToolCallDisplay): ParsedTool {
  switch (tool.name) {
    case 'Edit':
      return parseEdit(tool);
    case 'Write':
      return parseWrite(tool);
    case 'Read':
      return parseRead(tool);
    case 'Bash':
      return parseBash(tool);
    case 'Grep':
    case 'Glob':
    case 'ToolSearch':
      return parseSearch(tool);
    default:
      return { kind: 'generic', output: tool.output ?? '' };
  }
}
