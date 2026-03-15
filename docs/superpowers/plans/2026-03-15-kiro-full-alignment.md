# Kiro-Style UI Full Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** 全面对标 Kiro 的 AI 回复卡片渲染，包括背景颜色、图标、状态指示器、代码块样式等

**Architecture:**
- 设计系统对齐：更新 tokens.css 以匹配 Kiro 的色彩系统
- 工具卡片重写：新的状态图标、背景色、文件徽章样式
- 代码块优化：Kiro 风格的代码块头部和语法高亮
- 消息布局调整：扁平化设计、精确间距

**Tech Stack:** React, CSS, Lucide Icons

---

## Kiro Design Analysis (from screenshots)

### 关键视觉特征：
1. **背景色系统**：
   - 工具卡片背景：`rgba(255, 255, 255, 0.03)` 带微妙边框
   - 成功状态：绿色圆点 `#34d399` 背景 `rgba(52, 211, 153, 0.1)`
   - 加载状态：紫色脉冲圆点
   - 错误状态：红色 `#f87171`

2. **状态指示器**：
   - 使用圆形状态点 (18px) 替代图标
   - 成功：绿色背景 + 白色对勾
   - 加载：紫色背景 + 脉冲动画内部点
   - 错误：红色背景 + 感叹号

3. **文件徽章**：
   - 圆角药丸形状
   - 背景：`rgba(255, 255, 255, 0.065)`
   - 字体：等宽字体，极小字号 (10-11px)
   - 颜色：`#68686e` (muted)

4. **工具标签**：
   - 语义化名称 (Searched, Read, Edited, Ran command)
   - 字重 500，颜色 `#9a9aa0`
   - 紧凑布局，最小高度 34px

5. **代码块**：
   - 毛玻璃背景效果
   - 语言标签使用紫色药丸
   - 紧凑的 header 区域

---

## Chunk 1: 设计系统更新 (Tokens)

### Task 1: 更新 tokens.css 以匹配 Kiro 色彩

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: 添加 Kiro 风格的状态圆点变量**

```css
/* 在 :root 中添加 (dark theme) */
:root {
  /* ... existing tokens ... */

  /* Kiro-style status circles */
  --status-circle-size: 18px;
  --status-circle-done-bg: var(--bg-success);
  --status-circle-done-fg: var(--success);
  --status-circle-running-bg: var(--accent-muted);
  --status-circle-running-fg: var(--accent);
  --status-circle-error-bg: var(--bg-danger);
  --status-circle-error-fg: var(--danger);

  /* Kiro-style file pill */
  --pill-bg: var(--surface-pill);
  --pill-fg: var(--text-muted);
  --pill-font-size: 10px;
  --pill-padding: 2px 7px;
  --pill-radius: var(--radius-xs);

  /* Kiro-style tool card */
  --tool-card-bg: var(--bg-secondary);
  --tool-card-border: var(--border-subtle);
  --tool-card-radius: var(--radius-lg);
  --tool-card-row-height: 34px;
  --tool-card-label-fg: var(--text-secondary);
  --tool-card-label-weight: 500;
}
```

- [ ] **Step 2: 添加 Light theme 对应变量**

```css
[data-theme="light"] {
  /* ... existing light tokens ... */

  /* Light theme status circles */
  --status-circle-done-bg: rgba(22, 163, 74, 0.1);
  --status-circle-done-fg: #16a34a;
  --status-circle-running-bg: rgba(147, 51, 234, 0.1);
  --status-circle-running-fg: #9333ea;
  --status-circle-error-bg: rgba(220, 38, 38, 0.1);
  --status-circle-error-fg: #dc2626;

  /* Light theme pill */
  --pill-bg: rgba(0, 0, 0, 0.05);
  --pill-fg: #6b7280;
}
```

- [ ] **Step 3: 提交 tokens 更新**

```bash
git add src/styles/tokens.css
git commit -m "feat(tokens): add Kiro-style status and pill variables"
```

---

## Chunk 2: 工具卡片图标系统

### Task 2: 创建 Kiro 风格的状态圆点组件

**Files:**
- Modify: `src/components/Chat/ToolCall.tsx`
- Modify: `src/styles/components/tool-call.css`

- [ ] **Step 1: 更新 StepStatusCircle 组件**

将现有的 `StepStatusCircle` 改为完全匹配 Kiro 的样式：

```tsx
function StepStatusCircle({ status }: { status: 'done' | 'running' | 'error' }) {
  if (status === 'running') {
    return (
      <span className="kiro-status kiro-status--running">
        <span className="kiro-status-dot" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="kiro-status kiro-status--error">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 3v2M5 6.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="kiro-status kiro-status--done">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
```

- [ ] **Step 2: 添加 Kiro 风格状态圆点 CSS**

```css
/* ══════════════════════════════════════════
   Kiro-style Status Circles
   ══════════════════════════════════════════ */

.kiro-status {
  width: var(--status-circle-size);
  height: var(--status-circle-size);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kiro-status--done {
  background: var(--status-circle-done-bg);
  color: var(--status-circle-done-fg);
}

.kiro-status--running {
  background: var(--status-circle-running-bg);
  position: relative;
}

.kiro-status-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--status-circle-running-fg);
  animation: kiro-pulse 1.2s ease-in-out infinite;
}

.kiro-status--error {
  background: var(--status-circle-error-bg);
  color: var(--status-circle-error-fg);
}

@keyframes kiro-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
```

- [ ] **Step 3: 提交状态圆点更新**

```bash
git add src/components/Chat/ToolCall.tsx src/styles/components/tool-call.css
git commit -m "feat(tool-call): add Kiro-style status circles"
```

---

## Chunk 3: 工具卡片布局和样式

### Task 3: 重构工具卡片 CSS 以匹配 Kiro

**Files:**
- Modify: `src/styles/components/tool-call.css`

- [ ] **Step 1: 更新工具卡片基础样式**

```css
/* ══════════════════════════════════════════
   Tool Card — Kiro Style
   ══════════════════════════════════════════ */

.tool-card {
  background: var(--tool-card-bg);
  border: 1px solid var(--tool-card-border);
  border-radius: var(--tool-card-radius);
  overflow: hidden;
  animation: toolCardEnter var(--transition-slow) both;
}

.tool-card--error {
  background: var(--bg-danger);
  border-color: var(--border-danger);
}

/* Main row — exact Kiro measurements */
.tool-card-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 7px var(--space-4);
  min-height: var(--tool-card-row-height);
}

.tool-card-row--clickable {
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast);
}

.tool-card-row--clickable:hover {
  background: var(--interactive-hover-soft);
}

/* Label — Kiro style */
.tool-card-label {
  font-size: var(--text-sm);
  font-weight: var(--tool-card-label-weight);
  color: var(--tool-card-label-fg);
  flex-shrink: 0;
}

/* File badge — Kiro pill style */
.tool-file-badge {
  font-family: var(--font-mono);
  font-size: var(--pill-font-size);
  color: var(--pill-fg);
  background: var(--pill-bg);
  padding: var(--pill-padding);
  border-radius: var(--pill-radius);
}

/* Count badge */
.tool-count-badge {
  font-size: var(--text-xs);
  color: var(--text-disabled);
  font-style: italic;
  white-space: nowrap;
  flex-shrink: 0;
}
```

- [ ] **Step 2: 添加入场动画**

```css
/* Tool card entrance animation */
@keyframes toolCardEnter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fade in for staggered items */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 3: 提交工具卡片样式**

```bash
git add src/styles/components/tool-call.css
git commit -m "style(tool-call): align tool card with Kiro style"
```

---

## Chunk 4: AIMessage 工具块重构

### Task 4: 重构 AIMessage 中的 ToolBlock 组件

**Files:**
- Modify: `src/components/Chat/AIMessage.tsx`
- Modify: `src/styles/components/messages.css`

- [ ] **Step 1: 更新 ToolBlock 组件使用 Kiro 状态圆点**

```tsx
function ToolBlock({ tool, messageId }: { tool: ToolCallDisplay; messageId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const toolType = getToolType(tool.name);
  const ToolIcon = getToolIcon(toolType);

  // Determine status
  let status: 'done' | 'running' | 'error' = 'done';
  if (tool.output === undefined && !tool.progressLines) {
    status = 'running';
  } else if (tool.output?.startsWith('Error:')) {
    status = 'error';
  }

  const fileName = tool.input.file_path
    ? String(tool.input.file_path).split('/').pop()
    : null;

  return (
    <div className="tool-block">
      <div
        className="tool-block-header"
        onClick={() => tool.output && setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            tool.output && setIsExpanded(!isExpanded);
          }
        }}
      >
        {/* Kiro-style status circle */}
        <StepStatusCircle status={status} />

        <span className="tool-block-label">{getToolLabel(toolType)}</span>

        {fileName && (
          <span className="tool-file-badge">{fileName}</span>
        )}

        {/* Expand/collapse */}
        {tool.output && (
          <span className="tool-block-expand">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>

      {isExpanded && tool.output && (
        <div className="tool-block-content">
          <pre className="tool-block-output">{tool.output}</pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 添加 StepStatusCircle 到 AIMessage 文件**

在文件顶部添加：

```tsx
function StepStatusCircle({ status }: { status: 'done' | 'running' | 'error' }) {
  if (status === 'running') {
    return (
      <span className="kiro-status kiro-status--running">
        <span className="kiro-status-dot" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="kiro-status kiro-status--error">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 3v2M5 6.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="kiro-status kiro-status--done">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
```

- [ ] **Step 3: 更新 messages.css 中的 tool-block 样式**

```css
/* ══════════════════════════════════════════
   Tool Blocks — Kiro Style
   ══════════════════════════════════════════ */

.tool-block {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  overflow: hidden;
  animation: toolCardEnter var(--transition-slow) both;
}

.tool-block-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 7px var(--space-4);
  min-height: 34px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.tool-block-header:hover {
  background: var(--interactive-hover-soft);
}

.tool-block-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.tool-block-expand {
  color: var(--text-disabled);
  flex-shrink: 0;
  margin-left: auto;
  transition: color var(--transition-fast);
}

.tool-block-header:hover .tool-block-expand {
  color: var(--text-muted);
}

.tool-block-content {
  padding: var(--space-3);
  border-top: 1px solid var(--surface-glass-divider);
}

.tool-block-output {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}
```

- [ ] **Step 4: 提交 AIMessage 更新**

```bash
git add src/components/Chat/AIMessage.tsx src/styles/components/messages.css
git commit -m "feat(ai-message): add Kiro-style tool blocks with status circles"
```

---

## Chunk 5: Read 文件组样式

### Task 5: 优化 Read 文件组的显示

**Files:**
- Modify: `src/components/Chat/AIMessage.tsx`
- Modify: `src/styles/components/messages.css`

- [ ] **Step 1: 更新 Read 文件组渲染**

```tsx
// 在 groupedTools map 中的 group 渲染部分
if ('kind' in item && item.kind === 'group') {
  const allSuccess = item.tools.every(t => t.output && !t.output.startsWith('Error:'));
  const anyRunning = item.tools.some(t => t.output === undefined);
  const groupStatus: 'done' | 'running' | 'error' = anyRunning ? 'running' : allSuccess ? 'done' : 'error';

  return (
    <div key={`group-${idx}`} className="tool-block">
      <div className="tool-block-header">
        <StepStatusCircle status={groupStatus} />
        <span className="tool-block-label">
          {item.tools.length > 1 ? `Read ${item.tools.length} files` : 'Read file'}
        </span>
        <div className="tool-block-files">
          {item.tools.slice(0, 4).map((t, i) => {
            const name = t.input.file_path
              ? String(t.input.file_path).split('/').pop()
              : 'file';
            return (
              <span key={i} className="tool-file-badge">{name}</span>
            );
          })}
          {item.tools.length > 4 && (
            <span className="tool-block-more">+{item.tools.length - 4}</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 更新文件组 CSS**

```css
/* Read file group */
.tool-block-files {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.tool-block-more {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-style: italic;
}
```

- [ ] **Step 3: 提交 Read 组更新**

```bash
git add src/components/Chat/AIMessage.tsx src/styles/components/messages.css
git commit -m "feat(ai-message): improve Read file group display"
```

---

## Chunk 6: Thinking 状态优化

### Task 6: 添加 Kiro 风格的 Thinking 动画

**Files:**
- Modify: `src/components/Chat/AIMessage.tsx`
- Modify: `src/styles/components/messages.css`

- [ ] **Step 1: 更新 Thinking 指示器**

```tsx
{isThinking && (
  <div className="thinking-block">
    <span className="kiro-status kiro-status--running">
      <span className="kiro-status-dot" />
    </span>
    <span className="thinking-text">Thinking</span>
  </div>
)}
```

- [ ] **Step 2: 更新 Thinking CSS**

```css
/* ══════════════════════════════════════════
   Thinking State — Kiro Style
   ══════════════════════════════════════════ */

.thinking-block {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.thinking-text {
  font-size: var(--text-sm);
  color: var(--text-muted);
}
```

- [ ] **Step 3: 移除旧的 thinking-row 样式**

删除 messages.css 中旧的 `.thinking-row` 相关样式。

- [ ] **Step 4: 提交 Thinking 更新**

```bash
git add src/components/Chat/AIMessage.tsx src/styles/components/messages.css
git commit -m "feat(ai-message): add Kiro-style thinking indicator"
```

---

## Chunk 7: 代码块样式优化

### Task 7: 优化代码块以匹配 Kiro 风格

**Files:**
- Modify: `src/styles/components/code-block.css`

- [ ] **Step 1: 更新代码块 CSS**

```css
/* ══════════════════════════════════════════
   Code Block — Kiro Style
   ══════════════════════════════════════════ */

.code-block {
  background: var(--surface-glass);
  border: 1px solid var(--surface-glass-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: var(--space-2) 0;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--surface-glass-border);
  min-height: 32px;
}

.code-lang {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--accent-code);
  background: var(--accent-muted);
  padding: 2px var(--space-2);
  border-radius: var(--radius-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.copy-btn {
  border: none;
  background: transparent;
  color: var(--text-disabled);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 2px var(--space-2);
  border-radius: var(--radius-xs);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.copy-btn:hover {
  background: var(--interactive-hover);
  color: var(--text-secondary);
}

.copy-btn.copied {
  color: var(--success);
}

.code-block-pre {
  padding: var(--space-3) var(--space-4);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.7;
  color: var(--text-code);
}

/* Dark theme */
[data-theme="dark"] .code-block {
  border-color: rgba(168, 85, 247, 0.15);
  background: rgba(26, 22, 37, 0.6);
}

[data-theme="dark"] .code-block-header {
  background: rgba(19, 15, 30, 0.4);
  border-bottom-color: rgba(168, 85, 247, 0.1);
}

/* Light theme */
[data-theme="light"] .code-block {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme="light"] .code-block-header {
  background: rgba(0, 0, 0, 0.02);
}
```

- [ ] **Step 2: 提交代码块更新**

```bash
git add src/styles/components/code-block.css
git commit -m "style(code-block): align with Kiro glass effect style"
```

---

## Chunk 8: 整体布局微调

### Task 8: 调整消息间距和布局

**Files:**
- Modify: `src/styles/components/messages.css`

- [ ] **Step 1: 更新消息列表间距**

```css
/* Message list spacing */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.message-list > .message-list-spacer {
  flex: 1 0 0px;
}

/* Turn group */
.turn-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
```

- [ ] **Step 2: 更新 AI 消息扁平布局**

```css
/* AI Message flat layout */
.ai-message-flat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

/* Tool blocks gap within AI message */
.ai-message-flat > .tool-block + .tool-block {
  margin-top: 0;
}

.ai-message-flat > .tool-block + .thinking-block,
.ai-message-flat > .thinking-block + .ai-message-text,
.ai-message-flat > .tool-block + .ai-message-text {
  margin-top: var(--space-2);
}
```

- [ ] **Step 3: 提交布局更新**

```bash
git add src/styles/components/messages.css
git commit -m "style(messages): adjust spacing for Kiro alignment"
```

---

## Chunk 9: Light Theme 适配

### Task 9: 完善 Light Theme 样式

**Files:**
- Modify: `src/styles/components/messages.css`
- Modify: `src/styles/components/tool-call.css`
- Modify: `src/styles/components/code-block.css`

- [ ] **Step 1: 添加 Light Theme 工具卡片覆盖**

```css
/* Light theme tool blocks */
[data-theme="light"] .tool-block {
  background: white;
  border-color: var(--border-subtle);
}

[data-theme="light"] .tool-block-header:hover {
  background: var(--bg-hover);
}

[data-theme="light"] .tool-card {
  background: white;
}

[data-theme="light"] .tool-card--error {
  background: var(--bg-danger);
}

[data-theme="light"] .thinking-block {
  background: var(--bg-secondary);
  border-color: var(--border-subtle);
}
```

- [ ] **Step 2: 提交 Light Theme 更新**

```bash
git add src/styles/components/messages.css src/styles/components/tool-call.css src/styles/components/code-block.css
git commit -m "style: complete light theme support for Kiro style"
```

---

## Chunk 10: 最终验证和清理

### Task 10: 清理冗余样式和验证

**Files:**
- Modify: `src/styles/components/messages.css`
- Modify: `src/styles/components/tool-call.css`

- [ ] **Step 1: 移除重复和过时的样式**

删除 messages.css 中重复定义的 `.message-row`, `.message-avatar` 等样式（文件中有两份定义）。

- [ ] **Step 2: 验证所有组件样式**

确保以下样式正确应用：
- [ ] 状态圆点显示正确（成功/加载/错误）
- [ ] 文件徽章样式一致
- [ ] 工具卡片间距和圆角正确
- [ ] Light theme 颜色正确
- [ ] 动画流畅

- [ ] **Step 3: 最终提交**

```bash
git add src/styles/components/messages.css src/styles/components/tool-call.css
git commit -m "chore: cleanup duplicate styles and finalize Kiro alignment"
```

---

## 验证清单

完成所有任务后验证：

- [ ] **状态圆点**：成功(绿色+对勾)、加载(紫色+脉冲)、错误(红色+感叹号)
- [ ] **工具标签**：语义化名称，字重 500，正确颜色
- [ ] **文件徽章**：等宽字体，圆角药丸，正确背景色
- [ ] **工具卡片**：圆角、边框、背景色匹配 Kiro
- [ ] **代码块**：毛玻璃效果，语言标签样式
- [ ] **Thinking 状态**：使用状态圆点 + 文字
- [ ] **Light Theme**：所有组件在浅色模式下正确显示
- [ ] **动画**：入场动画流畅，状态动画自然

---

## 参考颜色速查

| 元素 | Dark Theme | Light Theme |
|------|------------|-------------|
| 状态圆点-成功背景 | `rgba(52, 211, 153, 0.1)` | `rgba(22, 163, 74, 0.1)` |
| 状态圆点-成功前景 | `#34d399` | `#16a34a` |
| 状态圆点-加载背景 | `rgba(168, 85, 247, 0.1)` | `rgba(147, 51, 234, 0.1)` |
| 状态圆点-加载前景 | `#a855f7` | `#9333ea` |
| 状态圆点-错误背景 | `rgba(248, 113, 113, 0.1)` | `rgba(220, 38, 38, 0.1)` |
| 状态圆点-错误前景 | `#f87171` | `#dc2626` |
| 文件徽章背景 | `rgba(255, 255, 255, 0.065)` | `rgba(0, 0, 0, 0.05)` |
| 文件徽章前景 | `#68686e` | `#6b7280` |
| 工具卡片背景 | `#1e1e24` | `#ffffff` |
| 工具卡片边框 | `#262629` | `#e8e8ec` |