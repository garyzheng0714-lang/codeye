# Protocol-First Cycle A (P0-P2) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Cycle A (P0-P2) with schema-first protocol, server/client feature-flag gating, Git read path in TitleBar, and deterministic Git write flow (commit/push/pr) with lock/idempotency and recovery semantics.

**Architecture:** Build from contracts outward: shared event/request schemas and validators first, then server routing and git execution core, then UI wiring. Keep Cycle A runtime scope strict (P0-P2 only) while adding parse-only schema coverage for later-cycle messages. Enforce request correlation, operation idempotency, and worktree-boundary checks in server core.

**Tech Stack:** TypeScript, Zod, React 19, Zustand, ws, Vitest, Playwright.

---

**Execution skills to apply during implementation:**
- `@superpowers/test-driven-development`
- `@superpowers/verification-before-completion`
- `@superpowers/requesting-code-review`

## Chunk 1: Cycle A Contracts + Server Core + UI Wiring

### Task 1: Add shared feature-flag and connection-context contracts

**Files:**
- Create: `src/types/featureFlags.ts`
- Modify: `src/types/index.ts`
- Modify: `src/types/electron.d.ts`
- Test: `src/types/featureFlags.test.ts`

- [ ] **Step 1: Write failing type/schema tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseFeatureFlagDocument, DEFAULT_SERVER_FLAGS } from './featureFlags';

describe('featureFlags contracts', () => {
  it('accepts valid v1 document', () => {
    const parsed = parseFeatureFlagDocument({
      _schemaVersion: 1,
      flags: DEFAULT_SERVER_FLAGS,
      updatedAt: Date.now(),
    });
    expect(parsed).not.toBeNull();
  });

  it('rejects invalid schema version', () => {
    const parsed = parseFeatureFlagDocument({ _schemaVersion: 2 });
    expect(parsed).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/types/featureFlags.test.ts`
Expected: FAIL with missing module/symbol errors.

- [ ] **Step 3: Implement minimal contracts**

```ts
export const DEFAULT_SERVER_FLAGS = {
  protocolV2: false,
  gitReadStatus: false,
  gitWriteFlow: false,
  gitResultCards: false,
  toolApprovalBlocking: false,
  streamingEnhancements: false,
  commandExperience: false,
} as const;
```

- [ ] **Step 4: Run test to verify pass**

Run: `npm run test -- src/types/featureFlags.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/featureFlags.ts src/types/featureFlags.test.ts src/types/index.ts src/types/electron.d.ts
git commit -m "feat: add shared feature-flag and context contracts"
```

### Task 2: Expand StreamEvent schemas (client/server) for Cycle A + parse-only later messages

**Files:**
- Modify: `src/types/streamEvent.ts`
- Modify: `src/types/streamEvent.test.ts`
- Modify: `server/streamEvent.ts`

- [ ] **Step 1: Write failing parse tests for new events**

```ts
it('parses git_commit_result with correlationId', () => {
  const event = parseStreamEvent({
    version: 1,
    type: 'git_commit_result',
    correlationId: '11111111-1111-1111-1111-111111111111',
    payload: { operationId: '22222222-2222-2222-2222-222222222222', success: false, error: { code: 'LOCK_CONFLICT', message: 'busy', retryable: true } },
  });
  expect(event?.type).toBe('git_commit_result');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/types/streamEvent.test.ts`
Expected: FAIL on unknown discriminant types.

- [ ] **Step 3: Implement schema expansion + typed wrapEvent support**

```ts
export function wrapEvent<TPayload>(
  type: StreamEventType,
  payload: TPayload,
  correlationId?: string
): string {
  return JSON.stringify({ version: 1, type, payload, ...(correlationId ? { correlationId } : {}) });
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/types/streamEvent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/streamEvent.ts src/types/streamEvent.test.ts server/streamEvent.ts
git commit -m "feat: add cycle-a stream event schemas and correlation support"
```

### Task 3: Add request validators for StreamEvent-wrapped client messages

**Files:**
- Modify: `server/validators.ts`
- Test: `server/validators.test.ts` (create if missing)

- [ ] **Step 1: Write failing validator tests**

```ts
it('accepts git_status_request event envelope', () => {
  const ok = isGitStatusRequest({ version: 1, type: 'git_status_request', payload: { cwd: '/tmp' } });
  expect(ok).toBe(true);
});

it('rejects request missing version', () => {
  const ok = isGitStatusRequest({ type: 'git_status_request', payload: { cwd: '/tmp' } });
  expect(ok).toBe(false);
});
```

- [ ] **Step 2: Run failing test**

Run: `npm run test -- server/validators.test.ts`
Expected: FAIL (missing validators).

- [ ] **Step 3: Implement discriminated validators with shared error mapping**

```ts
const baseEnvelope = z.object({ version: z.literal(1), type: z.string(), payload: z.unknown() });
```

- [ ] **Step 4: Re-run tests**

Run: `npm run test -- server/validators.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/validators.ts server/validators.test.ts
git commit -m "feat: validate cycle-a request envelopes"
```

### Task 4: Implement server feature-flag authority + ws connect sync event

**Files:**
- Create: `server/featureFlags.ts`
- Modify: `server/claude-proxy.ts`
- Test: `server/featureFlags.test.ts`

- [ ] **Step 1: Write failing tests for reconciliation and sync payload**

```ts
it('auto-disables dependents when prerequisite off', () => {
  const out = reconcileFlags({ protocolV2: false, gitWriteFlow: true });
  expect(out.gitWriteFlow).toBe(false);
});
```

- [ ] **Step 2: Run failing test**

Run: `npm run test -- server/featureFlags.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement server snapshot + `feature_flags` connect event**

```ts
ws.send(wrapEvent('feature_flags', { flags: getServerFlags() }));
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- server/featureFlags.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/featureFlags.ts server/featureFlags.test.ts server/claude-proxy.ts
git commit -m "feat: add server-authoritative feature flag snapshot and sync event"
```

### Task 5: Implement `server/gitHandler.ts` read path + parsers

**Files:**
- Create: `server/gitHandler.ts`
- Modify: `server/claude-proxy.ts`
- Test: `server/gitHandler.test.ts`

- [ ] **Step 1: Write failing parser tests for porcelain output**

```ts
it('parses branch, ahead/behind and dirty', () => {
  const status = parsePorcelain(`# branch.head main\n# branch.ab +2 -1\n1 M. N... 100644 100644 100644 file.ts`);
  expect(status.branch).toBe('main');
  expect(status.ahead).toBe(2);
  expect(status.behind).toBe(1);
  expect(status.dirty).toBe(true);
});
```

- [ ] **Step 2: Run failing test**

Run: `npm run test -- server/gitHandler.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement status command with timeout and worktree-root guard**

```ts
spawnSync('git', ['-C', cwd, 'status', '--porcelain=2', '--branch'], { encoding: 'utf8', timeout: 5000 });
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- server/gitHandler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/gitHandler.ts server/gitHandler.test.ts server/claude-proxy.ts
git commit -m "feat: add git status read path with parser and timeout"
```

### Task 6: Implement deterministic write core (lock + idempotency + tombstone)

**Files:**
- Modify: `server/gitHandler.ts`
- Modify: `server/claude-proxy.ts`
- Test: `server/gitHandler.test.ts`

- [ ] **Step 1: Add failing tests for decision table paths**

```ts
it('returns LOCK_CONFLICT for new operation when lock held', async () => {
  const out = await handleGitWriteRequest(makePushReq({ operationId: op2 }), ctxWithLock);
  expect(out.payload.error?.code).toBe('LOCK_CONFLICT');
});

it('returns cached result for duplicate terminal operationId', async () => {
  const out = await handleGitWriteRequest(makeCommitReq({ operationId: op1 }), ctxWithTerminalCache);
  expect(out.type).toBe('git_commit_result');
  expect(out.payload.success).toBe(true);
});
```

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- server/gitHandler.test.ts`
Expected: FAIL on missing write handlers.

- [ ] **Step 3: Implement decision precedence + tombstone semantics**

```ts
// precedence: existing operationId -> lock -> execute
if (existing) return dedupeResponse(existing, req.correlationId);
if (lockHeld(cwd)) return lockConflictResult(req);
return executeWrite(req);
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- server/gitHandler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/gitHandler.ts server/gitHandler.test.ts server/claude-proxy.ts
git commit -m "feat: add deterministic git write core with lock and idempotency"
```

### Task 7: Build P1 UI read path (TitleBar + hook refresh triggers)

**Files:**
- Modify: `src/hooks/useGitStatus.ts`
- Modify: `src/components/Layout/TitleBar.tsx`
- Modify: `src/components/Chat/InputFooter.tsx` (remove duplicate git status chip or keep compact summary)
- Test: `src/hooks/useGitStatus.test.ts` (create)
- Test: `tests/e2e/features/git-status.spec.ts` (create)

- [ ] **Step 1: Write failing hook tests for refresh triggers**

```ts
it('refreshes on visibilitychange visible', async () => {
  // simulate hidden -> visible transition and assert refresh called
});
```

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- src/hooks/useGitStatus.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement trigger wiring + titlebar rendering**

```tsx
useEffect(() => {
  const onVisible = () => document.visibilityState === 'visible' && void refresh();
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}, [refresh]);
```

- [ ] **Step 4: Run unit + e2e tests**

Run: `npm run test -- src/hooks/useGitStatus.test.ts`
Expected: PASS.
Run: `npm run test:e2e -- tests/e2e/features/git-status.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGitStatus.ts src/hooks/useGitStatus.test.ts src/components/Layout/TitleBar.tsx src/components/Chat/InputFooter.tsx tests/e2e/features/git-status.spec.ts
git commit -m "feat: show git status in titlebar with multi-trigger refresh"
```

### Task 8: Build P2 confirm panel and deterministic action wiring

**Files:**
- Create: `src/components/Chat/GitConfirmPanel.tsx`
- Modify: `src/components/Layout/GitActionMenu.tsx`
- Modify: `src/hooks/useClaudeChat.ts`
- Modify: `src/stores/chatStore.ts`
- Test: `src/components/Chat/GitConfirmPanel.test.tsx` (create)
- Test: `tests/e2e/features/git-write-flow.spec.ts` (create)

- [ ] **Step 1: Write failing component and flow tests**

```tsx
it('shows diff stat before commit confirm', async () => {
  // open panel, assert file stats rendered, confirm disabled until message exists
});
```

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- src/components/Chat/GitConfirmPanel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement panel modes + request dispatch + correlation handling**

```ts
const correlationId = crypto.randomUUID();
sendMessage({ version: 1, type: 'git_commit_request', correlationId, payload: { cwd, operationId, message } });
```

- [ ] **Step 4: Run unit + e2e tests**

Run: `npm run test -- src/components/Chat/GitConfirmPanel.test.tsx`
Expected: PASS.
Run: `npm run test:e2e -- tests/e2e/features/git-write-flow.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Chat/GitConfirmPanel.tsx src/components/Chat/GitConfirmPanel.test.tsx src/components/Layout/GitActionMenu.tsx src/hooks/useClaudeChat.ts src/stores/chatStore.ts tests/e2e/features/git-write-flow.spec.ts
git commit -m "feat: add git confirm panel and deterministic write requests"
```

### Task 9: Cycle A verification and release gate

**Files:**
- Modify: `tests/e2e/app.spec.ts` (if selectors changed)
- Modify: `playwright.config.ts` (only if new project settings are required)
- Modify: `README.md` or `RELEASING.md` (flag behavior notes)

- [ ] **Step 1: Add failing integration test for flag-disable-during-pending-write**

```ts
it('allows status recovery when gitWriteFlow disabled mid-operation', async () => {
  // assert in-flight completion and status query behavior
});
```

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- server/gitHandler.test.ts`
Expected: FAIL for missing case.

- [ ] **Step 3: Implement missing edge handling and docs**

```ts
// when flag turns off, allow status endpoint for known in-flight operations only
```

- [ ] **Step 4: Run full verification suite**

Run: `npm run test`
Expected: PASS.
Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/gitHandler.ts server/gitHandler.test.ts tests/e2e README.md RELEASING.md
git commit -m "test: add cycle-a recovery and flag transition verification"
```

---

## Execution Notes

1. Keep each task in strict TDD order; do not implement before a failing test exists.
2. Preserve 3-store cap (`chatStore`, `sessionStore`, `uiStore`).
3. Do not introduce Phase B/C runtime behavior in Cycle A implementation.
4. Keep parse-only later-cycle schemas test-covered but unrouted.

