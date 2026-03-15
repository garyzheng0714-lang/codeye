# Fix Historical Message Rendering Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

**Goal:** Fix all historical session messages rendering by supporting every tool name found in JSONL files, remove dead code and web-mode references.

**Architecture:** Extend toolIcons.tsx and toolMeta.ts to cover all real tool names from Claude CLI JSONL. Remove dead ToolCall.tsx. Clean web-mode references from docs.

**Tech Stack:** @phosphor-icons/react, TypeScript

---

## Tool Names Found in JSONL (must all be supported)

| Tool Name | Count | Current Status |
|-----------|-------|----------------|
| Read | 643 | Supported |
| Bash | 460 | Supported |
| Edit | 306 | Supported |
| Glob | 121 | Supported |
| Grep | 111 | Supported |
| TaskUpdate | 81 | MISSING |
| ToolSearch | 69 | MISSING |
| Write | 65 | Supported |
| TaskCreate | 44 | MISSING |
| Agent | 38 | Supported |
| Skill | 14 | MISSING |
| mcp__playwright__browser_take_screenshot | 14 | MISSING |
| mcp__playwright__browser_click | 13 | MISSING |
| mcp__playwright__browser_navigate | 12 | MISSING |
| mcp__exa__web_search_exa | 7 | MISSING |
| WebSearch | 3 | Supported |
| mcp__exa__get_code_context_exa | 3 | MISSING |
| AskUserQuestion | 1 | MISSING |

---

## Chunk 1: Extend tool support + remove dead code

### Task 1: Extend toolIcons.tsx with all missing tools

**Files:**
- Modify: `src/data/toolIcons.tsx`

New icon mappings (Phosphor bold):
- `ToolSearch` → MagnifyingGlass (same as Grep, it's a search tool)
- `TaskCreate` → ListPlus
- `TaskUpdate` → ListChecks
- `Skill` → Sparkle
- `AskUserQuestion` → ChatCircle
- `mcp__playwright__*` → Browser
- `mcp__exa__*` → GlobeSimple (web search)
- Any unknown `mcp__*` → Plug (plugin)

### Task 2: Extend toolMeta.ts with semantic names + colors

**Files:**
- Modify: `src/data/toolMeta.ts`

New entries in semanticNames + getToolColor:
- `ToolSearch` → "Tool search" / blue
- `TaskCreate` → "Create task" / indigo
- `TaskUpdate` → "Update task" / indigo
- `Skill` → "Skill" / purple
- `AskUserQuestion` → "Question" / purple
- `mcp__playwright__*` → dynamic label from name / teal
- `mcp__exa__*` → dynamic label / purple

### Task 3: Delete dead ToolCall.tsx

**Files:**
- Delete: `src/components/Chat/ToolCall.tsx`

Confirmed unused — no imports anywhere.

### Task 4: Remove web-mode references from CLAUDE.md and docs

**Files:**
- Modify: `CLAUDE.md` (remove "Web 模式显示替代提示")
- Modify: `ROADMAP.md` (remove web mode references)

---

## Chunk 2: Verify and commit

### Task 5: Type check + build

- `tsc --noEmit`
- `npm run build`

### Task 6: Visual verification

- Open Electron app, load a historical session with tool calls
- Screenshot to verify icons render correctly

### Task 7: Commit

- Stage all changes
- Commit with conventional message
