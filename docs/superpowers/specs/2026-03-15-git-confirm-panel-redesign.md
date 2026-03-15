# Git Confirm Panel Redesign

- Date: 2026-03-15
- Status: Design approved
- Scope: Redesign GitConfirmPanel into unified commit flow

## 1. Problem

Current GitConfirmPanel only handles commit with a required message. Push and PR are separate flows triggered from GitActionMenu dropdown. This is fragmented — users must navigate multiple entry points for a common workflow (commit → push → PR).

## 2. Goals

1. Merge commit/push/PR into a single unified panel with "next step" selection.
2. Add branch info and change statistics display.
3. Add "include unstaged changes" toggle (`git add -A` before commit).
4. Allow empty commit message — auto-generate via Claude when left blank.

## 3. Non-Goals

1. No color scheme changes in this spec (deferred).
2. No new git operations beyond existing commit/push/PR.

## 4. Design

### Panel Layout (top to bottom)

1. **Header**: commit icon + "Commit" label (uppercase, muted) + close button
2. **Title**: "提交更改" (bold, 20px)
3. **Branch row**: label "分支" + branch icon + branch name (from `useGitStatus`)
4. **Changes row**: label "更改" + file count + `+insertions` (green) + `-deletions` (red) (from diff stat)
5. **Unstaged toggle**: glass-surface row with toggle switch + "包含未暂存的更改" label
6. **Commit message**: label "提交消息" + text input, placeholder "留空以自动生成提交消息"
7. **Next steps**: label "后续步骤" + 3 radio-style options:
   - 提交 (commit only) — default selected
   - 提交并推送 (commit + push)
   - 提交并创建 PR (commit + push + PR)
8. **Submit button**: full-width "继续" button

### Behavior

**On "继续" click:**

1. If unstaged toggle is ON, server executes `git add -A` before commit.
2. If commit message is empty, call Claude to generate message from diff, then commit directly (no confirmation step).
3. Execute commit.
4. If "提交并推送" selected, automatically push after successful commit.
5. If "提交并创建 PR" selected, push then create PR after successful commit.
6. Show progress states: loading → success/error for each step.

**Auto-generate commit message:**

- Send diff summary to Claude with prompt: "Generate a concise conventional commit message for these changes."
- Use the existing `sendClaudeQuery` flow or a lightweight server endpoint.
- Practical approach: server-side `git diff --cached --stat` → construct a simple conventional commit message without AI (e.g., "feat: update N files (+X -Y)"). AI-generated messages can be added later.

**Unstaged toggle behavior:**

- When ON: server runs `git add -A` in cwd before `git commit`.
- When OFF: only commit already-staged changes (current behavior).
- Default: ON (matches the reference screenshot).

### Data Flow

```
GitConfirmPanel
  ├─ useGitStatus() → branch, dirty, ahead, behind
  ├─ diff stat request → file count, insertions, deletions
  ├─ user input: message, unstaged toggle, next step selection
  └─ on submit:
       ├─ [if unstaged toggle ON] git_add_request → server git add -A
       ├─ [if message empty] auto-generate message
       ├─ git_commit_request → server commit
       ├─ [if push selected] git_push_request → server push
       └─ [if PR selected] git_pr_request → server PR
```

### Protocol Changes

New request type needed for `git add -A`:

```ts
type GitAddRequest = CorrelatedStreamEvent<{
  cwd: string;
  operationId: string;
  all: boolean; // true for git add -A
}> & { type: 'git_add_request' };

type GitAddResult = CorrelatedStreamEvent<{
  operationId: string;
  success: boolean;
  error?: ErrorPayload;
}> & { type: 'git_add_result' };
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/Chat/GitConfirmPanel.tsx` | Complete rewrite — unified layout |
| `src/styles/components/git-confirm.css` | Update styles for new layout |
| `src/components/Layout/GitActionMenu.tsx` | Simplify — single "Submit" button opens unified panel |
| `server/gitHandler.ts` | Add `executeGitAdd` function |
| `server/claude-proxy.ts` | Route `git_add_request` |
| `src/types/git.ts` | Add `gitAddRequestPayloadSchema` and `gitAddResultPayloadSchema` |
| `src/types/streamEvent.ts` | Add `git_add_request` and `git_add_result` event types |

### Constraints

- Panel renders as modal overlay (same as current).
- Must work in Web mode (no Electron-specific APIs).
- Respects existing feature flag `gitWriteFlow`.
- No new Zustand store (state managed locally in component).

## 5. Testing

1. Unit: `executeGitAdd` with staged/unstaged scenarios.
2. Unit: auto-generate commit message logic.
3. Unit: panel state machine (step selection → submit → progress → result).
4. Integration: commit-only, commit+push, commit+push+PR flows.
