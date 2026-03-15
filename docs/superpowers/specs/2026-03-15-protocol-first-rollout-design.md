# Protocol-First Rollout Design (P0-P6)

- Date: 2026-03-15
- Status: Design validated, ready for implementation planning
- Owner: Codeye team
- Immediate planning scope: Cycle A (P0-P2)

## 1. Problem Statement

Current gaps:

1. Git write actions are AI-prompt driven, not deterministic command execution.
2. Tool approval UI exists but does not server-block self-managed tools.
3. Slash command persistence bypasses `StorageAdapter` and schema migration rules.
4. Rollout control is inconsistent across features.

This design introduces schema-first protocol evolution and phased, rollback-safe delivery.

## 2. Goals and Non-Goals

## Goals

1. Define complete protocol contracts before behavior work.
2. Deliver deterministic Git read/write vertical slice with correlation-safe results.
3. Deliver true approval blocking for self-managed tools only.
4. Migrate command storage to `StorageAdapter` with versioned migration + backup.
5. Enforce feature-flag rollback boundaries per delivery phase.

## Non-Goals

1. No Phase 7 remote bridge implementation.
2. No fourth Zustand store.
3. No direct localStorage/IndexedDB usage in new persistence domains.
4. No interception of Claude CLI internal tool approval flows.

## 3. Hard Constraints

1. State stores remain `chatStore`, `sessionStore`, `uiStore`.
2. Layering remains `types -> services -> hooks -> stores -> components`.
3. Persisted data includes `_schemaVersion`.
4. Migrations are sequential (`vN -> vN+1`) and backup before migration.
5. Performance thresholds must hold:
   - TTFT < 300ms
   - input echo < 16ms
   - long session FPS > 50

## 4. Planning Decomposition

This spec includes roadmap coverage through P6, but planning is decomposed:

1. Cycle A (next implementation plan): **P0-P2**.
2. Cycle B: P3-P4.
3. Cycle C: P5-P6.

Only Cycle A details are normative in the main body. Later phases are appendices.

## 5. System Units and Boundaries

| Unit | Owner | Inputs | Outputs | State Boundary | Primary Files | Verification Target |
|---|---|---|---|---|---|---|
| A Stream Contract | Protocol layer | raw server event payloads | typed `StreamEvent` objects | stateless parse/serialize | `src/types/streamEvent.ts`, `server/streamEvent.ts`, `src/types/streamEvent.test.ts` | parser + wrapper schema tests |
| B Request Validation | Server gateway | raw client command messages | typed request objects or validation errors | stateless validation | `server/validators.ts`, `server/claude-proxy.ts` | validator success/failure tests |
| C Feature Flags | Shared client+server | flag reads/writes and server snapshot loads | reconciled effective flags and gating decisions | persisted doc + server snapshot | `src/services/featureFlags.ts`, `server/featureFlags.ts` | reconciliation + gating tests |
| D Git Execution | Server git layer | validated git requests | typed git result/status events | operation store + lock store | `server/gitHandler.ts`, `server/claude-proxy.ts`, `src/hooks/useGitStatus.ts`, `src/components/Layout/TitleBar.tsx`, `src/components/Layout/GitActionMenu.tsx` | lock/idempotency/timeout tests |
| E Approval Handshake | Server + chat UI | guarded tool execution intents | allow/deny decisions and terminal events | pending approval map keyed by `approvalId` | `server/realHandler.ts`, `src/hooks/useClaudeChat.ts`, `src/stores/chatStore.ts`, `src/components/Chat/ToolApproval.tsx` | allow/deny/timeout/disconnect tests |
| F Command Persistence | Data layer | legacy slash command records | migrated versioned command docs | command document persistence only | `src/data/slashCommands.ts`, `src/migrations/v1-to-v2.ts`, `src/migrations/migrationRunner.ts` | migration + backup tests |

Unit D interface contract:
1. Input: validated git request events (`git_*_request`) from ws gateway.
2. Output: only typed git result/status events (`git_*`, `git_*_result`, `git_operation_status`).
3. Dependency rule: no direct UI/store imports in server layer.
4. Test seam: pure command parser + lock/idempotency manager unit-testable without ws.

Unit E interface contract:
1. Input: guarded execution intents from server runtime.
2. Output: `tool_approval_request` event and eventual allow/deny decision.
3. Primary key: `approvalId` only; `requestId` trace-only.
4. Lifecycle policy: late/duplicate `tool_approval_response` with unknown `approvalId` are ignored.
5. Timeout policy: unresolved approvals auto-expire to deny semantics in Cycle B runtime.
6. Reconnect policy: pending approvals are re-emitted or resolved as deny on reconnect timeout window expiry.
7. Test seam: pending-map lifecycle tested with allow/deny/timeout/disconnect scenarios.

Unit A interface contract:
1. Input: unknown ws payload objects.
2. Output: typed `StreamEvent` or parse failure.
3. Dependency rule: no business logic in parser/wrapper.
4. Test seam: per-event parse success/failure + serialization roundtrip.

Unit B interface contract:
1. Input: raw client messages.
2. Output: typed request events or `VALIDATION_ERROR` error event.
3. Dependency rule: validation must complete before route dispatch.
4. Test seam: malformed/unknown-type rejection behavior.

Unit C interface contract:
1. Input: flag toggle requests and persisted flag docs.
2. Output: reconciled valid flag set.
3. Dependency rule: enforce dependency graph before publish.
4. Server-side source of truth: server snapshot (defaults + optional env overrides) is authoritative for route gating.
5. Client-side persistence: client stores local preferences via `StorageAdapter` as `localFlags`.
6. Effective UI flags are computed as `effectiveFlag = localFlags[key] && serverFlags[key]`.
7. Sync rule: server emits `feature_flags` on ws connect; client updates `serverFlags` and recomputes `effectiveFlags`.
8. Test seam: startup reconciliation + runtime toggle race + client/server sync tests.

Unit F interface contract:
1. Input: legacy command records and current schema version.
2. Output: migrated command doc with `_schemaVersion`.
3. Dependency rule: backup key write must occur before migration write.
4. Test seam: migration chain + backup restore tests.

## 6. Protocol Contracts (P0)

## 6.1 Envelope Rules

All frontend/backend messages use the same envelope:

```ts
interface StreamEvent<TPayload> {
  version: 1;
  type: string;
  payload: TPayload;
}

interface CorrelatedStreamEvent<TPayload> extends StreamEvent<TPayload> {
  correlationId: string;
}
```

Client -> server request messages are also `StreamEvent`, validated by `server/validators.ts`.

Connection context contract:
1. Each ws connection is bound to `{ sessionId, worktreeRoot }`.
2. `worktreeRoot` is authoritative server context for filesystem boundary checks.
3. If connection context is missing/invalid, server emits `error` with `VALIDATION_ERROR` and rejects routed requests.

Shared error payload:

```ts
interface ErrorPayload {
  code:
    | 'VALIDATION_ERROR'
    | 'TIMEOUT'
    | 'LOCK_CONFLICT'
    | 'NOT_AVAILABLE'
    | 'EXEC_FAILED'
    | 'DENIED'
    | 'UNKNOWN_STATE';
  message: string;
  retryable: boolean;
  suggestion?: string;
}
```

## 6.2 Correlation and Identity Rules

1. `correlationId` is required for asynchronous request/response pairs (`git_diff_stat_request/git_diff_stat`, `git_commit_request/git_commit_result`, `git_push_request/git_push_result`, `git_pr_request/git_pr_result`, `git_operation_status_request/git_operation_status`, `preview_request/preview_response`, `tool_approval_request/tool_approval_response`). `git_status_request/git_status` do not require it.
2. `operationId` is required for git write operations and used for idempotency/status recovery.
3. `approvalId` is the sole authoritative key for approval pending-map matching.
4. `requestId` is trace metadata only (not map key).

Behavior:
1. Duplicate write request with same `operationId` returns last known result.
2. Late response with unknown `correlationId` is ignored by UI.
3. Approval response without known `approvalId` is ignored and logged.
4. Reused `operationId` with mismatched request fingerprint (`cwd`, request type, message/title/body) returns `VALIDATION_ERROR` and never executes.

Duplicate write request handling by operation state:
1. `pending`: server does not re-execute command; returns `git_operation_status` with `state='pending'`.
2. `succeeded` or `failed`: server returns cached terminal result (`git_*_result`) without re-executing command.
3. `unknown`: server returns `git_operation_status` with `state='unknown'`; client must follow recovery policy.
4. For cached/dedupe responses, server always echoes the request's current `correlationId` in the response envelope so UI correlation remains valid.

Write outcome decision table:

| lockHeld | operationIdSeen | fingerprintMatch | Response | Error Code | Execution |
|---|---|---|---|---|---|
| false | no | n/a | typed terminal `git_*_result` (or pending status while running) | n/a | execute command |
| true | no | n/a | typed terminal `git_*_result` | `LOCK_CONFLICT` | do not execute |
| n/a | yes | true and state=`pending` | `git_operation_status(state='pending')` | n/a | do not execute |
| n/a | yes | true and state in `{succeeded,failed}` | cached terminal `git_*_result` | n/a | do not execute |
| n/a | yes | true and state=`unknown` | `git_operation_status(state='unknown')` | `UNKNOWN_STATE` | do not execute |
| n/a | yes | false | matching typed result event | `VALIDATION_ERROR` | do not execute |

`git_operation_status_request` with unknown `operationId` returns `git_operation_status(state='unknown', error.code='UNKNOWN_STATE')`.

Evaluation precedence:
1. If `operationId` exists in state/cache, follow dedupe path first.
2. If `operationId` is new, evaluate lock state next.
3. Only new + unlocked requests are executable.

Post-TTL semantics:
1. Expired `operationId` is tombstoned for 24h in replay-protection set.
2. Reuse of tombstoned `operationId` returns `VALIDATION_ERROR` and does not execute.
3. Client must generate a new `operationId` for retries after TTL windows.

Operation and lock lifecycle:
1. Operation state store lives in `server/gitHandler.ts` as in-memory `Map<canonicalCwd, Map<operationId, OperationState>>`.
2. Retention TTL is 30 minutes for terminal states and 2 minutes for `pending`/`unknown` states.
3. Lock store lives in memory keyed by `canonicalCwd` and is released in `finally`.
4. On server process restart, operation state is lost; UI must treat unresolved operations as `unknown` and run status recovery before retry.

OperationState contract:
```ts
interface OperationState {
  operationId: string;
  requestType: 'git_commit_request' | 'git_push_request' | 'git_pr_request';
  fingerprint: string; // hash of normalized payload fields
  state: 'pending' | 'succeeded' | 'failed' | 'unknown';
  updatedAt: number;
}

interface TerminalResultCacheEntry {
  operationId: string;
  resultType: 'git_commit_result' | 'git_push_result' | 'git_pr_result';
  payload: Record<string, unknown>; // exact terminal payload replay
  expiresAt: number; // must match operation-state TTL policy
}
```

## 6.3 Canonical Message Schemas

### Client -> Server command messages

```ts
type GitStatusRequest = StreamEvent<{
  cwd: string;
}> & {
  type: 'git_status_request';
};

type GitDiffStatRequest = CorrelatedStreamEvent<{
  cwd: string;
}> & {
  type: 'git_diff_stat_request';
};

type GitCommitRequest = CorrelatedStreamEvent<{
  cwd: string;
  operationId: string;
  message: string;
}> & {
  type: 'git_commit_request';
};

type GitPushRequest = CorrelatedStreamEvent<{
  cwd: string;
  operationId: string;
}> & {
  type: 'git_push_request';
};

type GitPrRequest = CorrelatedStreamEvent<{
  cwd: string;
  operationId: string;
  title: string;
  body: string;
}> & {
  type: 'git_pr_request';
};

type GitOperationStatusRequest = CorrelatedStreamEvent<{
  cwd: string;
  operationId: string;
}> & {
  type: 'git_operation_status_request';
};

type PreviewRequest = CorrelatedStreamEvent<{
  previewType: 'file' | 'diff';
  path?: string;
}> & {
  type: 'preview_request';
};

type ToolApprovalResponse = CorrelatedStreamEvent<{
  approvalId: string;
  decision: 'allow' | 'deny';
}> & {
  type: 'tool_approval_response';
};
```

Validation constraints (enforced in `server/validators.ts`):
1. `cwd` is canonicalized with `path.resolve` + `fs.realpathSync` and must be an existing directory.
2. `cwd` and `path` (if provided) must stay under the active session worktree root.
3. `message` (commit) length: 1..200 chars.
4. `title` (PR) length: 1..120 chars.
5. `body` (PR) length: 1..10000 chars.
6. Empty strings after trim are rejected.
7. `operationId`, `correlationId`, `approvalId` must match UUID format (`^[0-9a-fA-F-]{36}$`) and be non-empty.
8. `preview_request` rules:
   - when `previewType='file'`, `path` is required and must resolve to a readable file.
   - when `previewType='diff'`, `path` is optional; absent path means repo-level diff summary.
9. Invalid payloads return `VALIDATION_ERROR`.

### Server -> Client stream events

```ts
type GitStatusEvent = StreamEvent<{
  available: boolean;
  branch: string | null;
  dirty: boolean;
  ahead: number;
  behind: number;
  error?: ErrorPayload;
}> & { type: 'git_status' };

type GitDiffStatEvent = CorrelatedStreamEvent<{
  files: Array<{ path: string; insertions: number; deletions: number }>;
  summary: { files: number; insertions: number; deletions: number };
  error?: ErrorPayload;
}> & { type: 'git_diff_stat' };

type GitCommitResultEvent = CorrelatedStreamEvent<{
  operationId: string;
  success: boolean;
  hash?: string;
  message?: string;
  error?: ErrorPayload;
}> & { type: 'git_commit_result' };

type GitPushResultEvent = CorrelatedStreamEvent<{
  operationId: string;
  success: boolean;
  remote?: string;
  branch?: string;
  commits?: number;
  error?: ErrorPayload;
}> & { type: 'git_push_result' };

type GitPrResultEvent = CorrelatedStreamEvent<{
  operationId: string;
  success: boolean;
  url?: string;
  number?: number;
  manualCommand?: string;
  error?: ErrorPayload;
}> & { type: 'git_pr_result' };

type GitOperationStatusEvent = CorrelatedStreamEvent<{
  operationId: string;
  state: 'pending' | 'succeeded' | 'failed' | 'unknown';
  resultType?: 'commit' | 'push' | 'pr';
  error?: ErrorPayload;
}> & { type: 'git_operation_status' };

type ToolApprovalRequestEvent = CorrelatedStreamEvent<{
  approvalId: string;
  requestId: string;
  toolName: string;
  args: Record<string, unknown>;
  timeoutSec: 120;
}> & { type: 'tool_approval_request' };

type PreviewResponseEvent = CorrelatedStreamEvent<{
  type: 'file' | 'diff';
  content: string;
  path?: string;
  error?: ErrorPayload;
}> & { type: 'preview_response' };

type ToolProgressEvent = StreamEvent<{
  toolId: string;
  requestId: string;
  lines: string[];
  finished: boolean;
}> & { type: 'tool_progress' };

type FeatureFlagsEvent = StreamEvent<{
  flags: Record<string, boolean>;
}> & { type: 'feature_flags' };

type ErrorEvent = StreamEvent<{
  error: ErrorPayload;
}> & { type: 'error' };
```

Server event invariants:

| Event Type | Success Path Invariant | Error Path Invariant | Forbidden Combination |
|---|---|---|---|
| `git_commit_result` | `success=true` requires `hash` and `message` | `success=false` requires `error` | `success=true` with `error` |
| `git_push_result` | `success=true` requires `remote` and `branch` | `success=false` requires `error` | `success=true` with `error` |
| `git_pr_result` | `success=true` requires `url` or `number` | `success=false` requires `error` or `manualCommand` | `success=true` with `error` |
| `git_diff_stat` | `error` absent implies `summary` present | `error` present allows empty `files` | non-empty `files` with malformed summary |
| `git_operation_status` | `state in {pending,succeeded,failed,unknown}` | if `state=failed`, `error` required | `state=succeeded` with `error` |

UI-local recovery state mapping:
1. Protocol state remains one of `pending|succeeded|failed|unknown`.
2. `manual_reconcile_required` is UI-local state only, entered after policy checks while protocol still reports `unknown`.

## 6.4 Phase-to-Flag Mapping

```ts
interface FeatureFlagDocumentV1 {
  _schemaVersion: 1;
  flags: {
    protocolV2: boolean;          // P0
    gitReadStatus: boolean;       // P1
    gitWriteFlow: boolean;        // P2
    gitResultCards: boolean;      // P3
    toolApprovalBlocking: boolean;// P4
    streamingEnhancements: boolean;// P5
    commandExperience: boolean;   // P6
  };
  updatedAt: number;
}
```

Naming note: `protocolV2` is a rollout feature flag name, not the StreamEvent envelope version number (which remains `version: 1` in this phase).

Cycle A flag authority model:
1. `serverFlags` are authoritative for backend routing and cannot be overridden by client writes.
2. `localFlags` are client-persisted preferences only.
3. UI must gate actions by `effectiveFlag = localFlags && serverFlags`.

Defaults on introduction: all flags `false`.

Flag dependency rules:

| Flag | Requires | Can Enable When | Rollback Rule |
|---|---|---|---|
| `protocolV2` | none | P0 unit tests pass (`streamEvent`, `validators`, `featureFlags`) | disabling requires all dependents off first |
| `gitReadStatus` | `protocolV2` | P1 integration + e2e git-status tests pass | disable `gitWriteFlow` first if enabled |
| `gitWriteFlow` | `protocolV2`, `gitReadStatus` | P2 integration + e2e commit/push/pr tests pass | disable dependent `gitResultCards` first |
| `gitResultCards` | `gitWriteFlow` | P3 result-card tests pass | disable directly |
| `toolApprovalBlocking` | `protocolV2` | P4 approval handshake tests pass | disable directly |
| `streamingEnhancements` | `protocolV2` | P5 stream/progress tests pass + perf checks pass | disable directly |
| `commandExperience` | `protocolV2` | P6 migration + command palette tests pass | disable directly |

Flag reconciliation policy:
1. On startup, invalid persisted combinations are auto-healed by disabling dependent flags and logging a warning.
2. At runtime, enabling a flag whose prerequisites are disabled is rejected with a non-fatal error and no state change.
3. Disabling a prerequisite flag auto-disables all dependents in topological order.

Flag-off response contract:
1. If a request reaches a disabled feature route, server returns typed error in the corresponding result event:
   - `code: 'NOT_AVAILABLE'`
   - `retryable: false`
   - `suggestion: 'Enable required feature flag first.'`
2. Client renders the error and does not retry automatically.

## 6.5 Message Ownership and Cycle A Scope

| Message | Phase Owner | Cycle A Runtime | Cycle A Parse-Only | Required Flag |
|---|---|---|---|---|
| `git_status_request` / `git_status` | P1 | yes | no | `gitReadStatus` |
| `git_diff_stat_request` / `git_diff_stat` | P2 | yes | no | `gitWriteFlow` |
| `git_commit_request` / `git_commit_result` | P2 | yes | no | `gitWriteFlow` |
| `git_push_request` / `git_push_result` | P2 | yes | no | `gitWriteFlow` |
| `git_pr_request` / `git_pr_result` | P2 | yes | no | `gitWriteFlow` |
| `git_operation_status_request` / `git_operation_status` | P2 | yes | no | `gitWriteFlow` |
| `tool_approval_request` / `tool_approval_response` | P4 | no | yes | `toolApprovalBlocking` |
| `preview_request` / `preview_response` | P5 | no | yes | `streamingEnhancements` |
| `tool_progress` | P5 | no | yes | `streamingEnhancements` |

## 6.6 Request/Flag/Error Contract

| Request Type | If Required Flag Off | Response Event Type | Emitted Error Code | Retry Policy | UI Behavior |
|---|---|---|---|---|---|
| `git_status_request` | reject | `git_status` | `NOT_AVAILABLE` | none | hide git state + show unavailable hint |
| `git_diff_stat_request` | reject | `git_diff_stat` | `NOT_AVAILABLE` | none | keep confirm panel closed |
| `git_commit_request` | reject | `git_commit_result` | `NOT_AVAILABLE` | none | show action-disabled message |
| `git_push_request` | reject | `git_push_result` | `NOT_AVAILABLE` | none | show action-disabled message |
| `git_pr_request` | reject | `git_pr_result` | `NOT_AVAILABLE` | none | show action-disabled message |
| `git_operation_status_request` | reject | `git_operation_status` | `NOT_AVAILABLE` | none | show unknown-state guidance |

Cycle A note: `tool_approval_request`, `tool_approval_response`, `preview_request`, `preview_response`, and `tool_progress` remain parse-only and have no runtime routing in this cycle.

## 7. Cycle A Design (Normative: P0-P2)

## P0: Protocol + Flags + Correlation

Deliverables:
1. Implement Cycle A runtime schemas/routes:
   - `git_status_request`, `git_diff_stat_request`, `git_commit_request`, `git_push_request`, `git_pr_request`, `git_operation_status_request`
   - `git_status`, `git_diff_stat`, `git_commit_result`, `git_push_result`, `git_pr_result`, `git_operation_status`
2. Add schema-only parse coverage (no runtime routing yet) for later-cycle message types:
   - `tool_approval_request`, `tool_approval_response`, `preview_request`, `preview_response`, `tool_progress`
3. Add `featureFlags` service with versioned persistence through `StorageAdapter`.
4. Enforce `correlationId` and `operationId` handling for write flows.

Acceptance:
1. Parse success/failure tests for each new message/event schema.
2. `wrapEvent` supports all event types.
3. Feature flags read/write/default verified.

## P1: Git Read Path

Behavior:
1. Add `git_status_request` handling in ws server.
2. Refresh on mount, visibility regain, post-write success, and 15s polling.
3. Non-repo paths produce `available=false` with no crash/no hang.

Timeout:
- hard timeout 5s.

Acceptance:
1. Title bar shows branch/dirty/ahead-behind in repo.
2. Non-git directories hide git info gracefully.

## P2: Git Write Path

Deterministic flow:
1. User action -> confirm panel.
2. Optional precheck/diff stat request.
3. Confirm -> write request (`operationId`, `correlationId`).
4. Server lock + command execute (10s timeout).
5. Return typed terminal result.

Lock rule:
- one write op per cwd at a time.

Unknown-state recovery:
1. If disconnect/timeout leaves final state uncertain, UI marks operation `unknown`.
2. UI must call `git_operation_status_request` before allowing retry.
3. Retry is blocked while status remains `pending` or `unknown`.
4. If status is `failed`, retry allowed with new `operationId`.
5. If status remains `unknown`, UI fetches recovery context in this order:
   - `git_status_request` (branch/dirty/ahead/behind)
   - `git_diff_stat_request` (current diff summary)
6. If status remains `unknown` after 2 recovery checks spaced by >=10s, UI transitions to `manual_reconcile_required` and allows user-confirmed retry with a new `operationId`.
7. Manual reconcile prompt must render the fetched branch/diff summary before user confirmation.
8. Precedence rule: Step 6 is the only allowed exception to Step 3 (`unknown` retry block).

PR fallback:
- on `gh` unavailable, return `manualCommand` + actionable suggestion.

Acceptance:
1. Commit/push/pr all require confirmation UI before request dispatch.
2. Concurrent writes for same `cwd` return `LOCK_CONFLICT`.
3. Duplicate `operationId` returns:
   - `git_operation_status(state='pending')` when original op is pending
   - same cached terminal `git_*_result` when original op is terminal
4. Unknown-state flow reaches either recovered terminal state or `manual_reconcile_required` within 2 recovery checks (>=10s spacing).
5. `gh` unavailable path returns copyable `manualCommand`.

## 8. Error Handling and Recovery

| Error Code | Trigger Condition | Typical Response Event | Retry Policy | Client Handling |
|---|---|---|---|---|
| `VALIDATION_ERROR` | pre-route validation failure (unknown type, missing envelope fields, missing connection context) | `error` | no auto-retry | show validation error and stop current flow |
| `VALIDATION_ERROR` | request-bound payload validation failure (id mismatch, fingerprint mismatch, path boundary failure) | matching typed result event with same `correlationId` | no auto-retry | show inline validation error on the related operation |
| `TIMEOUT` | command exceeded timeout (5s read, 10s write) | matching typed result event | manual retry allowed | show timeout state + retry button |
| `LOCK_CONFLICT` | write op attempted while same cwd lock held | corresponding `git_*_result` (`success=false`) | retry after lock release | show conflict message and disable duplicate action briefly |
| `NOT_AVAILABLE` | request hits route behind disabled flag | event type defined in Section 6.6 | no auto-retry | show flag-disabled message and stop flow |
| `EXEC_FAILED` | git/gh command exits non-zero with stderr | corresponding `git_*_result` (`success=false`) | manual retry allowed | show stderr excerpt and recovery suggestion |
| `UNKNOWN_STATE` | restart/disconnect prevents final status resolution | `git_operation_status` | status recovery required | request `git_operation_status` and route to manual reconcile policy |

Additional rules:
1. Late events for completed operations are ignored by reducer.
2. Unknown-state flows must reach terminal state or UI-local `manual_reconcile_required`.
3. Pre-route malformed requests must emit `error` event with `error.code='VALIDATION_ERROR'`.
4. `DENIED` is reserved for Cycle B (`toolApprovalBlocking`) and is parse-only in Cycle A.

## 9. Verification Strategy

## Unit

1. StreamEvent schemas for every event in 6.3.
2. Validator schemas for Cycle A runtime commands in 6.5.
3. Parse-only schema tests for later-cycle messages in 6.5 (`tool_approval_*`, `preview_*`, `tool_progress`) without routing assertions.
4. Correlation/operation/approval identity matching.
5. Feature flag schema + storage behavior.
6. Git lock/idempotency/status-recovery behavior.

## Integration

1. Ws route tests for git status/diff/commit/push/pr/status-recovery.
2. PR fallback output contract tests.
3. Flag-disable-mid-operation test (`gitWriteFlow` toggled off while write pending) validates completion + recovery semantics.

## E2E (Playwright)

1. Git read status UI states.
2. Confirmed commit/push/pr flows.
3. Lock conflict user-visible error.
4. PR fallback copy command.

## Performance Verification (required)

For Cycle A merge, CI must assert:

1. TTFT p95 < 300ms.
2. Input echo p95 < 16ms.
3. 200-message session FPS p95 > 50.

Failing any threshold blocks phase enable.

## 10. Rollout and Rollback

1. Flags default off.
2. Enable order: dev -> beta -> broad.
3. Rollback action: disable current phase flag while honoring dependency order in Section 6.4.
4. Phase owner maintains rollback checklist and can disable within minutes.
5. In-flight write rollback rule: disabling `gitWriteFlow` does not cancel already-running writes; completion/result and status-recovery endpoints stay available until those operations reach terminal or `manual_reconcile_required`.
6. Rollback checklist template:
   - identify impacted flag
   - disable dependents if required
   - confirm error rate and perf recovery in telemetry
   - post incident summary to activity log

## 11. Appendix B: Later Cycles Summary (Non-Normative for next plan)

## Cycle B (P3-P4)

1. P3: correlated Git result cards + activity stream integration.
2. P4: self-managed tool approval blocking with `approvalId` keyed map.
3. Cycle B integration tests include approval handshake allow/deny/timeout/disconnect.

## Cycle C (P5-P6)

1. P5: markdown block flush + tool progress + preview cache (500ms debounce, TTL 60s, max 100 LRU).
2. P6: slash command storage migration (`v1-to-v2`) + `/review /doctor /bug /config` + Cmd+K palette.

Migration notes for P6:
1. Backup legacy record into `_backup_v1` key before migration.
2. Migration file name follows rule: `src/migrations/v1-to-v2.ts`.

## 12. Definition of Ready

Ready for implementation planning when:

1. No placeholders or undefined contracts remain.
2. Cycle A scope is isolated from later cycles.
3. Protocol, rollback, and performance checks are testable.
4. User confirms this document as planning baseline.
