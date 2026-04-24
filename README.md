# Codeye

Codeye 是一个 Claude Code 桌面 GUI 客户端。项目基于 Electron、React 和 TypeScript 构建，通过本地 `claude` CLI 提供交互式对话、代码编写、项目规划、会话管理和 Git 工作流辅助。

## 功能概览

- 多模型切换：内置 Opus、Sonnet、Haiku 三档模型别名。
- 三种工作模式：Code、Chat、Plan。
- 思考深度控制：`low`、`medium`、`high`，适用于支持 effort 的模型。
- 会话管理：多会话、文件夹分组、历史搜索、会话分叉和本地持久化。
- 斜杠命令：内置模式、模型、Git、TDD、代码审查、QA、部署等命令，并支持自定义命令。
- Git 集成：分支状态、提交/推送结果、PR 状态卡片和检查点能力。
- 文件树浏览：在侧边栏查看当前项目文件结构。
- 代码高亮与 diff：使用 Shiki 渲染代码块，并提供分屏 diff 视图。
- 工具审批：在 Claude 调用工具前按权限模式进行审批。
- 成本追踪：展示 token 用量和估算费用。
- 附件支持：可拖拽或粘贴文件作为上下文。
- 主题与国际化：浅色/深色主题，中文和英文界面文案。
- 应用内更新：基于 GitHub Releases 的 Electron 更新能力。

## 前置要求

- Node.js `>= 20`
- npm
- 已安装并登录的 Claude Code CLI：

  ```bash
  npm install -g @anthropic-ai/claude-code
  claude login
  ```

- macOS 用于当前打包目标。

## 快速开始

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动：

- Vite 前端开发服务器
- Electron 主进程 TypeScript watch 编译
- Electron 开发窗口

开发服务器默认使用 `http://localhost:5180`。

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | 启动 Vite、Electron 编译 watch 和 Electron 开发窗口。 |
| `npm run build` | TypeScript project build，并构建前端资源。 |
| `npm run build:electron` | 只编译 Electron 主进程。 |
| `npm run dist` | 构建前端、Electron 主进程并运行 electron-builder。 |
| `npm run dist:mac` | 构建 macOS DMG 和 ZIP。 |
| `npm run lint` | 运行 ESLint。 |
| `npm test` | 运行 Vitest 单元测试。 |
| `npm run test:watch` | 以 watch 模式运行 Vitest。 |
| `npm run test:e2e` | 运行 Playwright E2E 测试。 |

构建产物输出到 `release/` 目录。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面框架 | Electron 41 |
| 前端 | React 19 + TypeScript 5.9 |
| 构建工具 | Vite 7 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 代码高亮 | Shiki 4 |
| Markdown | react-markdown + remark-gfm |
| 虚拟列表 | @tanstack/react-virtual |
| 打包 | electron-builder |
| 测试 | Vitest + Playwright |

## 项目结构

```text
.
├── electron/              # Electron 主进程、preload、IPC 和 updater
│   └── ipc/               # Claude、会话、项目、文件树和密钥相关 IPC
├── src/
│   ├── components/        # Chat、Layout、Session、FileTree 等 UI 组件
│   ├── data/              # 模型、斜杠命令和工具元数据
│   ├── hooks/             # Claude 通信、输入、附件、Git、文件树等 hooks
│   ├── i18n/              # en 和 zh-CN 文案
│   ├── services/          # 流式会话、Git、审批、成本、主题等核心服务
│   ├── storage/           # 本地存储与迁移
│   ├── stores/            # Zustand stores
│   ├── styles/            # 样式入口、tokens 和组件样式
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具函数
├── tests/                 # Playwright E2E 测试
├── build/                 # 应用图标资源
├── scripts/               # 打包校验脚本
├── RELEASING.md           # 发版说明
└── package.json
```

## 配置与运行说明

- Codeye 通过本机 `claude` CLI 与 Claude Code 交互，因此需要先完成 CLI 安装和登录。
- Electron 主进程使用 `contextIsolation: true`，通过 preload/IPC 暴露桌面能力。
- 开发模式下 Electron 加载 `VITE_DEV_SERVER_URL`；生产构建加载 `dist/index.html`。
- 自动更新配置发布到 GitHub Releases，发布流程见 [RELEASING.md](./RELEASING.md)。

## 测试

```bash
npm test
npm run test:e2e
```

单元测试覆盖会话、消息处理、Git、权限、存储迁移、命令和工具服务等模块。E2E 测试位于 `tests/e2e/`。

## License

Private — 暂未开源。
