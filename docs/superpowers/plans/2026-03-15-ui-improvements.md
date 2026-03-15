# UI 改进实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改进 Codeye UI，包括：实时同步会话、移除顶部元素、重新布局输入框、简化底部统计

**Architecture:**
- 会话同步：使用 chokidar 增强文件监听稳定性
- UI 重构：调整组件布局和 CSS
- 统计显示：简化 token 用量显示

**Tech Stack:** React, TypeScript, chokidar, CSS

---

## Chunk 1: 移除顶部元素

### Task 1: 移除 Codeye Logo 和分支显示

**Files:**
- Modify: `src/components/Layout/TitleBar.tsx`

- [ ] **Step 1: 移除 Logo 和名称**

删除 title-bar-logo 和 title-bar-name 部分：

```tsx
// 删除这些行:
<span className="title-bar-logo">
  <svg width="18" height="18" viewBox="0 0 120 120" fill="none">
    ...
  </svg>
</span>
<span className="title-bar-name">Codeye</span>
```

- [ ] **Step 2: 移除 "main" 分支显示**

删除 title-bar-center 中的 git branch 显示部分，保留空布局或完全移除

- [ ] **Step 3: 提交**

```bash
git add src/components/Layout/TitleBar.tsx
git commit -m "feat: remove logo and branch display from title bar"
```

---

## Chunk 2: 输入框区域重新布局

### Task 2: 将模型选择和权限移到输入框左下角

**Files:**
- Modify: `src/components/Chat/InputFooter.tsx`
- Modify: `src/styles/components/input-area.css`

- [ ] **Step 1: 修改 InputFooter 布局**

将模型选择和权限选择器从右侧移到左侧：

```tsx
// 修改后:
<div className="input-footer">
  <div className="input-footer-left">
    <ModelConfigSelector />
    <PermissionSelector />
  </div>
  <div className="input-footer-right">
    <SessionStats />
  </div>
</div>
```

- [ ] **Step 2: 调整 CSS 样式**

修改 input-footer-left 和 input-footer-right 的 flex 方向和间距

- [ ] **Step 3: 提交**

```bash
git add src/components/Chat/InputFooter.tsx src/styles/components/input-area.css
git commit -m "feat: move model selector and permissions to input area left"
```

---

## Chunk 3: 简化底部统计显示

### Task 3: 简化 SessionStats 显示 token 用量

**Files:**
- Modify: `src/components/Chat/SessionStats.tsx`

- [ ] **Step 1: 简化显示内容**

保留点击展开功能，但简化触发器显示：

- 显示格式：`12.5K / 200K`（类似 Claude Code CLI）
- 移除费用显示
- 保留圆环进度

```tsx
// 简化的触发器显示:
<span className="context-ring-wrapper">
  <ContextRing usedPercent={usedPercent} />
  <span className="context-ring-tooltip">{formatCompactTokens(usedTokens)} / {formatCompactTokens(contextWindow)}</span>
</span>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Chat/SessionStats.tsx
git commit -m "feat: simplify session stats to show token usage only"
```

---

## Chunk 4: 增强会话实时同步

### Task 4: 使用 chokidar 增强文件监听稳定性

**Files:**
- Modify: `electron/ipc/historyWatcher.ts`
- Modify: `package.json` (添加 chokidar 依赖)

- [ ] **Step 1: 安装 chokidar**

```bash
npm install chokidar
npm install -D @types/chokidar
```

- [ ] **Step 2: 重写 historyWatcher 使用 chokidar**

```typescript
import chokidar from 'chokidar';

export function watchProjectHistory(folderPath: string, encodedPath: string): void {
  if (watchers.has(encodedPath)) return;

  const projectDir = path.join(PROJECTS_DIR, encodedPath);

  const watcher = chokidar.watch(projectDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  watcher.on('add', (filePath) => {
    if (filePath.endsWith('.jsonl')) {
      debouncedNotify(encodedPath);
    }
  });

  watcher.on('change', (filePath) => {
    if (filePath.endsWith('.jsonl')) {
      debouncedNotify(encodedPath);
    }
  });

  watchers.set(encodedPath, { watcher, folderPath, encodedPath });
}
```

- [ ] **Step 3: 提交**

```bash
git add electron/ipc/historyWatcher.ts package.json package-lock.json
git commit -m "feat: use chokidar for reliable file watching"
```

---

## Chunk 5: 修复会话点击乱跳问题

### Task 5: 检查并修复 SessionList 渲染逻辑

**Files:**
- Modify: `src/components/Session/SessionList.tsx`
- Modify: `src/components/Session/SessionRow.tsx`

- [ ] **Step 1: 检查渲染逻辑**

检查 handleSelectSession 函数，确保：
- 切换会话时正确保存当前会话状态
- 正确加载目标会话数据
- 没有不必要的重新渲染

- [ ] **Step 2: 添加 useMemo 优化**

为 folderSections 添加依赖优化，避免不必要的计算

- [ ] **Step 3: 提交**

```bash
git add src/components/Session/SessionList.tsx src/components/Session/SessionRow.tsx
git commit -m "fix: resolve session list jumping issue"
```

---

## 验证清单

完成所有任务后验证：
- [ ] TitleBar 无 logo 和分支显示
- [ ] 模型选择在输入框左下角
- [ ] 权限在模型选择旁边
- [ ] 底部显示 token 用量（如 12.5K / 200K）
- [ ] 会话列表实时同步本地 Claude Code CLI
- [ ] 点击会话不乱跳
