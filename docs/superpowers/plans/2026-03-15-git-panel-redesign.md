# Git Confirm Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign GitConfirmPanel into a unified commit flow with branch info, diff stats, unstaged toggle, auto-generate commit message, and next-step selection (commit / commit+push / commit+push+PR).

**Architecture:** Server adds `executeGitAdd` for staging all files and `generateCommitMessage` for auto-generating messages from diff. Client rewrites GitConfirmPanel as a single unified panel with local state machine. GitActionMenu is simplified to a single button that always opens the unified panel.

**Tech Stack:** TypeScript, React 19, Zod, Vitest.

---

## Chunk 1: Server + Schema Changes

### Task 1: Add git add and auto-message support to server

**Files:**
- Modify: `server/gitHandler.ts`
- Modify: `server/gitHandler.test.ts`
- Modify: `src/types/git.ts`
- Modify: `src/types/streamEvent.ts`

- [ ] **Step 1: Write failing tests for executeGitAdd and generateCommitMessage**

In `server/gitHandler.test.ts`, add:

```ts
describe('gitHandler — git add', () => {
  it('stages all files with git add -A', () => {
    const dir = makeGitRepo();
    fs.writeFileSync(path.join(dir, 'new.txt'), 'new file');
    const result = executeGitAdd(dir);
    expect(result.success).toBe(true);
  });

  it('returns error for non-git directory', () => {
    const dir = makeTempDir('codeye-not-git-');
    const result = executeGitAdd(dir);
    expect(result.success).toBe(false);
  });
});

describe('gitHandler — auto commit message', () => {
  it('generates message from diff stat', () => {
    const msg = generateCommitMessage({
      files: [{ path: 'src/main.ts', insertions: 10, deletions: 3 }],
      summary: { filesChanged: 1, insertions: 10, deletions: 3 },
    });
    expect(msg).toContain('1 file');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('handles multiple files', () => {
    const msg = generateCommitMessage({
      files: [
        { path: 'src/a.ts', insertions: 5, deletions: 0 },
        { path: 'src/b.ts', insertions: 0, deletions: 3 },
      ],
      summary: { filesChanged: 2, insertions: 5, deletions: 3 },
    });
    expect(msg).toContain('2 files');
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `npx vitest run server/gitHandler.test.ts`
Expected: FAIL — `executeGitAdd` and `generateCommitMessage` don't exist.

- [ ] **Step 3: Implement**

In `server/gitHandler.ts`, add:

```ts
export function executeGitAdd(cwd: string): { success: boolean; error?: ErrorPayload } {
  const result = spawnSync('git', ['-C', cwd, 'add', '-A'], {
    encoding: 'utf8',
    timeout: GIT_COMMAND_TIMEOUT_MS,
  });
  if (result.error || (result.status !== null && result.status !== 0)) {
    const stderr = (result.stderr || '').toString().trim();
    return { success: false, error: makeError('ADD_FAILED', stderr || 'git add failed') };
  }
  return { success: true };
}

export function generateCommitMessage(diffStat: GitDiffStatPayload): string {
  const { summary } = diffStat;
  const fileWord = summary.filesChanged === 1 ? '1 file' : `${summary.filesChanged} files`;
  const parts = [`update ${fileWord}`];
  if (summary.insertions > 0) parts.push(`+${summary.insertions}`);
  if (summary.deletions > 0) parts.push(`-${summary.deletions}`);
  return `chore: ${parts.join(' ')}`;
}
```

Also modify `gitCommitRequestPayloadSchema` in `src/types/git.ts`: change `message: z.string().min(1)` to `message: z.string().optional()` to allow empty messages.

Add `git_add_request` / `git_add_result` schemas to `src/types/git.ts` and register in `src/types/streamEvent.ts`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/gitHandler.ts server/gitHandler.test.ts src/types/git.ts src/types/streamEvent.ts
git commit -m "feat: add git add -A support and auto commit message generation"
```

### Task 2: Route git_add_request and update commit flow in server

**Files:**
- Modify: `server/claude-proxy.ts`
- Modify: `server/gitHandler.ts` — update `executeCommit` to handle empty message

- [ ] **Step 1: Add git_add_request routing to claude-proxy**

In `server/claude-proxy.ts`, before the existing git write request handler, add:

```ts
if (requestEvent?.type === 'git_add_request') {
  const validated = validateGitRequestEvent(msg, { boundWorkspaceRoot: wsWorkspaceRootByConnection.get(ws) });
  if (!validated.ok) {
    ws.send(wrapEvent('error', { error: `${validated.error.code}: ${validated.error.message}` }, requestEvent.correlationId));
    return;
  }
  const payload = validated.value.payload as Record<string, unknown>;
  const addResult = executeGitAdd(validated.value.payload.cwd);
  ws.send(wrapEvent('git_add_result', { operationId: payload.operationId, ...addResult }, validated.value.correlationId));
  return;
}
```

- [ ] **Step 2: Update executeCommit for optional message**

In `server/gitHandler.ts` `executeCommit`, when `message` is empty/undefined, call `generateCommitMessage(getDiffStat(cwd))` to auto-generate.

- [ ] **Step 3: Add validators for git_add_request**

In `server/validators.ts`, add `git_add_request` to the `clientRequestEventSchema` discriminated union and to `GIT_REQUEST_TYPES`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/claude-proxy.ts server/gitHandler.ts server/validators.ts
git commit -m "feat: route git_add_request and support auto-generated commit messages"
```

## Chunk 2: Client — Unified GitConfirmPanel

### Task 3: Rewrite GitConfirmPanel as unified commit flow

**Files:**
- Rewrite: `src/components/Chat/GitConfirmPanel.tsx`
- Modify: `src/styles/components/git-confirm.css`

- [ ] **Step 1: Rewrite GitConfirmPanel**

Complete rewrite. The panel no longer receives `action` as prop — it's always a unified commit panel with next-step selection. Key changes:

1. Remove `action` prop — panel always opens in unified mode
2. Add state: `nextStep: 'commit' | 'commit-push' | 'commit-push-pr'` (default: `'commit'`)
3. Add state: `includeUnstaged: boolean` (default: `true`)
4. Show branch info from `useGitStatus()`
5. Always fetch diff stat on mount
6. Commit message input with placeholder "留空以自动生成提交消息"
7. Next step radio selection
8. On submit flow:
   - If `includeUnstaged`, send `git_add_request` first, wait for result
   - Send `git_commit_request` (message can be empty → server auto-generates)
   - If `commit-push`, after commit success send `git_push_request`
   - If `commit-push-pr`, after push success send `git_pr_request`
9. Progress display shows each step: "Staging..." → "Committing..." → "Pushing..." → "Creating PR..."

- [ ] **Step 2: Update CSS**

Update `src/styles/components/git-confirm.css` to match the mockup layout:
- Branch row: flex between, label left, value right
- Changes row: same layout
- Toggle row: glass surface background, toggle switch
- Next step options: radio-style selection with accent highlight on active
- Submit button: full-width, light bg with dark text

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Chat/GitConfirmPanel.tsx src/styles/components/git-confirm.css
git commit -m "feat: rewrite GitConfirmPanel as unified commit flow with step selection"
```

### Task 4: Simplify GitActionMenu

**Files:**
- Modify: `src/components/Layout/GitActionMenu.tsx`

- [ ] **Step 1: Simplify to single button**

GitActionMenu no longer needs the dropdown with separate commit/push/PR options. Simplify to:
- Single "Submit" button that opens the unified GitConfirmPanel
- Remove the chevron dropdown entirely (or keep it minimal)
- GitConfirmPanel no longer receives `action` prop

Update the component to always open GitConfirmPanel without an `action`:

```tsx
{confirmOpen && (
  <GitConfirmPanel onClose={() => setConfirmOpen(false)} />
)}
```

- [ ] **Step 2: Update gitWrite service**

In `src/services/gitWrite.ts`, add a `sendGitAddRequest` function for the unstaged toggle:

```ts
export async function sendGitAddRequest(params: {
  cwd: string;
  onResult?: (result: { success: boolean; error?: { code: string; message: string } }) => void;
}): Promise<{ correlationId: string }> { ... }
```

- [ ] **Step 3: Verify build + tests**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout/GitActionMenu.tsx src/services/gitWrite.ts
git commit -m "feat: simplify GitActionMenu to single unified button"
```

### Task 5: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit if needed**

---

## Execution Notes

1. `gitCommitRequestPayloadSchema` message field changes from `z.string().min(1)` to `z.string().optional()` — this is backward compatible (server handles empty by auto-generating).
2. The unified panel manages its own multi-step execution flow (add → commit → push → PR) with local state. No new Zustand store needed.
3. `generateCommitMessage` is intentionally simple (no AI call) — generates a conventional commit from diff stat. AI-powered generation can be added later.
4. The `git_add_request` reuses the existing `connectionContextSchema` + `operationId` pattern for consistency.
5. GitActionMenu dropdown is removed — the "Submit" button directly opens the unified panel. This matches the reference design where there's one entry point.
