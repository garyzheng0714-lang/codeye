# Implementation Plan: Model Selector

## Task Type
- [x] Frontend (UI component + state management)
- [x] Backend (WebSocket protocol + CLI args)
- [x] Fullstack (end-to-end data flow)

## Requirements
Add model switching capability to EasyCode, allowing users to switch between Claude models (Opus 4.6, Sonnet 4.6, Haiku 4.5). Model selection should persist per session, be reflected in StatusBar and slash commands, and be passed to the Claude CLI via `--model` flag.

## Technical Solution

### Architecture Decision: chatStore for model state
Model is a runtime parameter closely tied to chat behavior (like mode), so it belongs in chatStore alongside mode/messages/cost. Not uiStore (which is layout-only).

### Data Flow
```
User selects model (StatusBar dropdown / slash command)
  → chatStore.setModel(modelId)
  → InputArea reads model from store
  → sendClaudeQuery({ prompt, mode, model, ... })
  → WebSocket message to proxy server
  → server validates model against whitelist
  → spawn claude CLI with --model <id>
```

## Implementation Steps

### Step 1: Data Layer — Model Definitions
**File: `src/data/models.ts` (NEW)**
```typescript
export type ModelId = 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-haiku-4-5';

export interface ModelInfo {
  id: ModelId;
  label: string;         // "Opus 4.6"
  shortLabel: string;    // "Opus"
  description: string;   // "Deepest reasoning"
  tier: 'premium' | 'standard' | 'fast';
}

export const MODELS: ModelInfo[] = [
  { id: 'claude-opus-4-6', label: 'Opus 4.6', shortLabel: 'Opus', description: 'Deepest reasoning', tier: 'premium' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', shortLabel: 'Sonnet', description: 'Best for coding', tier: 'standard' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', shortLabel: 'Haiku', description: 'Fastest, lowest cost', tier: 'fast' },
];

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-6';

export function getModelInfo(id: ModelId): ModelInfo {
  return MODELS.find(m => m.id === id) ?? MODELS[1]; // fallback to Sonnet
}
```

### Step 2: State Management — chatStore Extension
**File: `src/stores/chatStore.ts` (MODIFY)**
- Import `ModelId`, `DEFAULT_MODEL` from `../data/models`
- Add to state: `model: ModelId` (default: `DEFAULT_MODEL`)
- Add action: `setModel: (model: ModelId) => void`
- `clearMessages` keeps current model (global preference)
- `loadSession` restores model from session data (with fallback to DEFAULT_MODEL)

```typescript
// New state fields
model: DEFAULT_MODEL,
setModel: (model) => set({ model }),

// loadSession update
loadSession: (data) => set({
  ...existing,
  model: data.model ?? DEFAULT_MODEL,
}),
```

### Step 3: Session Persistence
**File: `src/stores/sessionStore.ts` (MODIFY)**
- Add `model?: ModelId` to `SessionData` interface

**File: `src/utils/session.ts` (MODIFY)**
- Include `model` when saving current session

### Step 4: Backend — WebSocket Protocol + CLI
**File: `src/hooks/useClaudeChat.ts` (MODIFY)**
- `sendClaudeQuery` params: add `model?: string`
- InputArea passes `model` from chatStore

```typescript
export function sendClaudeQuery(
  params: { prompt: string; mode?: string; model?: string; cwd?: string; sessionId?: string }
)
```

**File: `server/claude-proxy.ts` (MODIFY)**
- `QueryMessage` interface: add `model?: string`
- Backend whitelist validation:
```typescript
const ALLOWED_MODELS = new Set([
  'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5',
]);
```
- `handleRealQuery`: add `--model` to CLI args if valid
```typescript
if (msg.model && ALLOWED_MODELS.has(msg.model)) {
  args.push('--model', msg.model);
}
```
- `handleDemoQuery`: reflect model name in demo response

### Step 5: Frontend UI — ModelSelector Component
**File: `src/components/Chat/ModelSelector.tsx` (NEW)**

Placement: **InputArea hint bar** (bottom of input, next to existing hints).

Design: Compact dropdown trigger showing current model short name + tier badge.
- Click opens dropdown with 3 options
- Each option: model label + description + tier indicator
- Disabled during streaming (isStreaming === true)
- Escape closes dropdown
- Click outside closes dropdown

```tsx
// Pseudo-structure
<div className="model-selector">
  <button className="model-selector-trigger" disabled={isStreaming}>
    <ModelIcon />
    <span>{currentModel.shortLabel}</span>
    <TierBadge tier={currentModel.tier} />
    <ChevronIcon />
  </button>
  {open && (
    <div className="model-selector-dropdown">
      {MODELS.map(model => (
        <button
          className={`model-option ${model.id === current ? 'active' : ''}`}
          onClick={() => { setModel(model.id); setOpen(false); }}
        >
          <span className="model-option-label">{model.label}</span>
          <span className="model-option-desc">{model.description}</span>
          <TierBadge tier={model.tier} />
        </button>
      ))}
    </div>
  )}
</div>
```

### Step 6: StatusBar Update
**File: `src/components/Layout/StatusBar.tsx` (MODIFY)**
- Display current model name next to mode badge
- Use `getModelInfo()` to show short label

### Step 7: InputArea Integration
**File: `src/components/Chat/InputArea.tsx` (MODIFY)**
- Import and render `ModelSelector` in input-hint area
- Pass `model` in `sendClaudeQuery` call:
```typescript
sendClaudeQuery({
  prompt: text,
  mode,
  model: useChatStore.getState().model,
  cwd: useChatStore.getState().cwd || undefined,
  sessionId: useChatStore.getState().claudeSessionId || undefined,
});
```

### Step 8: Slash Command Integration
**File: `src/data/slashCommands.ts` (MODIFY)**
- Update `SlashCommand.category` type: add `'model'`
- Add 3 model commands:
```typescript
{ name: 'opus', description: 'Switch to Opus (deepest reasoning)', category: 'model', icon: 'model' },
{ name: 'sonnet', description: 'Switch to Sonnet (best for coding)', category: 'model', icon: 'model' },
{ name: 'haiku', description: 'Switch to Haiku (fastest, lowest cost)', category: 'model', icon: 'model' },
```
- Add `categoryLabels.model = 'Models'`
- Update `SlashCommandPalette.tsx` render order: `['mode', 'model', 'skill', 'action']`

**File: `src/components/Chat/InputArea.tsx` (MODIFY)**
- `handleCommandSelect`: add `model` category handler
```typescript
if (command.category === 'model') {
  const modelMap: Record<string, ModelId> = {
    opus: 'claude-opus-4-6',
    sonnet: 'claude-sonnet-4-6',
    haiku: 'claude-haiku-4-5',
  };
  setModel(modelMap[command.name]);
  setInput('');
  textareaRef.current?.focus();
  return;
}
```

### Step 9: Styles
**File: `src/styles/globals.css` (MODIFY)**
- `.model-selector` — relative container in input-hint area
- `.model-selector-trigger` — compact button with border, Kiro-style radius
- `.model-selector-dropdown` — absolute positioned above trigger, shadow, backdrop-filter
- `.model-option` — hover/active states matching slash-palette style
- `.model-tier-badge` — color-coded tier indicators:
  - premium: purple (#9b6dff)
  - standard: blue (#5865f2)
  - fast: green (#23a55a)
- Disabled state during streaming (opacity reduction)
- Mobile: dropdown full-width on small screens

### Step 10: E2E Tests
**File: `tests/pages/ChatPage.ts` (MODIFY)**
- Add locators: `modelSelector`, `modelDropdown`, `modelOptions`
- Add methods: `openModelSelector()`, `selectModel()`, `currentModelLabel()`

**File: `tests/e2e/features/model-selector.spec.ts` (NEW)**
Test cases:
1. Model selector is visible and shows default "Sonnet"
2. Clicking trigger opens dropdown with 3 options
3. Selecting Opus updates trigger label and status bar
4. Slash command `/opus` switches model
5. Model selector is disabled during streaming (if testable in demo mode)
6. Escape closes the dropdown
7. Click outside closes the dropdown

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `src/data/models.ts` | Create | Model definitions, types, constants |
| `src/stores/chatStore.ts` | Modify | Add model state + setModel action |
| `src/stores/sessionStore.ts` | Modify | Add model to SessionData |
| `src/utils/session.ts` | Modify | Save model in session |
| `src/hooks/useClaudeChat.ts` | Modify | Pass model in sendClaudeQuery |
| `server/claude-proxy.ts` | Modify | Whitelist validation + CLI --model flag |
| `src/components/Chat/ModelSelector.tsx` | Create | Dropdown UI component |
| `src/components/Chat/InputArea.tsx` | Modify | Integrate ModelSelector + pass model |
| `src/components/Layout/StatusBar.tsx` | Modify | Show current model |
| `src/data/slashCommands.ts` | Modify | Add model category + 3 commands |
| `src/components/Chat/SlashCommandPalette.tsx` | Modify | Render model category |
| `src/styles/globals.css` | Modify | ModelSelector styles |
| `tests/pages/ChatPage.ts` | Modify | Model selector locators |
| `tests/e2e/features/model-selector.spec.ts` | Create | E2E tests |

## Risks and Mitigation

| Risk | Level | Mitigation |
|------|-------|------------|
| Streaming lock: model switch during active stream | MEDIUM | Disable selector when `isStreaming === true` |
| Session resume + model change: CLI may ignore `--model` on `--resume` | MEDIUM | Clear `claudeSessionId` when model changes |
| Model ID future-proofing: IDs may change with CLI updates | LOW | Single source of truth in `models.ts` |
| Cost awareness: Opus is 30x more expensive than Haiku | LOW | Tier badges with color coding ($$$, $$, $) |
| Backend injection: malicious model param via WS | LOW | Server-side whitelist validation |
| Electron IPC alignment: model param must pass through IPC too | LOW | Update IPC type in `electron.d.ts` |

## SESSION_ID
- CODEX_SESSION: N/A (codeagent-wrapper not available)
- GEMINI_SESSION: N/A (codeagent-wrapper not available)
