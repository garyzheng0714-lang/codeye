# Sidebar Redesign — Codex-Style Session Management

## Goal

Completely redesign the left sidebar session list to match Codex's clean, flat, section-header-based pattern. Fix the three core pain points: (1) lag/stuttering on open and switch, (2) unclear visual hierarchy between folders and sessions, (3) CLI session sync reliability.

## Design Reference

Codex (Claude's official desktop app) sidebar pattern:
- Projects as **section dividers** (folder icon + name), not collapsible "containers"
- Sessions as **flat list items** (title + right-aligned relative time)
- Active session highlighted with subtle tint + icon, no time shown
- Hover reveals archive button; archive has confirm step
- Folder expand/collapse via click, icon changes between filled (open) / outline (closed)
- Collapsed folder shows session count badge

## Architecture

### Component Structure

```
Sidebar (memo)
├── SidebarHeader         — title "Sessions" + new session button
├── SidebarSearch         — search input (unchanged)
├── SessionList (memo)    — scrollable container
│   └── ProjectGroup[]    — one per folder
│       ├── ProjectHeader — folder icon + name + count (clickable to collapse)
│       └── SessionRow[]  — flat session items
│           ├── default   — title + time
│           ├── hover     — title + archive button
│           ├── confirm   — title + red Confirm button
│           └── active    — purple bg + link icon + title
└── SidebarFooter         — workspace path (unchanged)
```

### New Components (replace SessionList.tsx)

1. **`ProjectHeader`** — Stateless, renders folder icon (filled when open, outline when closed) + project name + optional count badge. Click toggles collapse.

2. **`SessionRow`** — Wrapped in `memo`. Receives `session`, `isActive`, `isConfirming`, `onSelect`, `onArchiveClick`, `onConfirm`, `onCancelConfirm` as props. All callbacks passed from parent via `useCallback`. Renders one session with states: default, hover (archive button), confirming (red confirm), active (purple tint + icon). No dots, no subtitle line, no chevrons.

3. **`SessionList`** (rewrite) — Manages collapse state (`collapsedFolderIds: Set<string>`) and archive confirm state (`confirmingSessionId: string | null`). Maps folders → ProjectHeader + SessionRow[]. Wrapped in `memo`. Uses individual Zustand selectors for `folders`, `sessions`, `activeFolderId`, `activeSessionId`.

### Removed Elements

| Element | Why |
|---------|-----|
| Session dots (6px circles) | Visual noise, no information value |
| Uppercase folder names + letter-spacing | Makes folders look like "labels" not "containers" — confusing |
| Chevron arrows (▶/▼) | Folder icon fill/outline is sufficient and cleaner |
| Subtitle line (model · msgs · cost) | Information overload in the list; accessible via chat panel |
| Staggered rowReveal animation | Source of perceived lag; items should appear instantly |
| Context menu (right-click) | Archive is the only needed action; rename via double-click stays |
| `--session-idx` CSS variable animation | Causes layout thrashing on folder expand |

### New/Changed Elements

| Element | Description |
|---------|-------------|
| Flat session rows | No indentation dots, just left-padding under folder |
| Right-aligned compact time | `1h`, `3d`, `1w` format — disappears for active session |
| Archive (not Delete) | Softer language; hover → archive icon → click → red Confirm |
| Filled/outline folder icon | Open = filled SVG, closed = stroke-only SVG |
| Active session link icon | Purple link/chain SVG at left, purple background tint |
| Collapse count badge | Collapsed folder shows session count on the right |
| Header "Sessions" + new button | Replace current per-folder "+" buttons with single top-level button |

## Visual Spec

### Colors

All values use existing CSS variables from `tokens.css` which already resolve correctly in both dark and light themes. The hex values below are the dark mode resolved values for reference only — implementation MUST use the variable names, not hex.

| Element | Color |
|---------|-------|
| Folder name | `--text-secondary` (#9a9aa0) |
| Folder name (collapsed) | `--text-muted` (#68686e) |
| Folder icon (open) | `--text-muted` (#68686e) filled |
| Folder icon (closed) | `--text-muted` (#68686e) stroke-only |
| Session title | `--text-secondary` (#9a9aa0) |
| Session title (hover) | `--text-primary` (#ededef) |
| Session title (active) | `--text-primary` (#ededef), font-weight 500 |
| Session title (old, >3d) | `--text-muted` (#68686e) |
| Time label | `--text-disabled` (#454548) |
| Active row bg | `rgba(168,85,247,0.08)` |
| Active icon | `--accent` (#a855f7) |
| Hover row bg | `rgba(255,255,255,0.04)` |
| Archive button bg | `--bg-secondary` (#1e1e24) |
| Confirm button | `rgba(248,113,113,0.12)` bg, `--danger` (#f87171) text |
| Count badge | `--border-strong` (#38383e) |

### Spacing

| Element | Value |
|---------|-------|
| Header padding | 14px 16px 8px |
| Search padding | 0 12px 8px |
| Folder header padding | 10px 8px 4px (first), 14px 8px 4px (subsequent — extra top gap) |
| Session row padding | 9px 12px 9px 28px |
| Session row border-radius | 8px |
| Session row gap | 1px margin |
| Time label margin-left | 12px |
| Archive button size | 24x24px |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Header "Sessions" | 13px | 600 |
| Folder name | 12px | 500 |
| Session title | 13px (`--text-base`) | 400 (500 when active) |
| Time label | 11px (`--text-xs`) | 400 |
| Count badge | 10px | 400 |

### Time Format

Compact relative time, no "ago" suffix:
- < 1 hour: `Xm` (e.g., `2m`, `45m`)
- < 24 hours: `Xh` (e.g., `1h`, `12h`)
- < 7 days: `Xd` (e.g., `1d`, `6d`)
- < 30 days: `Xw` (e.g., `1w`, `3w`)
- ≥ 30 days: `Mo D` (e.g., `Feb 3`)
- Active session: no time shown

### Transitions

| Transition | Duration | Easing |
|-----------|----------|--------|
| Row hover bg | 120ms | ease-out |
| Row text color on hover | 120ms | ease-out |
| Archive button opacity | 120ms | ease-out |
| Folder collapse (grid-template-rows) | 200ms | cubic-bezier(0.16,1,0.3,1) |
| Archive → Confirm swap | 150ms | ease-out |

**Removed**: staggered rowReveal (250ms per row × 30ms delay), dotPulseIn (400ms). These caused perceivable lag on folder open.

## Interactions

### Session Click
1. If streaming, stop current stream
2. Save current session state to sessionStore
3. Load clicked session into chatStore
4. Update active indicators

### Folder Click
1. Toggle collapsed state (local component state)
2. If first expand and `!hasSyncedClaudeHistory`, trigger CLI sync
3. Animate expand/collapse via `grid-template-rows: 0fr ↔ 1fr`

### Archive Flow
1. **Hover** → archive icon button slides in from right (opacity 0→1, translateX 4px→0)
2. **Click archive** → button replaced by red "Confirm" text button
3. **Click Confirm** → session removed from list (calls `deleteSession` — permanent removal, "archive" is UI-only softer language)
4. **Click elsewhere or Escape** → cancel, return to default state
5. If archived session was active → clear chat, show WelcomeScreen (same as current empty state)
6. **Double-click during confirm** → cancel confirm state, enter rename mode
7. **Search input while confirming** → cancel confirm state

### Rename (unchanged)
- Double-click session → inline input appears
- Enter to commit, Escape to cancel

### Search (unchanged behavior, simplified display)
- Filters sessions by title match
- When searching, all folders auto-expand
- No match → empty state

## CLI Sync Improvements

The previous implementation plan (2026-03-15-session-sync-and-perf.md) added `fs.watch` for real-time sync. This redesign ensures the sync UX is clean:

1. **Sync indicator**: Folder shows pulsing purple dot + "syncing" text while importing
2. **New sessions appear immediately**: After import, new sessions render at top of the folder's list
3. **No full re-render**: importClaudeSessions updates sessionStore, SessionList re-renders only the affected ProjectGroup

## Performance Guarantees

1. **SessionList and SessionRow wrapped in `memo`** — only re-render when own props change
2. **Individual Zustand selectors** — no destructured store access
3. **No staggered animations** — items appear instantly on folder expand
4. **Collapse uses CSS grid animation** — no JS layout calculation
5. **Archive confirm is local state** — no store update until confirmed
6. **`contain: layout paint`** on sidebar-content — isolates layout/paint (not `contain: strict` to avoid requiring explicit size on flex child)

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/Session/ProjectHeader.tsx` | **Create** — folder section header |
| `src/components/Session/SessionRow.tsx` | **Create** — single session item |
| `src/components/Session/SessionList.tsx` | **Rewrite** — compose ProjectHeader + SessionRow |
| `src/styles/components/session-list.css` | **Rewrite** — new styles matching spec |
| `src/components/Layout/Sidebar.tsx` | **Simplify** — remove sync logic moved to SessionList |
| `src/utils/timeFormat.ts` | **Create** — compact relative time formatter (locale-neutral, no i18n needed for `Xm/Xh/Xd/Xw` format) |

## Edge Cases

- **Empty folder**: Show nothing (no "Start one" prompt). New session is created via header "+" button, always targets the active folder.
- **Session title >3 days old**: Text color dims to `--text-muted` based on `updatedAt`.
- **Scroll position**: Preserved via native browser scroll restoration. No custom logic needed since the list is a single scrollable `<div>`.
- **Focus ring**: Carry forward existing `:focus-visible` styling (`outline: 2px solid var(--accent)`, `outline-offset: -2px`).
- **Add Folder button**: Moves from sidebar header to a "+" at the bottom of the session list (below last folder), keeping the header clean.

## Out of Scope (Future)

- Timeline view (chronological cross-project, like Codex's "时间顺序列表")
- Sort options (created vs updated)
- Filter: "All threads" vs "Related/Starred"
- Drag-and-drop session reordering
- Keyboard arrow-key navigation between session rows
- Light mode fine-tuning (CSS variables auto-resolve, but visual review deferred)
