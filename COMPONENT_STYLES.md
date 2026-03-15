# Codeye 组件样式清单 — Kiro 风格对比

## ✅ 已完成的 Kiro 风格改进

### 1. 打字机效果 (Typewriter Effect)
- **位置**: `AIMessage.tsx` + `useTypewriter.ts`
- **效果**: AI 消息内容逐字显示，流式光标带紫色 glow
- **CSS**: `.streaming-cursor` + `@keyframes streamingCursor`

```
AI 正在输入... █  ← 流式光标带呼吸 glow 效果
```

### 2. AI 头像呼吸 Glow
- **位置**: `messages.css`
- **效果**: 思考时头像周围有呼吸式紫色光晕
- **CSS**: `.message-avatar--ai.streaming` + `@keyframes avatarBreath`

```
  ╭──────────╮
  │  👁️      │  ← 紫色 glow 呼吸动画
  ╰──────────╯
```

### 3. 代码块玻璃化
- **位置**: `code-block.css`
- **效果**: 半透明毛玻璃效果，与消息背景融合
- **CSS**: `backdrop-filter: blur(8px)` + `var(--surface-glass)`

```
┌─────────────────────────────────────────┐
│ typescript                  [Copy]      │  ← 半透明 header
├─────────────────────────────────────────┤
│ const x = 1;                            │  ← 毛玻璃背景
│ console.log(x);                         │
└─────────────────────────────────────────┘
```

---

## 🎴 卡片/块级组件

### 1. Tool Block (工具块)
```
┌─────────────────────────────────────────┐
│ 📄 Read files    [file1] [file2] +3   ✓ │  ← Header (可点击折叠)
├─────────────────────────────────────────┤
│ 文件内容展示...                          │  ← Content (展开时)
└─────────────────────────────────────────┘

CSS: .tool-block
- 背景: var(--bg-secondary) #1e1e24
- 边框: 1px solid var(--border-subtle) #262629
- 圆角: var(--radius-md) 10px
- 状态: loading (旋转图标) / success (绿色✓) / error (红色✗)
```

### 2. Code Block (代码块)
```
┌─────────────────────────────────────────┐
│  typescript                    [Copy]   │  ← Header
├─────────────────────────────────────────┤
│ const x = 1;                            │
│ console.log(x);                         │  ← Shiki 高亮代码
└─────────────────────────────────────────┘

CSS: .code-block
- 背景: var(--bg-code) #1a1625
- Header 背景: var(--bg-code-header) #130f1e
- 边框: 1px solid var(--border-subtle)
- 当前: 深色独立块
- Kiro 目标: 玻璃融合效果
```

### 3. Git Result Card (Git 结果)
```
┌─────────────────────────────────────────┐
│ ✓ ⎇ Committed                           │
│   abc1234 Fix bug                       │
└─────────────────────────────────────────┘

CSS: .git-result-card
- 背景: var(--surface-glass) rgba(255,255,255,0.03)
- 左边框: 2px solid #4ade80 (success) / #f87171 (error)
- 圆角: var(--radius-sm) 6px
```

### 4. Tool Approval (工具审批)
```
┌─────────────────────────────────────────┐
│ ⚠️ Bash needs approval        ⏱ 25s   │
│ [Show arguments]                        │
│ { "command": "rm -rf /" }               │
│ [  Approve  ] [   Deny   ]              │
└─────────────────────────────────────────┘

CSS: .tool-approval
- 背景: var(--bg-warning) rgba(251,191,36,0.10)
- 边框: 1px solid var(--border-warning)
- 圆角: var(--radius-md)
```

### 5. Diff Viewer (差异对比)
```
┌─────────────────────────────────────────┐
│ file.ts                    Unified Split│
├─────────────────────────────────────────┤
│  12 |   | const x = 1;                  │
│  13 | + | const y = 2;                  │  ← 绿色添加行
│  14 | - | const z = 3;                  │  ← 红色删除行
└─────────────────────────────────────────┘

CSS: .diff-viewer
- 背景: var(--bg-secondary)
- 添加行背景: var(--bg-success)
- 删除行背景: var(--bg-danger)
```

---

## 🧩 消息组件

### 6. User Message (用户消息)
```
👤                                    用户
─────────────────────────────────────────
这是用户发送的消息内容
```

CSS: .user-message-content
- 字体: var(--text-md) 14px
- 颜色: var(--text-primary) #ededef
- 无气泡包裹，纯文本

### 7. AI Message (AI 消息)
```
👁️                                    Codeye
─────────────────────────────────────────
[Tool Block 1]
[Tool Block 2]
[Thinking...]
AI 回复的文本内容...
```

CSS: .ai-message-flat
- 扁平布局，无卡片包裹
- 工具块垂直排列 gap: var(--space-3)
- 头像: 32px 圆形，带紫色边框

### 8. Turn Group (回合组)
```
┌─────────────────────────────────────────┐
│ 👤 用户问题                            │
│ [Collapse]                              │
│ 👁️ AI 回复 1                            │
│ 👁️ AI 回复 2                            │
└─────────────────────────────────────────┘

CSS: .turn-group
- 垂直排列 gap: var(--space-6)
```

---

## 🎛️ 输入/控制组件

### 9. Input Area (输入框)
```
─────────────────────────────────────────
[skill-pill] [#context] [attachment]
┌────────────────────────────────────┐ [⬆]
│ 输入消息...                        │
└────────────────────────────────────┘
Footer info
─────────────────────────────────────────

CSS: .input-container
- 背景: var(--bg-secondary) #1e1e24
- 边框: 1px solid var(--border-subtle)
- 聚焦: border-color: var(--border-accent) + glow
- 圆角: var(--radius-md) 10px
```

### 10. Context Pills (上下文标签)
```
[ /skill ] [ #file.ts ] [ 📎 file.pdf 12KB ] [Clear]

CSS: .context-pill
- 背景: var(--accent-muted)
- 颜色: var(--accent)
- 圆角: var(--radius-full)
- 字体: var(--text-xs)
```

### 11. Slash Command Palette (斜杠命令)
```
┌─────────────────────────────────────────┐
│ > explain                             ↵ │
├─────────────────────────────────────────┤
│ /explain  Explain the selected code     │
│ /fix      Fix issues in the code        │
└─────────────────────────────────────────┘

CSS: .slash-palette
- 背景: var(--bg-elevated)
- 边框: 1px solid var(--border-subtle)
- 阴影: var(--shadow-lg)
```

---

## 📋 导航/列表组件

### 12. Session List (会话列表)
```
📁 Project Name                    12 ▼
  Session title 1              2m
  Session title 2              1h
  Session title 3              3h

CSS: .session-row
- 悬浮: background: rgba(255,255,255,0.04)
- 选中: background: rgba(168,85,247,0.08)
- 圆角: 8px
```

### 13. Activity Stream (活动流)
```
Activity
[All] [File] [Tool] [Git] [Error]
─────────────────────────────────────────
⚡ Action description
  Session Name              2m ago

CSS: .activity-entry
- 悬浮: background: var(--bg-hover)
- 图标: 20px
```

---

## 🪟 面板/容器组件

### 14. Sidebar (侧边栏)
```
┌──────────────────┐
│ 会话        [+][📁]│
│ 🔍 搜索...        │
│ ──────────────── │
│ 📁 Project       │
│   session 1    2m│
│   session 2    1h│
│ ──────────────── │
│ /path/to/project │
└──────────────────┘

CSS: .sidebar
- 宽度: var(--sidebar-w) 280px
- 背景: var(--bg-primary) #18181d
- 边框: 1px solid var(--border-subtle)
```

### 15. Activity Bar (活动栏)
```
┌──┐
│💬│  ← Sessions (active: 紫色左边框)
│⚙️│  ← Settings
└──┘

CSS: .activity-bar
- 宽度: var(--activity-bar-w) 48px
- 背景: var(--bg-primary)
- Active indicator: 2px 左边框
```

### 16. Welcome Screen (欢迎页)
```
        👁️ (动画 Logo)

       Codeye
  AI coding assistant

[Explain auth flow]  [Find bugs]
[Refactor DB]        [Write tests]

CSS: .welcome-screen
- 背景: radial-gradient(紫色光晕)
- Logo: floatBounce 动画
- 标题: 渐变色文字
```

### 17. Command Palette (命令面板)
```
┌─────────────────────────────────────────┐
│ 🔍 > git commit                       ↵ │
├─────────────────────────────────────────┤
│ git commit   Create a git commit        │
│ git push     Push to remote             │
└─────────────────────────────────────────┘

CSS: .cmd-palette
- 背景: var(--bg-primary)
- 圆角: var(--radius-lg) 14px
- 阴影: 0 16px 48px rgba(0,0,0,0.4)
```

### 18. Settings Panel (设置面板)
```
┌─────────────────────────────────────────┐
│ General | Model | Shortcuts | About     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ API Settings                        │ │
│ │ [Key input                    ][🔑] │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

CSS: .settings-section
- 背景: var(--bg-secondary)
- 边框: 1px solid var(--border-subtle)
- 圆角: var(--radius-md)
```

---

## 🎨 需要 Kiro 化的改进点

| 组件 | 当前状态 | Kiro 目标 |
|------|---------|----------|
| AI 消息 | 即时显示 | 打字机逐字效果 |
| AI 头像 | 静态边框 | 呼吸 glow 动画 |
| 代码块 | 深色独立块 | 玻璃融合效果 |
| Tool Block | 折叠块 | 更紧凑的 pill 风格 |
| 输入框 | Glow 聚焦 | Subtle border 变化 |

