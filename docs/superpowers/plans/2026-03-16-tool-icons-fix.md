# 工具图标与任务卡片分离实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** 修正工具卡片使用各自的图标，任务卡片才使用状态圆点

**Architecture:**
- 工具节点（Read/Search/Edit/Bash）：使用对应的 Lucide 图标
- 任务卡片（汇总步骤）：使用状态圆点（绿色对勾/紫色脉冲/红色感叹号）
- 图标颜色反映状态（运行中灰色，成功工具色，错误红色）

**Tech Stack:** React, CSS, Lucide Icons

---

## 设计规范

### 工具图标映射

| 工具 | 图标 | 颜色（成功） |
|------|------|-------------|
| Read | Eye | `#34d399` (绿色) |
| Write | FilePlus | `#34d399` (绿色) |
| Edit | Pencil | `#fbbf24` (黄色) |
| Bash | Terminal | `var(--text-secondary)` |
| Grep | Search | `#38bdf8` (蓝色) |
| Glob | FolderSearch | `#38bdf8` (蓝色) |
| WebSearch | Globe | `#a855f7` (紫色) |
| WebFetch | Link | `#a855f7` (紫色) |
| Agent/Task | Bot | `#818cf8` (靛蓝) |

### 状态显示

- **运行中**：图标旋转动画（Loader2）+ 灰色
- **成功**：静态图标 + 工具色
- **错误**：静态图标 + 红色

### 任务卡片（新增）

当 AI 执行多个相关工具时，显示一个汇总的任务卡片：
- 使用状态圆点显示整体进度
- 展开可以看到每个步骤（使用工具图标）

---

## Chunk 1: 修正 ToolBlock 组件

### Task 1: 更新 AIMessage.tsx 中的 ToolBlock

**Files:**
- Modify: `src/components/Chat/AIMessage.tsx`

- [ ] **Step 1: 添加工具图标导入**

```tsx
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { ToolIcon } from '../../data/toolIcons';
import { getToolColor } from '../../data/toolMeta';
```

- [ ] **Step 2: 更新 ToolBlock 组件使用工具图标**

```tsx
// ToolBlock component - uses tool icons instead of status circles
function ToolBlock({ tool, messageId }: { tool: ToolCallDisplay; messageId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toolType = getToolType(tool.name);

  // Determine status
  let status: 'running' | 'success' | 'error' = 'success';
  if (tool.output === undefined && !tool.progressLines) {
    status = 'running';
  } else if (tool.output?.startsWith('Error:')) {
    status = 'error';
  }

  const fileName = tool.input.file_path
    ? String(tool.input.file_path).split('/').pop()
    : null;

  // Get icon color based on status
  const iconColor = status === 'error'
    ? 'var(--danger)'
    : status === 'running'
      ? 'var(--text-muted)'
      : getToolColor(tool.name);

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
        {/* Tool icon with status color */}
        <span className="tool-block-icon" style={{ color: iconColor }}>
          {status === 'running' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ToolIcon name={tool.name} size={16} />
          )}
        </span>

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

- [ ] **Step 3: 更新 Read 文件组使用工具图标**

```tsx
// In the groupedTools map for Read groups
if ('kind' in item && item.kind === 'group') {
  const allSuccess = item.tools.every(t => t.output && !t.output.startsWith('Error:'));
  const anyRunning = item.tools.some(t => t.output === undefined);

  const iconColor = anyRunning
    ? 'var(--text-muted)'
    : allSuccess
      ? getToolColor('Read')
      : 'var(--danger)';

  return (
    <div key={`group-${idx}`} className="tool-block">
      <div className="tool-block-header">
        <span className="tool-block-icon" style={{ color: iconColor }}>
          {anyRunning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ToolIcon name="Read" size={16} />
          )}
        </span>
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

- [ ] **Step 4: 提交更改**

```bash
git add src/components/Chat/AIMessage.tsx
git commit -m "fix(ai-message): use tool icons instead of status circles for tool blocks"
```

---

## Chunk 2: 添加任务卡片组件

### Task 2: 创建 TaskCard 组件（可选，按需实现）

**Files:**
- Create: `src/components/Chat/TaskCard.tsx`
- Modify: `src/components/Chat/AIMessage.tsx`

- [ ] **Step 1: 创建 TaskCard 组件**

用于显示一组相关工具的汇总状态：

```tsx
import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCallDisplay } from '../../types';
import { ToolIcon } from '../../data/toolIcons';
import { getToolColor, getSemanticName } from '../../data/toolMeta';

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

interface TaskCardProps {
  title: string;
  tools: ToolCallDisplay[];
  defaultExpanded?: boolean;
}

export default memo(function TaskCard({ title, tools, defaultExpanded = false }: TaskCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Calculate overall status
  const allDone = tools.every(t => t.output);
  const anyError = tools.some(t => t.output?.startsWith('Error:'));
  const status: 'done' | 'running' | 'error' = anyError ? 'error' : allDone ? 'done' : 'running';

  const doneCount = tools.filter(t => t.output && !t.output.startsWith('Error:')).length;

  return (
    <div className="task-card">
      <div className="task-card-header" onClick={() => setExpanded(!expanded)}>
        <StepStatusCircle status={status} />
        <span className="task-card-title">{title}</span>
        <span className="task-card-progress">{doneCount}/{tools.length}</span>
        <span className="task-card-expand">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>

      {expanded && (
        <div className="task-card-steps">
          {tools.map((tool, i) => {
            const toolStatus = tool.output === undefined ? 'running'
              : tool.output?.startsWith('Error:') ? 'error'
              : 'done';
            const iconColor = toolStatus === 'error' ? 'var(--danger)'
              : toolStatus === 'running' ? 'var(--text-muted)'
              : getToolColor(tool.name);

            const fileName = tool.input.file_path
              ? String(tool.input.file_path).split('/').pop()
              : null;

            return (
              <div key={tool.id || i} className="task-step">
                <span className="task-step-icon" style={{ color: iconColor }}>
                  <ToolIcon name={tool.name} size={14} />
                </span>
                <span className="task-step-label">{getSemanticName(tool.name)}</span>
                {fileName && <span className="tool-file-badge">{fileName}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 2: 添加 TaskCard CSS**

```css
/* Task Card - uses status circles */
.task-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.task-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.task-card-header:hover {
  background: var(--interactive-hover-soft);
}

.task-card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.task-card-progress {
  font-size: var(--text-xs);
  color: var(--text-muted);
  padding: 2px var(--space-2);
  background: var(--surface-pill);
  border-radius: var(--radius-xs);
}

.task-card-expand {
  color: var(--text-muted);
}

.task-card-steps {
  border-top: 1px solid var(--surface-glass-divider);
  padding: var(--space-2);
}

.task-step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
}

.task-step-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-step-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
```

- [ ] **Step 3: 提交 TaskCard**

```bash
git add src/components/Chat/TaskCard.tsx src/styles/components/messages.css
git commit -m "feat(chat): add TaskCard component for grouped tool steps"
```

---

## Chunk 3: 更新 Thinking 指示器

### Task 3: 保持 Thinking 使用状态圆点

**Files:**
- Modify: `src/components/Chat/AIMessage.tsx`

- [ ] **Step 1: 确认 Thinking 使用状态圆点**

Thinking 指示器应该继续使用状态圆点（这是任务状态，不是工具）：

```tsx
{/* Thinking indicator - uses status circle because it's a task state */}
{isThinking && (
  <div className="thinking-block">
    <StepStatusCircle status="running" />
    <span className="thinking-text">Thinking</span>
  </div>
)}
```

- [ ] **Step 2: 确保 StepStatusCircle 组件存在**

如果之前被删除，需要重新添加：

```tsx
// Kiro-style status circle for task/card states
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

---

## 验证清单

- [ ] **工具节点**：使用工具对应图标（Eye, Search, Terminal 等）
- [ ] **工具状态**：图标颜色反映状态（运行灰色，成功工具色，错误红色）
- [ ] **Thinking**：使用状态圆点（任务状态）
- [ ] **任务卡片**（可选）：汇总步骤使用状态圆点

---

## 参考对照

| 组件 | 图标类型 | 用途 |
|------|---------|------|
| ToolBlock (Read) | Eye | 读取文件 |
| ToolBlock (Search) | Search | 搜索文件 |
| ToolBlock (Edit) | Pencil | 编辑文件 |
| ToolBlock (Bash) | Terminal | 执行命令 |
| Thinking | 状态圆点 | AI 思考中 |
| TaskCard | 状态圆点 | 汇总任务进度 |