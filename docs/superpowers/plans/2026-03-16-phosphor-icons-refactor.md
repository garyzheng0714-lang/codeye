# Phosphor Icons + Tool Card Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all tool-call icons with Phosphor Icons (bold weight), add Task Module component, align card width with input box, update demo page, and ensure light theme is primary.

**Architecture:** Swap icon library in toolIcons.tsx, unify all tool-call rendering to use semantic Phosphor icons instead of generic StepStatusCircle dots. Add TaskBlock for Agent/Task tools. Ensure layout alignment between message cards and input area. Clean up dead CSS.

**Tech Stack:** @phosphor-icons/react (bold weight), React, CSS custom properties

---

## Current State Assessment

### Already Done (from previous session)
- [x] Installed `@phosphor-icons/react`
- [x] Rewrote `src/data/toolIcons.tsx` to use Phosphor (bold)
- [x] Rewrote `src/components/Chat/ToolCall.tsx` — removed StepStatusCircle, unified ToolIcon for all tools
- [x] Rewrote `src/components/Chat/AIMessage.tsx` — ToolIcon + TaskBlock + ReadGroup
- [x] Rewrote `src/styles/components/tool-call.css` — removed kiro-status, added task-module, light theme
- [x] Changed message-list padding to match input-area (var(--space-6))
- [x] Created `src/components/Demo/IconPreview.tsx` demo page
- [x] TypeScript compiles clean (`tsc --noEmit` passes)

### Remaining Issues Found by Audit

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | KiroStyleDemo.tsx uses dead StepStatusCircle + kiro-status CSS (classes don't exist in any stylesheet) | Critical | Demo/KiroStyleDemo.tsx |
| 2 | KiroStyleDemo.tsx imports lucide-react ChevronDown/ChevronRight | Medium | Demo/KiroStyleDemo.tsx |
| 3 | `.tool-file-badge` duplicated in messages.css and tool-call.css | Minor | messages.css + tool-call.css |
| 4 | messages.css still has `.kiro-status`-referencing `.tool-block` styles that duplicate tool-call.css | Minor | messages.css |
| 5 | Demo page not updated to showcase NEW Phosphor-based cards | Functional | KiroStyleDemo.tsx |
| 6 | Width alignment not visually verified in actual conversation context | Functional | messages.css + input-area.css |
| 7 | Light theme not verified as primary in actual app | Functional | All CSS |
| 8 | `tokens.css` still has unused `--status-circle-*` variables from old kiro-status | Cleanup | tokens.css |

---

## Chunk 1: Fix KiroStyleDemo to use Phosphor Icons

### Task 1: Rewrite KiroStyleDemo.tsx with Phosphor icons

**Files:**
- Rewrite: `src/components/Demo/KiroStyleDemo.tsx`

- [ ] **Step 1: Rewrite KiroStyleDemo** to use Phosphor icons (Eye, MagnifyingGlass, PencilSimple, TerminalWindow, Robot, CheckCircle, CircleNotch, CaretDown, CaretRight) instead of lucide-react + StepStatusCircle. Import ToolIcon/SpinnerIcon from toolIcons. Mirror the real ToolCall/AIMessage rendering patterns.

- [ ] **Step 2: Verify demo page renders** — navigate to `http://localhost:5180/?demo` and screenshot.

---

## Chunk 2: Clean up duplicate/dead CSS

### Task 2: Remove duplicate .tool-file-badge from messages.css

**Files:**
- Modify: `src/styles/components/messages.css`

- [ ] **Step 1: Remove duplicate `.tool-file-badge`** from messages.css (keep the one in tool-call.css since it has light theme override). Also remove the duplicate `.tool-block` light theme rule from messages.css since tool-call.css handles it.

### Task 3: Remove unused kiro-status CSS variables from tokens.css

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Remove `--status-circle-*` variables** from tokens.css since kiro-status circles are gone.

- [ ] **Step 2: Run `tsc --noEmit`** to verify no breakage.

---

## Chunk 3: Verify width alignment + light theme

### Task 4: Visual verification — width alignment

- [ ] **Step 1: Navigate to main app** at `http://localhost:5180/`
- [ ] **Step 2: Switch to light theme** via settings or JS
- [ ] **Step 3: Screenshot light theme** — verify tool cards and input box are left-right aligned
- [ ] **Step 4: Screenshot dark theme** — same verification

### Task 5: Visual verification — demo pages

- [ ] **Step 1: Screenshot `?demo`** — verify KiroStyleDemo renders correctly with Phosphor icons
- [ ] **Step 2: Screenshot `?demo=icons`** — verify IconPreview still works
- [ ] **Step 3: Compare light/dark** on both demo pages

---

## Chunk 4: Final cleanup + commit

### Task 6: Final checks

- [ ] **Step 1: Run `tsc --noEmit`** — must pass
- [ ] **Step 2: Run `npm run build`** — must succeed (Vite build)
- [ ] **Step 3: Grep for any remaining `StepStatusCircle` or `kiro-status` references** outside of demo — must be zero
- [ ] **Step 4: Verify no hardcoded hex colors** leaked into component TSX files (should use getToolColor or CSS vars)

### Task 7: Commit all changes

- [ ] **Step 1: Stage and commit** with message `feat: replace tool icons with Phosphor bold + add task module + align card width`
