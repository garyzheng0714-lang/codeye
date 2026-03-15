# Protocol-First Rollout Design (P0-P6)

- Date: 2026-03-15
- Status: Approved for design phase
- Owner: Codeye team
- Scope: Protocol layer, storage layer, git command system, tool approval, streaming UX, command UX

## 1. Problem Statement

Current gaps in the codebase:

1. Git write actions are AI-prompt driven rather than deterministic server execution.
2. Tool approval UI exists, but there is no true server-side blocking handshake for self-managed tools.
3. Slash command persistence uses direct `localStorage` wrappers instead of `StorageAdapter` + schema migration.
4. New capabilities lack feature-flagged rollout boundaries for safe rollback.

This design defines a protocol-first, vertical-slice implementation path that preserves rollback safety and avoids partial decorative features.

## 2. Goals and Non-Goals

## Goals

1. Introduce typed, versioned StreamEvent contracts for all new interactions before UI behavior changes.
2. Deliver Git capability as an end-to-end vertical slice:
   - P1 read path (status)
   - P2 write path (commit/push/pr deterministic execution)
   - P3 result visualization and activity integration
3. Deliver real blocking approval for self-managed tools in P4.
4. Upgrade command persistence to `StorageAdapter` + `_schemaVersion` + migration in P6.
5. Ensure each phase is feature-flag guarded and instantly roll-backable without code rollback.

## Non-Goals

1. No remote bridge implementation (Phase 7 remains out of scope).
2. No fourth Zustand store.
3. No direct `localStorage`/IndexedDB usage for new persisted domains.
4. No CLI-internal tool interception beyond existing `--permission-mode` behavior.

## 3. Hard Constraints

1. Keep store count at 3: `chatStore`, `sessionStore`, `uiStore`.
2. Follow module layering: `types -> services -> hooks -> stores -> components`.
3. Persisted data must include `_schemaVersion`.
4. New behavior must not regress performance SLOs:
   - TTFT < 300ms
   - input echo < 16ms
   - 200+ message FPS > 50
5. Web and desktop behavior must both degrade safely.

## 4. Recommended Delivery Strategy

Recommended strategy: **Protocol first + two parallel vertical lines after P0**.

1. Foundation line: P0
2. Git line: P1 -> P2 -> P3
3. Experience line: P4 -> P5 -> P6

Reasoning:

1. P0 standardizes contracts, reducing coupling risk in later phases.
2. Git line yields user-visible deterministic value quickly.
3. Experience line can progress in parallel after protocol stabilization.
4. Feature flags bound blast radius per phase.

## 5. System Boundaries and Units

## Unit A: Stream Contract Unit

Purpose:
- Define and validate all new `StreamEvent` types.

Primary files:
- `src/types/streamEvent.ts`
- `server/streamEvent.ts`
- `server/validators.ts`

Interface:
- Input: raw ws payload / server route payload
- Output: validated typed events

## Unit B: Feature Flag Unit

Purpose:
- Provide runtime kill switches for newly introduced feature entry points.

Primary file:
- `src/services/featureFlags.ts`

Interface:
- `isEnabled(flag)`
- `setFlag(flag, value)`
- `loadFlags()` with schema versioning

## Unit C: Git Execution Unit

Purpose:
- Deterministic Git read/write operation handling with timeout, cancellation, and lock.

Primary files:
- `server/gitHandler.ts` (new)
- `server/claude-proxy.ts`
- `electron/ipc/projects.ts` (desktop read path parity checks)

Interface:
- Message in: `git_status_request`, `git_diff_stat_request`, `git_commit_request`, `git_push_request`, `git_pr_request`
- Event out: corresponding `git_*` result events with `correlationId`

## Unit D: Approval Handshake Unit

Purpose:
- Block self-managed tool execution until user decision or timeout.

Primary files:
- `server/realHandler.ts`
- `src/hooks/useClaudeChat.ts`
- `src/stores/chatStore.ts`
- `src/components/Chat/ToolApproval.tsx`

Interface:
- `tool_approval_request` <-> `tool_approval_response`

## Unit E: Command Persistence Unit

Purpose:
- Migrate slash command persistence to `StorageAdapter` and versioned schema.

Primary files:
- `src/data/slashCommands.ts`
- `src/migrations/v1-custom-commands.ts` (new)
- `src/migrations/migrationRunner.ts`

Interface:
- versioned read/write APIs for command data

## 6. Protocol Design (P0)

## 6.1 New Stream Events

All events remain `{ version, type, payload }` and add `correlationId` where request/response pairing is required.

Git family:
- `git_status`
- `git_diff_stat`
- `git_commit_result`
- `git_push_result`
- `git_pr_result`

Approval family:
- `tool_approval_request`
- `tool_approval_response`

Preview family:
- `preview_response`

Tool progress family:
- `tool_progress`

## 6.2 Correlation Policy

1. Frontend generates UUID `correlationId` for write/async request flows.
2. Server returns same `correlationId` in response event.
3. UI renders result only into matching card state.
4. Non-correlated events remain session-scoped and do not update operation cards.

## 6.3 Feature Flag Design

Versioned storage document:

```ts
interface FeatureFlagDocumentV1 {
  _schemaVersion: 1;
  flags: {
    gitConfirmPanel: boolean;
    toolApproval: boolean;
    streamingMarkdown: boolean;
    commandPalette: boolean;
  };
  updatedAt: number;
}
```

Flag defaults:
- `gitConfirmPanel: true`
- `toolApproval: false`
- `streamingMarkdown: false`
- `commandPalette: false`

Guard rule:
- Every new entry point must call `isEnabled(flag)` before invoking behavior.

Rollback rule:
- Turning a flag off disables entry and preserves stored state without mutation.

## 7. Phase-by-Phase Design

## P1: Git Read Path

Behavior:
1. Add `git-status` route for browser ws mode.
2. Keep desktop parity with existing IPC-based status retrieval.
3. Refresh triggers:
   - initial mount
   - window visibility regain
   - successful git write completion
   - 15s fallback polling

UI:
- Branch badge
- Dirty dot
- Ahead/behind counter
- Hide git block when repo unavailable

Failure handling:
- 5s timeout returns explicit error event/state
- Non-git directory returns `available=false` without noisy error

## P2: Git Write Path

Flow pattern for commit/push/pr:
1. User action opens confirm panel.
2. Pre-checks executed server-side.
3. User confirms explicit command payload.
4. Server executes deterministic git/gh command with 10s timeout.
5. Result event emitted with `correlationId`.

Required guarantees:
1. Workspace-level lock (`Map<cwd, PromiseLike>`) allows only one write op at a time.
2. Concurrent write attempts fail fast with actionable error.
3. No write path is executed via AI prompt.

PR fallback:
- If `gh` unavailable, return deterministic `manualCommand` and doc link.
- UI provides one-click copy.

## P3: Git Result Visualization

Result card model:
- correlated
- operation typed
- status typed
- optional recommendation text

Activity integration:
- Push `git_action` entries for every completed git operation.
- Include metadata for operation type, status, and correlation id.

Deduping:
- Card id = `correlationId`
- Activity id remains stream-generated UUID

## P4: Tool Approval True Blocking (Self-Managed Tools Only)

Scope for blocking:
1. Self-managed tools introduced by Codeye server routes (git write, preview, and future local custom tools).
2. Claude CLI built-in tool approvals remain governed by existing CLI `--permission-mode` and are not intercepted.

Server algorithm:
1. On guarded tool request, emit `tool_approval_request` with `approvalId`, `requestId`, payload summary.
2. Store pending resolver in map.
3. Await response up to 120s.
4. On allow: execute tool.
5. On deny or timeout: return deny result and notify frontend.

Safety:
- Every pending approval map entry is cleaned on completion, timeout, or socket close.

## P5: Streaming UX

C1 Incremental markdown:
1. Flush closed blocks immediately.
2. Keep incomplete tail as raw with cursor marker.
3. Reconcile on next chunk.

C2 Tool progress:
1. Emit `tool_progress` lines while long-running tools execute.
2. Append live output in `ToolCall` display.
3. Show elapsed timer.

C3 Context preview:
1. Hover `#file` / `#git_diff` pill.
2. Trigger throttled preview request (500ms).
3. Cache preview by key and ttl.

Performance guard:
- Integrate with existing `StreamBatcher` boundaries (16ms/50ms/32KB).

## P6: Command UX

D1 Storage migration:
1. Replace `jsonStorage` usage in slash command persistence with `StorageAdapter` backed read/write.
2. Add custom command schema with `_schemaVersion: 1`.
3. Provide migration from legacy plain array storage.

D2 New slash commands:
- `/review`
- `/doctor`
- `/bug`
- `/config`

D3 Command palette:
1. Rebind `Cmd+K` from clear-conversation to command palette open.
2. Keep clear conversation via explicit action inside palette (and optionally alternate shortcut).
3. Include git actions, session actions, settings actions, slash commands.

## 8. Error Handling and Recovery

1. Every protocol parse failure is dropped safely and logged in dev mode.
2. Every server command timeout returns typed error payload.
3. Lock contention returns deterministic error string and recommendation.
4. Approval timeout returns deny decision with reason `timeout`.
5. Manual PR fallback includes command and install link.

## 9. Testing Strategy

## Unit tests

1. `streamEvent` schema parse success/failure per new event.
2. `featureFlags` default/load/save and invalid payload fallback.
3. git parser functions and lock behavior.
4. migration tests for custom commands (legacy -> v1).
5. correlation matching logic in event handlers.

## Integration tests

1. server route request/response for git read/write.
2. approval handshake lifecycle (allow/deny/timeout).
3. tool progress stream append behavior.

## Playwright tests

1. Git status visual states.
2. Confirm panel commit/push/pr flows.
3. PR fallback copy command flow.
4. Activity Git filter receives events.
5. Cmd+K opens command palette and executes selected action.
6. Desktop + 375px mobile screenshots for each phase entry UI.

## 10. Rollout and Rollback

1. Merge in phase order with flags default-off except where explicitly safe.
2. For each phase, enable in dev -> beta cohort -> broad release.
3. If incident occurs, disable phase flag only; no emergency revert required.
4. Keep migration additive and backward-compatible for 2 major versions.

## 11. Risks and Mitigations

1. Risk: Protocol drift between frontend and server.
   - Mitigation: shared schema file + mandatory parse tests.
2. Risk: Lock deadlock on write path.
   - Mitigation: timeout + finally cleanup.
3. Risk: Cmd+K behavior regression for existing users.
   - Mitigation: migrate clear action into palette and document new shortcut behavior.
4. Risk: Approval queue leaks on disconnect.
   - Mitigation: close handler flush + deny pending approvals.

## 12. Execution Readiness Criteria

This spec is ready for implementation planning when:

1. All sections have concrete decisions (no placeholders).
2. Scope is explicitly bounded (no Phase 7 work).
3. Contract, storage, rollout, and test obligations are fully specified.
4. User confirms this written spec as baseline.

