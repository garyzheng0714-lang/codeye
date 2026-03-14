# Codeye — Project Rules

> Codex 的桌面 GUI。开发时必须遵守以下规则。
> 完整路线图见 `ROADMAP.md`，竞品研究见 memory 中的 `competitive-research.md`。

---

## 当前阶段

**Phase 0-6 + Phase 8 核心功能已集成到 UI**。Phase 7 (远程桥接) 按计划延后。

### 已集成到 UI 的功能 (2026-03-13)
- Phase 0: StreamEvent 协议、StorageAdapter、性能基线、SecretStore
- Phase 1: 会话持久化 (bootstrap.ts)、Shiki 语法高亮、费用追踪 (SessionStats)、Settings 4Tab、ErrorBoundary
- Phase 2: Turn 分组、DiffViewer (Edit 工具)、消息搜索 (Cmd+F)、上下文引用 (#)、StreamSessionManager、乐观更新
- Phase 3: Git 操作菜单 (commit/push/PR)、暗色主题系统、会话 Fork
- Phase 4: React.memo 优化 (6 组件)、虚拟滚动 (@tanstack/react-virtual, >40条启用)、StreamBatcher 60fps、WS 指数退避重连+心跳
- Phase 6: i18n (en/zh-CN) + 语言切换
- Phase 8: ToolApproval UI、Activity Stream (过滤: All/File/Tool/Git/Error)、Skills 市场 (4 内置 Skill)、Hooks/MCP 管理 (CRUD + 导入导出)

### 注意事项
- `settingsBtn` locator 必须用 `getByRole('button', { name: 'Open settings' })` 而不是 `.activity-bar-bottom .activity-btn`（底部现有 Activity + Settings 两个按钮）
- `settingsSelect` locator 使用 `.first()` 因为 GeneralTab 有多个 select (Theme + Language)
- Settings 面板有 6 个 Tab: General, Model, Shortcuts, About, Hooks, Skills
- uiStore 的 SidebarPanel 类型已扩展为 `'sessions' | 'settings' | 'activity'`
- 虚拟滚动阈值: turns > 40 时启用，estimateSize=120, overscan=5
- StreamBatcher: 16ms 基础间隔，50ms 繁忙间隔，32KB 立即 flush
- folder-header 已从 `<button>` 改为 `<div role="button">` 避免嵌套按钮 HTML 错误

---

## 架构硬约束

### Zustand Store 上限：3 个
- chatStore / sessionStore / uiStore，不可拆更多
- 新状态优先放入现有 store，绝不为单个功能新建 store
- 教训：OpenChamber 37 个 store → 级联渲染 → 卡顿

### 文件大小上限
- 单文件 < 400 行（常规），< 800 行（极限）
- 超过 200 行时考虑拆分
- 函数 < 50 行

### 不可变数据
- 所有 store action 返回新对象，禁止原地修改
- 使用展开运算符或 structuredClone，不用 Object.assign 到 this

### 模块分层
```
types/ → services/ → hooks/ → stores/ → components/
```
- 上层可以导入下层，反过来禁止
- services 是纯逻辑，不依赖 React
- 每个目录有 index.ts barrel export
- 使用 `@/` 路径别名

---

## 流式事件协议 (Phase 0+)

所有前后端消息必须符合 `StreamEvent` schema：
```typescript
{ version: number, type: string, payload: T }
```
- 前端按 version 做兼容分支
- Zod schema 前后端共用，同时用于运行时校验和类型推导
- 新增事件类型必须先更新 schema，再写业务代码

---

## 存储抽象 (Phase 0+)

- 所有持久化操作通过 `StorageAdapter` 接口
- 禁止直接调用 localStorage / IndexedDB / fs API
- 持久化数据必须带 `_schemaVersion` 字段

---

## 数据迁移规则

- 所有持久化数据结构带 `_schemaVersion: number`
- 迁移函数放 `src/migrations/`，命名 `v{N}-to-v{N+1}.ts`，纯函数
- 不可跳版本（v1→v2→v3 链式执行）
- 迁移前自动备份到 `_backup_v{N}` key
- 每个迁移函数必须有对应 test fixture
- 向后兼容 2 个主版本
- 新设置项必须有 default 值（旧配置缺失不报错）

---

## 性能目标

| 指标 | 目标 | 严重线 |
|------|------|--------|
| TTFT（本地） | < 300ms | > 800ms |
| 输入回显 | < 16ms | > 50ms |
| 长会话 FPS（200+ 消息） | > 50fps | < 30fps |
| 内存（200 条消息） | < 150MB | > 300MB |
| 错误率 | < 0.1% | > 1% |
| WS 重连率 | < 1 次/小时 | > 5 次/小时 |

- 新功能不能导致任一指标回归
- 关键路径使用 `performance.mark/measure` 打点
- CI 中 Playwright 脚本断言 p95 在阈值内

---

## 安全规则

- API key / token 统一走 `SecretStore` 接口，禁止明文存储
- 工具调用默认需审批（Phase 3 权限审批 UI 上线前由 Codex CLI 自身控制）
- 每次工具执行记录审计日志：timestamp + tool + args hash + result status
- 远程桥接（Phase 7）前必须完成 Threat Model

---

## 费用追踪准确性规则

- 数据源：读 `~/.Codex/projects/` 下的 JSONL 文件
- 四维追踪：input / output / cache_write / cache_read
- 优先使用 JSONL 中的 `costUSD` 字段，自行计算作为 fallback
- message_id + request_id 组合去重
- 价格表独立文件 + `PRICE_TABLE_VERSION` 常量
- unknown model 返回 `null` 并 warn，不默认 0
- 必须有 JSONL fixture 回放测试 + 去重回归测试

---

## Git 分支规则 (Phase 3+)

- 一个 workspace（会话）只能 checkout 一个 branch
- 首轮对话后 AI 建议分支名（`feat/xxx`），用户可编辑
- Worktree 路径：`~/codeye/workspaces/<session-id>`
- Setup script 自动 `ln -s "$ROOT/.env" .env` + 安装依赖
- 分支命名冲突自动加后缀 `-2`, `-3`

---

## 发布规则

### 版本号
```
v0.{Phase}.{patch}[-alpha.N | -beta.N]
```

### 通道
- **alpha**: 可能 breaking，仅开发者
- **beta**: API 稳定，可能有 UI bug，内测用户
- **stable**: 生产可用，所有用户

### Go/No-Go Gate

**Alpha → Beta**:
- 所有 Phase 验收标准 100% 通过
- 性能基线无 P0 回归
- 无已知 P0/P1 bug
- 数据迁移测试全部通过

**Beta → Stable**:
- Beta 期间 >= 7 天无 P0 bug
- 性能 p95 全部在"正常"阈值内
- 数据迁移从最老兼容版本测试通过
- CHANGELOG.md 已更新

---

## 竞品参考速查

实现功能时，先查对应竞品的实现方式，避免重复造轮子：

| 功能域 | 首选参考 |
|--------|---------|
| 费用追踪 | Opcode (`usage.rs`) |
| 对话 Turn 分组 | OpenChamber (`projectTurnRecords.ts`) |
| 流式 Markdown | Streamdown 库 + Kiro 方案 |
| 虚拟滚动 | OpenChamber (`@tanstack/react-virtual`) |
| 流会话管理 | CodePilot (`stream-session-manager.ts`) |
| 低延迟输入 | Codeman (`xterm-zerolag-input`) |
| 60fps 批处理 | Codeman (`server-timing.ts`, `batchTerminalData`) |
| 双模适配 | Opcode (`apiAdapter.ts`) |
| Git Worktree | Conductor 文档 |
| Diff 查看 | Conductor + OpenChamber (`@pierre/diffs`) |
| 主题系统 | OpenChamber (JSON 主题) + Kiro (设计 token) |
| 多 Provider | ClaudeCodeUI (`modelConstants.js`) |
| npm 分发 | ClaudeCodeUI (`npx @siteboon/Codex-ui`) |
| 会话 Fork | YepAnywhere |

---

## 实现注意事项

### Phase 0: 基础层
- **StreamEvent 协议**: 服务端 `server/streamEvent.ts` → `wrapEvent()`, 客户端 `src/types/streamEvent.ts` → `parseStreamEvent()` + legacy 升级
- **StorageAdapter**: `src/storage/adapter.ts` 接口 + Web/Memory 实现
- **性能基线**: `src/observability/perfBaseline.ts` — TTFT/FPS/内存/输入延迟打点
- **SecretStore**: `src/security/secretStore.ts` — Web base64 编码 + Electron safeStorage 自动切换

### Phase 1: 基础补全
- **Shiki 语法高亮**: 懒加载 WASM 单例 (`services/shikiHighlighter.ts`)，17 语言预加载
- **费用追踪**: PRICE_TABLE + 四维聚合 + messageId:requestId 去重, unknown model 返回 null + warn
- **设置面板**: 4 Tab (General/Model/Shortcuts/About)
- **ErrorBoundary**: 两层隔离 (App + ChatPanel)

### Phase 2: 对话体验
- **Turn 分组**: `utils/turnGrouping.ts` 纯函数 + `TurnGroup.tsx` 组件
- **StreamSessionManager**: `services/streamSessionManager.ts` — globalThis 单例, idle GC 330s, AbortController
- **DiffViewer**: `components/Chat/DiffViewer.tsx` — 统一/并排模式
- **MessageSearch**: Cmd+F 搜索 + 高亮跳转
- **上下文引用**: `services/contextReferences.ts` — #file/#codebase/#git_diff 解析

### Phase 3: Git + 高级功能
- **Git 集成**: `services/gitIntegration.ts` — 分支建议/冲突解决/Worktree/Checkpoint ref
- **自定义主题**: `services/themeManager.ts` — JSON 主题导入导出 + 自定义主题注册
- **自定义斜杠命令**: `data/slashCommands.ts` — localStorage 持久化
- **Hooks/MCP 管理**: `services/hooksManager.ts` — Hook CRUD + MCP Server CRUD + 配置导入导出
- **ToolApproval**: `components/Chat/ToolApproval.tsx` — 审批/拒绝 + 参数查看

### Phase 4: 性能优化
- **StreamBatcher**: `services/streamBatcher.ts` — 16ms 基础/50ms 忙碌/32KB 立即 flush
- **WebSocket 增强**: `services/websocket.ts` — 指数退避重连 (1s→30s) + 30s 心跳 + 连接监听
- **审计日志**: `services/auditLog.ts` — 工具执行记录, 5s 批量刷盘, 1000 条上限

### Phase 5: Electron 桌面版
- **Electron 主进程**: `electron/main.ts` — 全局快捷键 + 原生菜单 + 通知
- **IPC Handlers**: Codex (model/effort) + sessions + projects (JSONL 导入) + secrets (safeStorage)
- **双模适配层**: `services/apiAdapter.ts` — 统一 ClaudeAdapter/ProjectAdapter, 运行时自动检测
- **文件拖拽**: `services/fileDragDrop.ts` — DnD 事件处理 + 文件类型猜测

### Phase 6: 分发与国际化
- **i18n**: `src/i18n/` — EN/ZH-CN 双语, `t()` 函数 + param 插值 + `useI18n` hook
- **npm 包结构**: package.json 已配置，`npx codeye` 入口待绑定

### Phase 7: 远程桥接 (服务层)
- **Provider 抽象**: `services/providers/` — AIProvider 接口 + ClaudeProvider + ProviderRegistry
- **注**: 远程连接 (SSH/WS relay) 需 Threat Model 完成后才能实现，当前仅完成本地 Provider 层

### Phase 8: 差异化功能
- **会话 Fork**: `sessionStore.forkSession()` — 从任意消息点分叉
- **分层收件箱**: `services/sessionInbox.ts` — 4 级分类 (needs_attention/active/recent/archived)
- **全局活动流**: `services/activityStream.ts` — 跨会话事件推送 + 按会话分组
- **Skills 市场**: `services/skillsManager.ts` — 安装/卸载 + 4 个内置 skill + prompt 模板
- **Multi-Run**: `services/multiRun.ts` — 多模型并行执行 + 结果对比

### 数据迁移
- **迁移引擎**: `src/migrations/migrationRunner.ts` — 链式迁移 + 自动备份 + 版本检测

---

## 禁止事项

- 禁止新建第 4 个 Zustand store
- 禁止直接调用 localStorage/IndexedDB（走 StorageAdapter）
- 禁止持久化数据不带 `_schemaVersion`
- 禁止 unknown model 费用默认 0（必须 null + warn）
- 禁止跳过迁移版本（v1 不能直接到 v3）
- 禁止性能指标回归无告警
- 禁止在 Phase 7 Threat Model 完成前实现远程连接功能
