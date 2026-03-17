import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { diffService, type DiffResult } from './diffService';
import { activityStream } from './activityStream';

beforeEach(() => {
  activityStream.clear();
});

afterEach(() => {
  diffService.stop();
});

function pushEditEvent(filePath: string, oldString: string, newString: string) {
  activityStream.push({
    type: 'tool_executed',
    sessionId: 'test-session',
    sessionName: 'Test',
    summary: `Edit: ${filePath}`,
    metadata: {
      toolName: 'Edit',
      toolId: 'tool-1',
      input: { file_path: filePath, old_string: oldString, new_string: newString },
    },
  });
}

function pushWriteEvent(filePath: string, content: string) {
  activityStream.push({
    type: 'tool_executed',
    sessionId: 'test-session',
    sessionName: 'Test',
    summary: `Write: ${filePath}`,
    metadata: {
      toolName: 'Write',
      toolId: 'tool-2',
      input: { file_path: filePath, content },
    },
  });
}

describe('DiffService', () => {
  it('computes diff for Edit tool events', async () => {
    const diffs: DiffResult[] = [];
    diffService.start();
    diffService.onDiff((d) => diffs.push(d));

    pushEditEvent('/src/app.ts', 'const x = 1;', 'const x = 2;');

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 150));

    expect(diffs).toHaveLength(1);
    expect(diffs[0].filePath).toBe('/src/app.ts');
    expect(diffs[0].fileName).toBe('app.ts');
    expect(diffs[0].isNewFile).toBe(false);
    expect(diffs[0].addedLines).toBe(1);
    expect(diffs[0].removedLines).toBe(1);
    expect(diffs[0].patch).toContain('-const x = 1;');
    expect(diffs[0].patch).toContain('+const x = 2;');
  });

  it('treats Write tool events as new file', async () => {
    const diffs: DiffResult[] = [];
    diffService.start();
    diffService.onDiff((d) => diffs.push(d));

    pushWriteEvent('/src/new.ts', 'export const foo = 42;');

    await new Promise((r) => setTimeout(r, 150));

    expect(diffs).toHaveLength(1);
    expect(diffs[0].isNewFile).toBe(true);
    expect(diffs[0].removedLines).toBe(0);
    expect(diffs[0].addedLines).toBeGreaterThan(0);
  });

  it('ignores non-Edit/Write tool events', async () => {
    const diffs: DiffResult[] = [];
    diffService.start();
    diffService.onDiff((d) => diffs.push(d));

    activityStream.push({
      type: 'tool_executed',
      sessionId: 'test',
      sessionName: 'T',
      summary: 'Read file',
      metadata: { toolName: 'Read', toolId: 't1', input: { file_path: '/foo.ts' } },
    });

    await new Promise((r) => setTimeout(r, 150));
    expect(diffs).toHaveLength(0);
  });

  it('debounces rapid consecutive edits', async () => {
    const diffs: DiffResult[] = [];
    diffService.start();
    diffService.onDiff((d) => diffs.push(d));

    pushEditEvent('/src/a.ts', 'a', 'b');
    pushEditEvent('/src/b.ts', 'x', 'y');

    await new Promise((r) => setTimeout(r, 150));

    // Only the last one should fire due to debounce
    expect(diffs).toHaveLength(1);
    expect(diffs[0].filePath).toBe('/src/b.ts');
  });

  it('skips events with no file_path', async () => {
    const diffs: DiffResult[] = [];
    diffService.start();
    diffService.onDiff((d) => diffs.push(d));

    activityStream.push({
      type: 'tool_executed',
      sessionId: 'test',
      sessionName: 'T',
      summary: 'Edit',
      metadata: { toolName: 'Edit', toolId: 't1', input: { old_string: 'a', new_string: 'b' } },
    });

    await new Promise((r) => setTimeout(r, 150));
    expect(diffs).toHaveLength(0);
  });

  it('cleans up on stop', () => {
    diffService.start();
    const unsub = diffService.onDiff(() => {});
    diffService.stop();
    unsub();
    // Should not throw
  });
});
