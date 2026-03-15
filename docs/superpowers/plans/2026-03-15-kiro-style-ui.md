# Kiro 风格 UI 改进实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** 参考 Kiro 设计风格，改进 Codeye 消息渲染 UI

**Architecture:**
- 等待状态：添加头像组件 + 优化动画
- 任务卡片：重写 Steps 区块样式，使用渐变卡片 + 进度条
- 整体风格：圆角、渐变、毛玻璃

**Tech Stack:** React, CSS

---

## Chunk 1: 等待状态 (Thinking)

### Task 1: 添加头像和优化动画

**Files:**
- Modify: `src/components/Chat/AIMessage.tsx`
- Modify: `src/styles/components/messages.css`

- [ ] **Step 1: 修改 Thinking 状态代码**

在 AIMessage.tsx 中找到 `thinking-row` 部分，添加头像：

```tsx
{isThinking && (
  <div className="thinking-row">
    <div className="thinking-avatar">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="url(#avatarGradient)"/>
        <circle cx="12" cy="13" r="2" fill="white"/>
        <circle cx="20" cy="13" r="2" fill="white"/>
        <path d="M10 20 Q16 25 22 20" stroke="white" strokeWidth="2" fill="none"/>
        <defs>
          <linearGradient id="avatarGradient" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="#a855f7"/>
            <stop offset="100%" stopColor="#3b82f6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <div className="thinking-dots" aria-hidden="true">
      <div className="thinking-dot" />
      <div className="thinking-dot" />
      <div className="thinking-dot" />
    </div>
    <span className="thinking-text">正在思考...</span>
  </div>
)}
```

- [ ] **Step 2: 添加 CSS 样式**

在 messages.css 中添加：

```css
.thinking-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.1));
  border-radius: 16px;
  border: 1px solid rgba(168, 85, 247, 0.2);
  backdrop-filter: blur(10px);
  margin-bottom: 12px;
}

.thinking-avatar {
  flex-shrink: 0;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  animation: thinking-bounce 1.4s ease-in-out infinite;
}

.thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

.thinking-text {
  color: var(--text-secondary);
  font-size: 13px;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/Chat/AIMessage.tsx src/styles/components/messages.css
git commit -m "feat: add avatar and improve thinking animation"
```

---

## Chunk 2: 任务卡片 (Steps)

### Task 2: 重写 Steps 区块为卡片样式

**Files:**
- Modify: `src/components/Chat/AIMessage.tsx`
- Modify: `src/styles/components/messages.css`

- [ ] **Step 1: 修改 Steps 区块结构**

在 AIMessage.tsx 中找到 `ai-steps-block` 部分，添加进度条和优化结构：

```tsx
{stepTools.length > 0 && (
  <div className="ai-steps-block">
    <div className="steps-header">
      <span className="steps-header-label">
        <Zap size={14} strokeWidth={2} />
        任务步骤
      </span>
      <span className={`steps-status steps-status--${stepsStatus}`}>
        {stepsStatus === 'running' ? '进行中' : stepsStatus === 'error' ? '出错' : `已完成 ${stepTools.length} 项`}
      </span>
    </div>

    {/* Progress bar */}
    <div className="steps-progress-bar">
      <div
        className="steps-progress-fill"
        style={{
          width: stepsStatus === 'completed' ? '100%' :
                 stepsStatus === 'running' ? '60%' : '0%'
        }}
      />
    </div>

    <div className="steps-list">
      {stepTools.map((g, i) =>
        g.kind === 'reads' ? (
          <ReadGroupRow key={`reads-${i}`} files={g.files} running={g.running} error={g.error} index={i} />
        ) : (
          <ToolCall
            key={g.tool.id}
            tool={g.tool}
            messageId={message.id}
            index={i}
            isStreaming={messageIsStreaming}
          />
        )
      )}
    </div>
  </div>
)}
```

- [ ] **Step 2: 添加卡片 CSS 样式**

```css
.ai-steps-block {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(59, 130, 246, 0.08));
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  backdrop-filter: blur(12px);
}

.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.steps-header-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--text-primary);
}

.steps-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(168, 85, 247, 0.15);
  color: var(--accent);
}

.steps-status--error {
  background: rgba(248, 113, 113, 0.15);
  color: var(--danger);
}

.steps-progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.steps-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #3b82f6);
  border-radius: 2px;
  transition: width 0.3s ease;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/Chat/AIMessage.tsx src/styles/components/messages.css
git commit -m "feat: add gradient card style for steps block"
```

---

## 验证清单

完成所有任务后验证：
- [ ] 等待回复时显示渐变头像 + 三点动画 + "正在思考..."
- [ ] 任务步骤显示为渐变卡片
- [ ] 显示进度条
- [ ] 整体风格为圆角、渐变、毛玻璃效果
