# EasyCode — Claude Code 桌面 GUI 客户端

## 项目概述

构建一个本地桌面图形化界面，替代 Claude Code 的终端交互方式。UI 风格参考 Kiro IDE，通过官方 Claude Agent SDK 与 Claude Code 集成，实现合规、无缝的开发体验。

---

## 一、竞品分析总结

| 项目 | 技术栈 | 认证方式 | 优点 | 缺点 |
|------|--------|----------|------|------|
| **CodePilot** (3.1k stars) | Electron + Next.js | 调用 `claude` CLI 二进制 | 功能丰富、多 provider 支持、IM Bridge | 内存占用大 (Electron)、功能膨胀 |
| **Opcode** (Tauri 2) | Tauri 2 + React | 读取 `~/.claude` 配置 | 内存占用低 75%、安全沙箱、Agent 系统 | 需要 Rust 环境、功能偏复杂 |
| **CloudCLI** | Web UI | SSH 远程调用 CLI | 支持手机端远程访问 | 功能简单、延迟高 |

### 认证机制关键发现

1. **所有方案**都复用 Claude Code CLI 的现有认证，不自建登录系统
2. **官方 SDK** (`@anthropic-ai/claude-agent-sdk`) 是 Anthropic 官方认可的集成方式
3. **合规红线**: Anthropic 明确禁止第三方产品提供 claude.ai 登录或使用其 rate limits
4. **安全方式**: 使用 `ANTHROPIC_API_KEY` 环境变量，或读取 CLI 已有的 `~/.claude` 配置

---

## 二、技术方案

### 架构: Electron + React + Vite + TypeScript

**选择理由:**
- 与用户已有技术栈完全一致 (React + Vite + TS)
- 纯 TypeScript 开发，无需 Rust 知识 (对比 Tauri)
- Electron 生态成熟，快速实现桌面功能
- CodePilot 已验证此方案可行

**核心集成: `@anthropic-ai/claude-agent-sdk`**
- Anthropic 官方 TypeScript SDK
- 底层 spawn Claude Code CLI 子进程
- 提供 async generator 流式消息
- 支持会话管理、工具调用、MCP、Hooks

### 认证策略 (合规安全)

```
优先级 1: 检测 ANTHROPIC_API_KEY 环境变量
优先级 2: 检测 ~/.claude 目录下已有认证 (CLI 已登录)
优先级 3: 引导用户到 Anthropic Console 获取 API Key

绝不自建 OAuth 登录流程，绝不模拟 claude.ai 登录
```

### 技术栈清单

| 层级 | 技术 | 用途 |
|------|------|------|
| 桌面壳 | Electron 33+ | 窗口管理、系统托盘、原生菜单 |
| UI 框架 | React 18 + Vite 6 | 前端渲染 |
| 组件库 | Ant Design 5 | UI 组件 |
| AI 集成 | @anthropic-ai/claude-agent-sdk | Claude Code 通信 |
| Markdown | react-markdown + remark-gfm + rehype | 消息渲染 |
| 代码高亮 | Shiki | 代码块语法高亮 |
| 本地存储 | better-sqlite3 | 会话、消息持久化 |
| 状态管理 | Zustand | 轻量全局状态 |
| 样式 | Tailwind CSS 4 | 原子化 CSS |
| IPC | Electron IPC (contextBridge) | 主进程-渲染进程通信 |

---

## 三、UI 设计 (Kiro 风格)

### 整体布局

```
┌──────────────────────────────────────────────────────┐
│  标题栏 (EasyCode)              _ □ ×               │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│  侧边栏   │            聊天主区域                      │
│  (240px) │                                           │
│          │  ┌─────────────────────────────────────┐  │
│ 📁 项目   │  │  用户消息气泡                        │  │
│ 💬 历史   │  │  AI 响应 (可折叠)                    │  │
│ ⚙ 设置   │  │  工具调用卡片 (可展开详情)            │  │
│          │  │  ...                                │  │
│          │  └─────────────────────────────────────┘  │
│          │                                           │
│          │  ┌─────────────────────────────────────┐  │
│          │  │ 输入区域 + 附件 + 模式切换             │  │
│          │  └─────────────────────────────────────┘  │
├──────────┴───────────────────────────────────────────┤
│  状态栏: 模型 | Token 用量 | 会话状态                  │
└──────────────────────────────────────────────────────┘
```

### 设计规范 (参考 Kiro + Linear)

| 属性 | 值 |
|------|-----|
| 背景色 | `#0f0f10` (主背景), `#161618` (侧边栏), `#1c1c1e` (卡片) |
| 文字色 | `#e5e5e5` (主), `#8b8b8b` (次), `#505050` (禁用) |
| 强调色 | `#6366f1` (Indigo, 按钮/链接), `#818cf8` (hover) |
| 边框 | `#262628` (分隔线), 1px solid |
| 圆角 | 8px (卡片), 12px (输入框), 6px (按钮) |
| 字体 | Inter (UI), JetBrains Mono (代码) |
| 动效 | 150ms ease-out (hover), 200ms (展开折叠) |

### 消息气泡设计

```
用户消息: 右对齐, 带 Indigo 背景的紧凑气泡
AI 响应:  左对齐, 无背景, 全宽展示
         - 长响应自动折叠 (显示前 3 行 + "展开全文")
         - 代码块带语法高亮 + 一键复制
         - 工具调用显示为可折叠卡片:
           [🔧 Read: src/auth.ts]     ← 折叠态
           [🔧 Read: src/auth.ts  ▼]  ← 展开显示输入/输出
```

### 模式切换 (参考 Kiro 的 Vibe/Spec)

| 模式 | 说明 | 对应 SDK 配置 |
|------|------|---------------|
| **Chat** | 自由对话、问答 | allowedTools: ["Read", "Glob", "Grep", "WebSearch"] |
| **Code** | 编码模式、可读写文件 | allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"] |
| **Plan** | 仅规划不执行 | systemPrompt 加入 "只规划不修改文件" 约束 |

---

## 四、项目结构

```
easycode/
├── electron/
│   ├── main.ts                 # Electron 主进程入口
│   ├── preload.ts              # contextBridge 暴露 API
│   └── ipc/
│       ├── claude.ts           # Claude Agent SDK 封装
│       ├── sessions.ts         # 会话管理 (SQLite)
│       └── projects.ts         # 项目目录管理
├── src/
│   ├── main.tsx                # React 入口
│   ├── App.tsx                 # 根组件
│   ├── stores/
│   │   ├── chatStore.ts        # 聊天状态 (Zustand)
│   │   ├── sessionStore.ts     # 会话列表状态
│   │   └── settingsStore.ts    # 设置状态
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx     # 左侧边栏
│   │   │   ├── StatusBar.tsx   # 底部状态栏
│   │   │   └── TitleBar.tsx    # 自定义标题栏
│   │   ├── Chat/
│   │   │   ├── ChatPanel.tsx   # 聊天主面板
│   │   │   ├── MessageList.tsx # 消息列表
│   │   │   ├── UserMessage.tsx # 用户消息气泡
│   │   │   ├── AIMessage.tsx   # AI 响应 (折叠/展开)
│   │   │   ├── ToolCall.tsx    # 工具调用卡片
│   │   │   ├── CodeBlock.tsx   # 代码块 (语法高亮)
│   │   │   └── InputArea.tsx   # 输入区域
│   │   ├── Session/
│   │   │   ├── SessionList.tsx # 会话列表
│   │   │   └── SessionItem.tsx # 会话项
│   │   ├── Project/
│   │   │   └── ProjectPicker.tsx # 项目选择器
│   │   └── Settings/
│   │       └── SettingsPanel.tsx  # 设置面板
│   ├── hooks/
│   │   ├── useClaudeChat.ts    # 封装 SDK 交互
│   │   └── useSession.ts       # 会话 CRUD
│   └── styles/
│       └── globals.css         # Tailwind + 全局样式
├── package.json
├── electron-builder.json       # 打包配置
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env                        # ANTHROPIC_API_KEY
```

---

## 五、实施步骤

### Phase 1: 项目骨架 (预计交付物: 能跑起来的空壳)

1. 初始化项目: Vite + React + TypeScript + Electron
2. 配置 Electron 主进程 + preload + IPC 基础通信
3. 搭建基础布局: 侧边栏 + 聊天区 + 状态栏
4. 配置 Tailwind CSS + 暗色主题 token
5. 自定义标题栏 (frameless window)

### Phase 2: Claude 集成 (预计交付物: 能聊天)

6. 安装 `@anthropic-ai/claude-agent-sdk`
7. 实现主进程 Claude 服务: 封装 `query()` 调用
8. 实现 IPC 通道: 渲染进程 ↔ 主进程消息传递
9. 实现认证检测: API Key → ~/.claude 配置 → 引导设置
10. 实现流式消息接收 + 渲染

### Phase 3: 聊天 UI (预计交付物: 完整聊天体验)

11. 实现消息列表 + 自动滚动
12. 实现用户消息气泡
13. 实现 AI 响应渲染 (Markdown + 代码高亮)
14. 实现工具调用卡片 (折叠/展开)
15. 实现长响应折叠 ("展开全文")
16. 实现输入区域 (多行 + Shift+Enter 换行 + 附件)
17. 实现模式切换 (Chat / Code / Plan)

### Phase 4: 会话管理 (预计交付物: 可持久化的多会话)

18. 初始化 SQLite 数据库 (sessions + messages 表)
19. 实现会话 CRUD (创建 / 重命名 / 删除 / 归档)
20. 实现会话切换 + 上下文恢复 (SDK resume)
21. 实现会话搜索
22. 实现侧边栏会话列表 UI

### Phase 5: 项目管理 + 设置 (预计交付物: 可日常使用)

23. 实现项目目录选择器 (读取 ~/.claude/projects/)
24. 实现项目切换 (更新 SDK 的 cwd 参数)
25. 实现设置面板 (API Key 配置、模型选择、主题)
26. 实现状态栏 (模型信息、Token 用量、连接状态)
27. 实现系统托盘 + 全局快捷键

### Phase 6: 打包发布

28. 配置 electron-builder (macOS DMG)
29. 代码签名 (如有 Apple Developer ID)
30. 测试安装流程

---

## 六、核心代码设计

### 主进程 Claude 服务 (electron/ipc/claude.ts)

```typescript
// 伪代码 - 核心交互逻辑
import { query } from '@anthropic-ai/claude-agent-sdk';
import { ipcMain, BrowserWindow } from 'electron';

ipcMain.handle('claude:query', async (event, { prompt, sessionId, cwd, mode }) => {
  const options = {
    allowedTools: getToolsForMode(mode),
    ...(sessionId && { resume: sessionId }),
    ...(cwd && { cwd }),
  };

  for await (const message of query({ prompt, options })) {
    // 流式推送到渲染进程
    BrowserWindow.fromWebContents(event.sender)
      ?.webContents.send('claude:message', message);
  }
});
```

### 渲染进程 Hook (src/hooks/useClaudeChat.ts)

```typescript
// 伪代码 - React 侧交互
function useClaudeChat() {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    const handler = (_, message) => {
      setMessages(prev => [...prev, message]);
    };
    window.electronAPI.onClaudeMessage(handler);
    return () => window.electronAPI.removeClaudeListener(handler);
  }, []);

  const sendMessage = async (prompt: string) => {
    setStreaming(true);
    await window.electronAPI.claudeQuery({ prompt, sessionId, cwd, mode });
    setStreaming(false);
  };

  return { messages, streaming, sendMessage };
}
```

---

## 七、风险与应对

| 风险 | 应对 |
|------|------|
| **封号风险** | 仅使用官方 SDK + API Key 认证，不模拟 claude.ai 登录，不使用 "Claude Code" 品牌名 |
| **SDK 变更** | 已从 `@anthropic-ai/claude-code` 迁移到 `@anthropic-ai/claude-agent-sdk`，关注 changelog |
| **Electron 内存** | 后续可考虑迁移到 Tauri 2，当前优先开发速度 |
| **Claude CLI 未安装** | 启动时检测，引导用户安装 `npm i -g @anthropic-ai/claude-code` |
| **品牌合规** | 项目名用 "EasyCode" 而非含 "Claude" 字样，遵守 Anthropic 品牌指南 |

---

## 八、SESSION_ID

- CODEX_SESSION: N/A (未使用外部模型)
- GEMINI_SESSION: N/A (未使用外部模型)
