# Codeye

Claude Code 桌面 GUI 客户端。基于 Electron + React + TypeScript 构建，通过调用本地 `claude` CLI 实现与 Claude 的交互式对话、代码编写与项目规划。

## 功能特性

- **多模型切换** — 支持 Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5，可随时通过斜杠命令或下拉菜单切换
- **三种工作模式** — Code（编码）、Chat（对话）、Plan（规划）
- **思考深度控制** — Low / Medium / High 三级 effort 调节（Opus & Sonnet）
- **会话管理** — 多会话、文件夹分组、自动持久化、历史搜索、会话分叉
- **斜杠命令** — 内置 30+ 命令（模式切换、模型选择、Git 操作、代码审查、TDD 等），支持自定义命令与运行时扩展
- **Git 集成** — 分支管理、提交/推送/PR 状态卡片、检查点（checkpoint）
- **文件树浏览** — 侧边栏项目文件树，快速了解项目结构
- **代码高亮与 Diff** — 基于 Shiki 的语法高亮，分屏 Diff 视图
- **工具审批** — Claude 调用工具前可弹出审批弹窗，支持多种权限模式（default / plan / auto / bypassPermissions 等）
- **费用追踪** — 实时显示 token 用量与 API 费用
- **附件支持** — 拖拽或粘贴文件作为上下文
- **主题** — 浅色 / 深色主题
- **国际化** — 中文 / English
- **应用内更新** — 基于 GitHub Releases 的自动更新（需 Developer ID 签名才可静默安装）
- **快捷键** — `Cmd+N` 新建会话、`Cmd+L` 聚焦输入、`Cmd+B` 切换侧边栏、`Cmd+\` 分屏、`Cmd+Shift+C` 全局唤起窗口

## 前置要求

- [Node.js](https://nodejs.org/) >= 20
- [Claude Code CLI](https://www.npmjs.com/package/@anthropic-ai/claude-code)（`npm i -g @anthropic-ai/claude-code`），并完成 `claude login`
- macOS（当前仅构建 macOS 包）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发环境（Vite + Electron 热重载）
npm run dev
```

开发服务器默认运行在 `http://localhost:5180`。

## 构建与打包

```bash
# 仅构建前端
npm run build

# 构建 macOS DMG + ZIP
npm run dist:mac
```

产物输出到 `release/` 目录。

## 测试

```bash
# 单元测试（Vitest）
npm test

# E2E 测试（Playwright）
npm run test:e2e
```

## 技术栈

| 层级 | 技术 |
|------|------|
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

```
electron/          Electron 主进程 & IPC 处理
  ipc/             Claude CLI 调用、会话、项目、文件树、密钥管理
src/
  components/      React 组件（Chat、Layout、Session、FileTree 等）
  data/            模型定义、斜杠命令、工具元数据
  hooks/           自定义 Hooks（Claude 通信、文件树、Git 等）
  i18n/            国际化（en / zh-CN）
  services/        核心服务（消息处理、流批量、Git、主题、权限、费用追踪等）
  stores/          Zustand 状态（chat、session、ui）
  types/           TypeScript 类型定义
  utils/           工具函数
build/             应用图标
tests/             E2E 测试
```

## 发版

详见 [RELEASING.md](./RELEASING.md)。

## License

Private — 暂未开源。
