# Codeye Roadmap

> 基于 8 个竞品的深度分析，结合 Codeye v0.3 现状制定的开发路线图。
> 每个功能标注可参考的竞品实现，每个 Phase 附验收标准。

---

## 当前状态 (v0.3)

已完成：聊天界面 / Markdown 渲染 / 工具调用展示 / 会话管理 / 模型选择 / 斜杠命令 / 快捷键 / Demo 模式 / WebSocket proxy / 响应式设计 / 设计系统

---

## Phase 0: 基础层 (v0.3.x)

| Owner | 工时 | 前置依赖 | 发布通道 |
|-------|------|---------|---------|
| 全栈 (协议 + 存储 + 基建) | ~5d | 无 | alpha |

在堆功能之前，先铺好三根管道：事件协议、存储抽象、性能基线。
后续所有 Phase 都站在这三根管道上。

### 0.1 统一流式事件协议
- **问题**: 当前 WebSocket 消息格式是隐式约定，无 schema 无版本号，前后端耦合紧
- **方案**: 定义 `StreamEvent` schema（JSON Schema 或 Zod），带 `version` 字段
  ```
  { version: 1, type: "assistant:text" | "assistant:tool_use" | "system:init" | "cost" | ..., payload: T }
  ```
- **要求**:
  - SSE 和 WebSocket 共用同一套 schema（未来切 SSE 零改动）
  - 前端按 `version` 做兼容分支，老版本 graceful degrade
  - Zod schema 同时用于运行时校验和 TypeScript 类型推导
- **参考**: Codeman (SSE event types)、CodePilot (SSE event 分类)
- **优先级**: P0

### 0.2 统一存储抽象
- **问题**: Web 模式用 localStorage，Electron 模式将用 fs/SQLite，两套代码路径
- **方案**: 定义 `StorageAdapter` 接口（get/set/delete/list），提供两个实现：
  - `WebStorageAdapter`: localStorage + IndexedDB（大对象）
  - `ElectronStorageAdapter`: fs + SQLite（Phase 5 实现，现在只留接口）
- **约束**: 上层代码只依赖接口，不直接碰存储 API
- **参考**: Opcode (apiAdapter.ts 双模适配)
- **优先级**: P0

### 0.3 性能基线
- **问题**: 没有基准数据，优化无从量化，退化无从发现
- **方案**: 建立 4 个核心指标的自动化测量：
  | 指标 | 定义 | 目标 |
  |------|------|------|
  | TTFT | 发送消息到首个 token 渲染的时间 | < 300ms (本地) |
  | 输入回显 | 按键到字符出现在 textarea 的时间 | < 16ms |
  | 长会话 FPS | 200+ 条消息时的滚动帧率 | > 50fps |
  | 内存 | 200 条消息后的堆内存占用 | < 150MB |
- **实现**: Playwright 脚本 + `performance.mark/measure` + CI 回归
- **优先级**: P0

### 0.4 安全基线
- **问题**: 无系统性安全策略，随着功能增长风险面扩大
- **方案**:
  - **密钥存储**: 所有 API key / token 统一走 `SecretStore` 接口（Web: 加密 localStorage，Electron: keychain）
  - **权限默认拒绝**: 工具调用默认需审批，allowlist 手动放行
  - **审计日志**: 每次工具执行记录 timestamp + tool + args hash + result status
  - **远程 Threat Model**: Phase 7 前完成，覆盖中间人/会话劫持/注入攻击面
- **参考**: YepAnywhere (SRP-6a + TweetNaCl E2E)、Conductor (本地优先)
- **优先级**: P1

**Phase 0 验收标准**:
- [ ] `StreamEvent` Zod schema 定义完成，前后端共用同一份 schema
- [ ] `StorageAdapter` 接口 + `WebStorageAdapter` 实现，3 个 store 迁移完成
- [ ] 性能基线脚本在 CI 中运行，4 个指标有初始数据
- [ ] `SecretStore` 接口定义完成，无明文密钥残留
- [ ] 无已知 P0 性能回归

**风险**:
- Schema 迁移可能破坏 Demo 模式的消息流 → 先写迁移测试
- 性能基线脚本依赖 Playwright 稳定性 → 设 3 次重试 + 取中位数

---

## Phase 1: 基础补全 (v0.4)

| Owner | 工时 | 前置依赖 | 发布通道 |
|-------|------|---------|---------|
| 前端为主 + 服务端计费 | ~8d | Phase 0 (StorageAdapter, StreamEvent schema) | alpha |

修复核心短板，让产品从"能用"变成"好用"。

### 1.1 会话持久化
- **问题**: 当前会话数据仅在内存中，刷新即丢失
- **方案**: 通过 `StorageAdapter`（Phase 0.2）实现，Web 模式用 localStorage + IndexedDB
- **参考**: Opcode (SQLite)、OpenChamber (Zustand persist + localStorage)
- **优先级**: P0

### 1.2 语法高亮
- **问题**: 代码块无语法高亮，可读性差
- **方案**: Shiki（主题感知，支持 light/dark）
- **参考**: OpenChamber (Shiki + streamdown)、ClaudeCodeUI (CodeMirror)
- **说明**: Shiki 比 Prism.js 更现代，支持 VS Code 主题格式，与 Codeye 的设计系统更匹配
- **优先级**: P0

### 1.3 费用追踪模块
- **问题**: 当前只有基础的 cost/token 显示，无历史统计
- **方案**: 读取 `~/.claude/projects/` 下的 JSONL 会话文件，四维 token 追踪
- **参考**: Opcode (最佳实现，`usage.rs`)
- **关键学习点**:
  - 数据源：直接读 JSONL 文件而非解析 CLI 输出
  - 四维追踪：input / output / cache_write / cache_read
  - 优先使用 JSONL 中的 `costUSD` 字段，自行计算作为 fallback
  - message_id + request_id 组合去重
  - 按模型/日期/项目/会话四维聚合统计
- **交付物**:
  - UsageDashboard 页面（总费用/会话数/Token/均价卡片）
  - 按模型 / 按日期 / 按会话的统计 Tab
  - 会话级别的实时费用显示
- **准确性防线** (必须同步交付):
  - JSONL fixture 回放测试：用真实 JSONL 片段作为 test fixture，断言费用计算结果
  - 价格表版本化：`PRICE_TABLE_VERSION` 常量 + 模型-价格映射独立文件，unknown model 返回 `null` 并 warn（不默认 0）
  - 去重/时间排序回归测试：构造含重复 message_id 的 fixture，断言去重后计数正确
- **优先级**: P0

### 1.4 设置面板
- **问题**: 设置面板存在但无实际内容
- **方案**: 分 Tab 实现核心设置
- **参考**: Opcode (8 Tab)、OpenChamber (16 页面)
- **初期 Tab**:
  - General: 主题(light/dark)、字体大小、Claude CLI 路径
  - Model: 默认模型、各模型价格参考
  - Shortcuts: 快捷键查看（后续可自定义）
  - About: 版本信息、链接
- **优先级**: P1

### 1.5 错误处理
- **问题**: 无 Error Boundary，无 loading spinner，错误消息过于通用
- **方案**: React Error Boundary + 用户友好错误提示 + 连接状态指示器
- **优先级**: P1

**Phase 1 验收标准**:
- [ ] 刷新页面后会话消息、模型选择、费用数据全部恢复
- [ ] 代码块支持 ≥10 种语言的语法高亮，主题跟随 light/dark
- [ ] 费用追踪：JSONL fixture 回放测试 ≥5 个 case 全部通过
- [ ] 费用追踪：unknown model 不计入费用，UI 显示警告
- [ ] 费用追踪：含重复 message_id 的 fixture 去重正确
- [ ] Settings 面板 4 个 Tab 可用，设置持久化
- [ ] Error Boundary 捕获渲染错误并显示友好提示
- [ ] 性能基线无回归（TTFT / FPS / 内存均在目标范围内）

**风险**:
- JSONL 格式可能随 Claude CLI 版本变化 → 用 schema 校验 + 容错解析
- Shiki 初始化较慢（WASM 加载）→ 延迟初始化 + 首屏 fallback 纯文本

---

## Phase 2: 对话体验升级 (v0.5)

| Owner | 工时 | 前置依赖 | 发布通道 |
|-------|------|---------|---------|
| 前端 (渲染 + 交互) | ~10d | Phase 1 (持久化, Shiki), Phase 0 (StreamEvent) | beta |

让对话体验从"能看"变成"享受"。这是 Codeye 的核心竞争力。

### 2.1 流会话管理层
- **问题**: 流状态绑定在 React 组件生命周期中，切页/重挂载会中断流
- **方案**: 独立的 `StreamSessionManager`，脱离 React 生命周期
  - 流状态存储在 globalThis 单例中（HMR / 页面切换不丢失）
  - 支持快照（snapshot）保存和恢复
  - idle GC：330s 无活动自动清理资源
  - 每个 session 独立的 AbortController
- **参考**: CodePilot (`stream-session-manager.ts` — globalThis 单例 + snapshot + idle timeout + GC)
- **优先级**: P0

### 2.2 Turn 分组系统
- **问题**: 消息是扁平列表，长对话可读性差
- **方案**: 将消息组织成 Turn（轮次），每个 Turn = 用户消息 + AI 回复 + 工具活动
- **参考**: OpenChamber (`projectTurnRecords.ts` — Turn 分组是其最佳设计)
- **效果**: 按轮次折叠/展开工具活动，长对话清晰整洁
- **优先级**: P0

### 2.3 流式 Markdown 渲染优化
- **问题**: 当前用 react-markdown，流式渲染时会闪烁/重排
- **方案**: 迁移到 Streamdown（Vercel 开源，专为 AI 流式输出设计）
- **参考**: OpenChamber (streamdown + Shiki)、Kiro (v0.11 smoother streaming animation)
- **Streamdown 优势**:
  - 内建 caret indicator（打字光标动画）
  - 未结束 block 的容错解析（流式场景必需）
  - Shiki 代码高亮集成
  - tree-shakeable 插件架构
  - 安全防护（阻止恶意注入）
- **优先级**: P0

### 2.4 乐观更新
- **问题**: 发送消息后有短暂的空白等待期
- **方案**: 发送时立即显示用户消息（`optimistic-{uuid}`），真实响应到达后无缝替换
- **参考**: Kiro / KiloCode (optimistic user messages 模式)
- **优先级**: P1

### 2.5 虚拟滚动
- **问题**: 长对话消息列表性能下降
- **方案**: @tanstack/react-virtual（阈值 40 条消息开启）
- **参考**: OpenChamber (`@tanstack/react-virtual` + `VirtualizedCodeBlock.tsx`)
- **注意**: 代码块也需要独立虚拟化（大文件只渲染可见区域）
- **优先级**: P1

### 2.6 Diff 查看器
- **问题**: 文件编辑类工具调用只显示原始参数，无法直观看到改动
- **方案**: 内嵌 Diff 视图（side-by-side / inline 模式切换），嵌入聊天面板
- **参考**: Conductor (diff-first review 是核心设计理念)、OpenChamber (`@pierre/diffs`)、Opcode (Checkpoint diff)
- **关键**: Conductor 证明了"在聊天中看 diff"比"切换到另一个视图看 diff"体验好得多
- **优先级**: P1

### 2.7 消息搜索
- **问题**: 无法在历史消息中搜索
- **方案**: 全文搜索 + 高亮匹配 + 跳转到结果
- **参考**: ClaudeCodeUI (fuse.js 模糊搜索)
- **优先级**: P2

### 2.8 上下文引用系统
- **问题**: 用户只能输入纯文本，无法引用文件/代码
- **方案**: `#` 前缀引用（`#file`、`#codebase`、`#url` 等），支持组合使用
- **参考**: Kiro (# 上下文注入是其核心交互模式)
- **Kiro 支持的引用类型**: #codebase、#file、#folder、#git diff、#terminal、#problems、#url、#code
- **优先级**: P2

**Phase 2 验收标准**:
- [ ] 切换浏览器 Tab 再切回，流式输出不中断、不丢内容
- [ ] 200 条消息的会话中，Turn 折叠/展开操作 < 100ms
- [ ] Streamdown 渲染：流式输出无闪烁，代码块语法高亮正确
- [ ] 乐观更新：发送消息后 < 16ms 内用户消息可见
- [ ] 虚拟滚动：200+ 消息滚动 FPS > 50
- [ ] Diff 视图：Edit 类工具调用显示 side-by-side diff
- [ ] 性能基线无回归

**风险**:
- Streamdown 是相对新的库，API 可能变动 → pin 版本 + 适配层
- 虚拟滚动与自动追底冲突（OpenChamber/Cline 都踩过坑）→ 区分 wheel/touch 意图
- 流会话管理层引入 globalThis 单例 → 确保 SSR 安全（虽然 Codeye 目前不做 SSR）

---

## Phase 3: Git 工作流 + 高级功能 (v0.6)

| Owner | 工时 | 前置依赖 | 发布通道 |
|-------|------|---------|---------|
| 全栈 (Git 集成 + 前端 UI) | ~12d | Phase 2 (Diff 查看器), Phase 1 (设置面板) | beta |

Git 分支管理从 Phase 3 前置到此处。一 workspace 一 branch 是 Conductor 验证过的最佳实践。

### 3.1 Git 分支管理
- **问题**: 会话与 Git 分支无关联，无法隔离不同任务的代码变更
- **方案**: 分阶段实现
  1. **会话关联分支**: 创建会话时可选"关联新分支"，StatusBar 显示当前分支
  2. **自动分支命名**: 首轮对话后，AI 根据内容建议分支名（`feat/xxx`），用户可内联编辑
  3. **一 workspace 一 branch 约束**: 同一分支只能被一个会话 checkout
- **参考**: Conductor (核心卖点：workspaces & branches)
- **优先级**: P0

### 3.2 Git Worktree 隔离
- **问题**: 多个会话在同一工作目录操作会互相干扰
- **方案**:
  - `git worktree add ~/codeye/workspaces/<session-id> -b <branch-name>`
  - **Setup script 模板**: 自动安装依赖 + `ln -s "$ROOT/.env" .env`
  - **Run script 模板**: 启动 dev server 或其他命令
  - **Archive script 模板**: 清理临时文件，保留 worktree 以备恢复
  - 工作区状态：backlog / in progress / in review / done
- **参考**: Conductor (workspaces, setup/archive scripts)
- **约束**: 只有 Git 跟踪的文件会进入 worktree，.env 等通过 setup script 软链
- **优先级**: P1

### 3.3 一键 PR 创建
- **问题**: 从 Codeye 到 GitHub PR 需要切出去操作
- **方案**: UI 中一键 `gh pr create`，支持编辑标题/描述，显示 CI 状态
- **参考**: Conductor (PR creation + Checks tab + CI status)
- **优先级**: P2

### 3.4 自定义主题系统
- **问题**: 当前只有一套固定的浅色主题
- **方案**: JSON 主题文件 + Dark/Light 切换 + 用户自定义
- **参考**: OpenChamber (20+ 预置主题 + JSON 自定义)、Opcode (oklch 自定义颜色)、Kiro (主题数据)
- **实现**: 每个主题是一个 JSON 文件，定义所有 CSS 变量的值。放入 `~/.codeye/themes/` 即可加载
- **Kiro Dark 主题参考** (Codeye Dark 模式的基准):
  - 背景梯度: #19161d -> #211d25 -> #28242e -> #352f3d -> #4a464f
  - 品牌紫: #7138cc (实色) / #8e47ff (hover) / #b080ff (accent)
  - 关键技巧: 同一主色 + 不同透明度区分状态（而非定义多个颜色变量）
- **优先级**: P1

### 3.5 自定义斜杠命令
- **问题**: 斜杠命令是硬编码的，用户无法扩展
- **方案**: 用户可创建自定义命令（名称 + 模板 + 允许的工具列表）
- **参考**: Opcode (SlashCommandsManager)、OpenChamber (commands 设置页)
- **优先级**: P1

### 3.6 权限审批 UI
- **问题**: 工具调用直接执行，无审批流程
- **方案**: 工具调用前的审批卡片 + Toast 通知 + 批量审批
- **参考**: OpenChamber (权限管理 UI)、ClaudeCodeUI (`waitForToolApproval`)、YepAnywhere (分层审批)
- **优先级**: P1

### 3.7 Checkpoint / 回退
- **问题**: 无法回退到之前的状态
- **方案**: 每次 AI 响应前用 private git ref 保存快照，支持一键回退到任意轮次
- **参考**: Conductor (private git ref checkpoint，消息悬停回退)、Opcode (4 种策略，content-addressable storage)
- **说明**: Conductor 的方案更轻量（基于 git ref），Opcode 的方案更重但更精确（文件级快照）
- **优先级**: P2

### 3.8 Hooks / MCP 管理
- **问题**: Claude Code 的 Hooks 和 MCP 配置需要手动编辑 JSON
- **方案**: 可视化编辑器（PreToolUse / PostToolUse / Stop）+ MCP Server 列表/连接测试/JSON 导入导出
- **参考**: Opcode (HooksEditor)、OpenChamber (mcp 设置页)
- **优先级**: P2

**Phase 3 验收标准**:
- [ ] 创建会话时可选"关联新分支"，StatusBar 正确显示分支名
- [ ] 首轮对话后弹出分支重命名建议，用户可接受/编辑/跳过
- [ ] 同一分支无法被第二个会话 checkout（UI 提示冲突）
- [ ] Worktree 创建后 setup script 自动执行，.env 软链成功
- [ ] `gh pr create` 从 UI 触发，PR 创建成功并返回链接
- [ ] Dark 主题可用，配色与 Kiro Dark 基准一致
- [ ] Checkpoint 回退后代码和消息状态正确
- [ ] 性能基线无回归

**风险**:
- Worktree 在 Windows 上行为差异 → 先 macOS/Linux，Windows 降级为 branch-only
- Setup script 执行权限问题 → 创建时自动 chmod +x
- 分支命名冲突 → 自动加后缀 `-2`, `-3`

---

## Phase 4: 性能与体验打磨 (v0.7)

| Owner | 工时 | 前置依赖 | 发布通道 |
|-------|------|---------|---------|
| 前端 + 服务端 (WebSocket) | ~6d | Phase 0 (性能基线), Phase 2 (虚拟滚动, Streamdown) | beta → stable 候选 |

从"好用"到"丝滑"。有了 Phase 0 的基线，优化可量化。

### 4.1 React 渲染优化
- **问题**: 长对话时可能出现卡顿
- **方案**: React.memo / useMemo / useCallback 关键路径优化
- **反面教材**: OpenChamber 37 个 Store 导致级联渲染，Codeye 应保持当前 3 Store 的精简架构
- **优先级**: P0

### 4.2 流式输出优化（延迟预算）
- **问题**: 高频流式输出可能导致浏览器帧率下降
- **延迟预算目标**:
  | 环节 | 目标 |
  |------|------|
  | 输入体感反馈 | < 16ms（一帧内可见） |
  | 首 token 渲染 (TTFT) | < 300ms (本地) |
  | 流式输出帧率 | > 50fps |
- **方案**: 分层优化
  1. **先上本地回显 overlay**：输入框按键立即渲染，不等服务端确认
  2. **自适应批处理**：基础间隔 16ms (60fps)，事件密集时扩大到 50ms
  3. **大包立即 flush**：超过 32KB 立即渲染，不等批次
  4. **per-session 独立定时器**：避免一个繁忙 session 拖慢其他
  5. **Cloudflare tunnel 场景**：追加 8KB SSE padding 强制代理 flush
- **参考**: Codeman (`xterm-zerolag-input`, `server-timing.ts`, `batchTerminalData()`)
- **优先级**: P1

### 4.3 WebSocket 连接增强
- **问题**: 当前自动重连过于简单
- **方案**: 指数退避重连 + 心跳检测 + 连接质量指示器 + 离线消息队列
- **参考**: Codeman (tunnel padding 策略)、CodePilot (StreamSessionManager snapshot)
- **优先级**: P1

### 4.4 PWA 支持
- **问题**: 只能作为网页访问，无离线能力
- **方案**: Service Worker + PWA manifest + 离线缓存
- **参考**: OpenChamber (完整 PWA)
- **优先级**: P2

**Phase 4 验收标准**:
- [ ] 输入回显 < 16ms（Playwright 测量 p95）
- [ ] 200+ 消息流式输出时 FPS > 50（Chrome DevTools Performance 录制）
- [ ] 内存 200 条消息后 < 150MB（`performance.measureUserAgentSpecificMemory`）
- [ ] TTFT < 300ms (本地模式，p95)
- [ ] WebSocket 断线后 < 5s 自动重连，期间消息不丢
- [ ] 所有性能指标相比 Phase 0 基线无回归或有改善

**风险**:
- 自适应批处理参数需要针对不同设备调优 → 暴露为可配参数
- 本地回显 overlay 与最终渲染不一致 → 仅用于 textarea，不做终端 overlay

---

## Phase 5: Electron 桌面版 (v0.8)

| Owner | 工时 | 前置依赖 | 发布通道 |
|-------|------|---------|---------|
| Electron 主进程 + 适配层 | ~8d | Phase 0 (StorageAdapter 接口), Phase 4 (性能达标) | alpha → beta |

完成桌面端体验。

### 5.1 Electron 主进程实现
- **问题**: IPC 接口已定义但 handler 未实现
- **方案**: 实现所有 IPC handler（claude query/stop、session CRUD、project management）
- **交付物**: macOS dmg 可分发
- **优先级**: P0

### 5.2 双模适配层
- **问题**: Electron 和 Browser 模式代码路径分散
- **方案**: 统一 API 适配器（自动检测环境），复用 Phase 0 的 `StorageAdapter`
- **参考**: Opcode (`apiAdapter.ts` — 最优雅的双模实现)
  - 一套前端代码同时支持桌面和浏览器
  - Tauri invoke 失败时自动降级到 REST API
  - 用 CustomEvent 模拟桌面事件系统
- **优先级**: P0

### 5.3 系统级集成
- 全局快捷键唤起
- 系统通知（权限审批、任务完成）
- 菜单栏集成
- 文件拖拽
- **密钥存储**: `ElectronSecretStore` 实现（macOS Keychain / Windows Credential Manager）
- **优先级**: P1

**Phase 5 验收标准**:
- [ ] `npm run dist` 产出可安装的 macOS dmg
- [ ] Electron 模式下所有 Phase 1-4 功能正常工作
- [ ] 双模适配：同一份前端代码在 Browser 和 Electron 中均可运行
- [ ] 密钥通过 OS keychain 存储，不落盘明文
- [ ] 性能基线：Electron 模式下 TTFT / FPS 不劣于 Browser 模式

**风险**:
- Electron 安全策略（CSP、nodeIntegration）→ 遵循 Electron 安全最佳实践
- 打包体积过大 → 分析依赖，tree-shake 未使用模块

---

## Phase 6: 分发与国际化 (v0.9)

| Owner | 工时 | 前置依赖 | 发布通道 |
|-------|------|---------|---------|
| 全栈 + 发布工程 | ~5d | Phase 5 (Electron dmg), Phase 4 (性能达标) | stable |

降低安装门槛，扩大用户覆盖。

### 6.1 npm 全局包
- **方案**: `npx codeye` 一键启动
- **参考**: ClaudeCodeUI (`npx @siteboon/claude-code-ui`)
- **优先级**: P1

### 6.2 国际化 (i18n)
- **方案**: i18next + 语言包（EN/ZH-CN 起步）
- **参考**: ClaudeCodeUI (6 种语言完整翻译)
- **优先级**: P2

### 6.3 认证系统（可选）
- **方案**: 本地 SQLite + JWT（团队共享部署场景）
- **参考**: ClaudeCodeUI (bcrypt + jsonwebtoken)
- **说明**: 仅在团队部署场景需要，个人使用不需要
- **优先级**: P3

**Phase 6 验收标准**:
- [ ] `npx codeye` 在干净环境下 < 60s 启动成功
- [ ] EN/ZH-CN 语言切换无遗漏文案
- [ ] 认证模式下未登录用户无法访问聊天功能

---

## Phase 7: 远程桥接 (v1.0) [长期]

| Owner | 工时 | 前置依赖 | 发布通道 |
|-------|------|---------|---------|
| 服务端 + 安全 + 前端 | ~15d | Phase 0 (安全基线 + Threat Model), Phase 4 (延迟预算达标) | alpha → beta |

让 Codeye 支持远程服务器上的 Claude Code。

### 7.1 远程连接架构
- **方案**: SSH 隧道 + WebSocket 中继
- **参考**:
  - CodePilot: Agent SDK + SSE 流（结构化但有延迟）
  - Codeman: PTY + node-pty（原始但零延迟）
  - YepAnywhere: E2E 加密中继（安全但复杂）
- **推荐**: 初期用 SSH 隧道 + 现有 WebSocket proxy，后期考虑 E2E 加密
- **前置要求**: Phase 0.4 的远程 Threat Model 必须完成
- **优先级**: P2

### 7.2 零延迟输入（延迟预算 < 16ms）
- **目标**: 远程场景下输入体感与本地无异
- **方案**: 分层递进
  1. **先上本地回显 overlay**（Phase 4.2 已实现），远程场景直接复用
  2. **链路优化**: WebSocket 二进制帧 + 压缩 + 连接复用
  3. **终端模式（可选）**: Codeman 的 `xterm-zerolag-input` addon
- **参考**: Codeman (`xterm-zerolag-input` — DOM overlay 0ms 反馈 + Enter 时才发送)
- **说明**: 先确保聊天模式的延迟达标，终端模式作为可选增强
- **优先级**: P2

### 7.3 多 Agent 支持
- **方案**: Provider 抽象层（统一 interface 封装不同 CLI）
- **参考**: ClaudeCodeUI (Claude/Cursor/Codex/Gemini 4 家 provider)
- **优先级**: P3

**Phase 7 验收标准**:
- [ ] SSH 隧道连接远程 Claude Code，消息收发正常
- [ ] 远程模式输入回显 < 50ms（p95，排除网络延迟本身）
- [ ] 远程模式流式输出无明显卡顿（FPS > 30）
- [ ] Threat Model 覆盖中间人/会话劫持/注入 3 类攻击面
- [ ] E2E 加密可选启用，密钥不经过中继服务器

---

## Phase 8: 差异化功能 (v1.x) [远期]

打造 Codeye 的独特价值。

### 8.1 会话 Fork/Clone
- 从任意消息点创建分支，探索替代方案
- **参考**: YepAnywhere (在所有竞品中独有)

### 8.2 分层收件箱
- Needs Attention / Active / Recent / Unread 四级组织
- **参考**: YepAnywhere (在所有竞品中独有)

### 8.3 全局活动流
- 跨会话的文件修改实时视图
- **参考**: YepAnywhere (在所有竞品中独有)

### 8.4 Skills 市场
- 可安装/管理 Claude Code 技能（类插件生态）
- **参考**: OpenChamber (skills.installed + skills.catalog)

### 8.5 Multi-Run
- 同一提示词同时发给多个模型并行执行、对比结果
- **参考**: OpenChamber

### 8.6 内置终端
- 在 Codeye 中直接执行命令
- **参考**: ClaudeCodeUI (xterm.js + WebGL)、Codeman (ghostty-web)

### 8.7 文件浏览器 + 代码编辑器
- 将 Codeye 从"聊天工具"进化为"轻量 IDE"
- **参考**: ClaudeCodeUI (完整文件浏览器 + CodeMirror 编辑器)

---

## 竞品参考索引

| 竞品 | 核心参考价值 | 关键文件/文档 |
|------|-------------|-------------|
| **Kiro** | UI 风格、对话渲染、上下文引用、Streamdown | [kiro.dev/docs/chat](https://kiro.dev/docs/chat/) |
| **Opcode** | 计费模块、Checkpoint、双模适配、设置系统 | `usage.rs`, `apiAdapter.ts` |
| **CodePilot** | SSE 流管理、StreamSessionManager、SDK 集成 | `stream-session-manager.ts` |
| **Codeman** | 零延迟输入、60fps 批处理、PTY 桥接 | `xterm-zerolag-input`, `server-timing.ts` |
| **OpenChamber** | Turn 分组、虚拟滚动、主题系统、设置系统 | `projectTurnRecords.ts`, `VirtualizedCodeBlock.tsx` |
| **ClaudeCodeUI** | 多 Provider、i18n、npm 发布、认证 | `modelConstants.js`, i18n locales |
| **YepAnywhere** | 会话 Fork、分层收件箱、E2E 加密、移动优先 | [competitive/all-projects.md](https://github.com/kzahel/yepanywhere/blob/main/docs/competitive/all-projects.md) |
| **Conductor** | Git Worktree 隔离、diff-first review、checkpoint 回退 | [docs.conductor.build](https://docs.conductor.build) |

---

## 附录 A: 数据迁移策略

每次 schema 变更都可能让用户丢数据。以下规则确保"升级不丢、降级可回"。

### Schema 版本化

所有持久化数据结构带 `_schemaVersion` 字段：

```typescript
interface PersistedSession {
  _schemaVersion: 2;  // 递增，不可跳版本
  id: string;
  messages: DisplayMessage[];
  // ...
}
```

### 迁移管道

```
读取原始数据 → 检查 _schemaVersion → 依次执行 v1→v2→v3 迁移函数 → 写入最新 schema
```

- **迁移函数**: `migrations/` 目录下按版本号命名（`v1-to-v2.ts`），每个函数是纯函数，入参旧 schema 出参新 schema
- **不可跳版本**: v1 数据必须经过 v1→v2→v3 链式迁移，不能直接 v1→v3
- **迁移测试**: 每个迁移函数必须有对应 test fixture（旧版本 JSON → 断言新版本 JSON）

### 回滚方案

| 场景 | 策略 |
|------|------|
| 升级后发现 bug | 迁移前自动备份到 `_backup_v{N}` key，回滚时恢复 |
| 新版本写入了旧版本不认识的字段 | 旧版本忽略未知字段（Zod `.passthrough()`），不崩溃 |
| 完全无法解析 | 兜底：清空 + 提示"数据已损坏，已重置"，备份原始 JSON 到 `_corrupted_{timestamp}` |

### 兼容窗口

- **向后兼容 2 个主版本**: v0.6 必须能读 v0.4 的数据
- **超出兼容窗口的旧数据**: 启动时提示"数据格式过旧，是否迁移？"，用户确认后执行
- **Settings schema**: 同样版本化，新设置项必须有 default 值（旧配置缺失字段不报错）

### 关键数据的迁移时机

| 数据类型 | 首次引入 | 迁移触发点 |
|---------|---------|-----------|
| 会话消息 | Phase 1 (v0.4) | 每次启动 + 版本检查 |
| 设置/偏好 | Phase 1 (v0.4) | 每次启动 + 版本检查 |
| Turn 分组结构 | Phase 2 (v0.5) | v0.4→v0.5 迁移：扁平消息列表 → Turn 结构 |
| 费用统计缓存 | Phase 1 (v0.4) | 缓存失效即重算（无需迁移，JSONL 是 source of truth） |
| 主题配置 | Phase 3 (v0.6) | 新增字段给 default 值 |
| Git 分支关联 | Phase 3 (v0.6) | 旧会话无分支信息 → 显示"未关联" |

---

## 附录 B: 观测与告警

没有观测的性能目标只是愿望。以下定义每个指标的采集方式、阈值和告警规则。

### 核心指标采集

| 指标 | 采集方式 | 上报频率 |
|------|---------|---------|
| **TTFT** | `performance.mark('msg-sent')` → `performance.mark('first-token')` → `performance.measure()` | 每次消息 |
| **输入延迟** | `keydown` 时间戳 vs `requestAnimationFrame` 中的 DOM 更新时间戳 | 采样 1/10 按键 |
| **滚动 FPS** | `requestAnimationFrame` 计数器，500ms 窗口取均值 | 滚动期间连续 |
| **内存** | `performance.measureUserAgentSpecificMemory()`（Chrome only）/ `performance.memory` fallback | 每 60s |
| **错误率** | 全局 `window.onerror` + `unhandledrejection` + React Error Boundary 计数 | 实时 |
| **WS 重连率** | WebSocket `close` 事件计数 / 运行时长 | 每次重连 |
| **流中断率** | 流式输出开始但未正常结束（无 `result` 事件）的比例 | 每次流结束 |

### 告警阈值

| 指标 | 正常 | 警告 | 严重 |
|------|------|------|------|
| TTFT (本地) | < 300ms | 300-800ms | > 800ms |
| TTFT (远程) | < 1000ms | 1-3s | > 3s |
| 输入延迟 | < 16ms | 16-50ms | > 50ms |
| 滚动 FPS | > 50 | 30-50 | < 30 |
| 内存 (200 条消息) | < 150MB | 150-300MB | > 300MB |
| 错误率 | < 0.1% | 0.1-1% | > 1% |
| WS 重连率 | < 1 次/小时 | 1-5 次/小时 | > 5 次/小时 |
| 流中断率 | < 1% | 1-5% | > 5% |

### 告警机制

**开发阶段** (Phase 0-4):
- 指标写入浏览器 `console.warn` / `console.error`
- CI 中 Playwright 脚本断言 p95 在阈值内，失败则阻断合并
- StatusBar 显示当前 TTFT / FPS（开发模式可见）

**正式发布后** (Phase 6+):
- 可选匿名遥测（opt-in，PostHog 或自建）
- 本地性能日志写入 `~/.codeye/perf.log`（最近 7 天滚动）
- Settings 中可查看本地性能趋势图

### CI 回归守护

```yaml
# 每个 PR 必跑
perf-gate:
  - 启动 dev server + Demo 模式
  - Playwright 发送 5 条消息
  - 断言 TTFT p95 < 300ms
  - 断言 200 条消息滚动 FPS p50 > 50
  - 断言内存 < 150MB
  - 任一指标超标 → PR 标记 "perf-regression"，不阻断但必须 review
```

---

## 附录 C: 发布节奏

### 通道定义

| 通道 | 稳定性 | 受众 | 更新频率 |
|------|--------|------|---------|
| **alpha** | 可能有 breaking change，数据可能不兼容 | 开发者自己 | 每次 Phase 完成 |
| **beta** | API 稳定，可能有 UI bug | 内测用户 / 早期使用者 | 每 2-4 周 |
| **stable** | 充分验证，生产可用 | 所有用户 | 每 1-2 个月 |

### Go/No-Go Gate

每个 Phase 从 alpha 晋升到 beta/stable 前，必须通过以下检查：

**Alpha → Beta Gate**:
- [ ] 所有 Phase 验收标准 checklist 100% 通过
- [ ] 性能基线无 P0 回归
- [ ] 无已知 P0/P1 bug
- [ ] 数据迁移测试全部通过（含从前一版本升级）
- [ ] E2E 测试覆盖核心用户流

**Beta → Stable Gate**:
- [ ] Beta 期间 ≥ 7 天无 P0 bug
- [ ] 性能指标 p95 全部在"正常"阈值内
- [ ] 数据迁移从最老的兼容版本测试通过
- [ ] 错误率 < 0.1%（基于本地日志或遥测）
- [ ] 变更日志（CHANGELOG.md）已更新

### 版本号规则

```
v0.{Phase}.{patch}[-alpha.N | -beta.N]

示例:
v0.3.1          — Phase 0 补丁（alpha 隐含）
v0.4.0-alpha.1  — Phase 1 首个 alpha
v0.4.0-beta.1   — Phase 1 首个 beta
v0.4.0          — Phase 1 stable
v0.5.0-alpha.1  — Phase 2 首个 alpha
v1.0.0          — Phase 7 达成（远程桥接完成），首个 major
```

### Phase 与发布通道映射

| Phase | 首次发布 | 目标晋升 |
|-------|---------|---------|
| Phase 0 (v0.3.x) | alpha | alpha（内部基建，不对外） |
| Phase 1 (v0.4) | alpha | alpha → beta（首次可体验版本） |
| Phase 2 (v0.5) | beta | beta（对话体验是核心卖点） |
| Phase 3 (v0.6) | beta | beta |
| Phase 4 (v0.7) | beta → stable 候选 | stable 候选（性能达标才可 stable） |
| Phase 5 (v0.8) | alpha → beta | beta（桌面版需要额外验证周期） |
| Phase 6 (v0.9) | stable | stable（首次公开发布） |
| Phase 7 (v1.0) | alpha → beta | stable |

---

## 开发原则

1. **Phase 0 先行**: 事件协议、存储抽象、性能基线、安全基线是地基，不可跳过
2. **避免 OpenChamber 的膨胀陷阱**: 保持 3 个 Zustand Store 的精简架构，不要拆成 37 个
3. **功能而非代码量**: OpenChamber 15.7 万行但卡顿，ClaudeCodeUI 4 万行但流畅
4. **每个 Phase 可验收**: 功能验收 + 性能验收 + 回归覆盖，否则"完成但不可用"
5. **性能优先**: 参考 Codeman 的 60fps 策略，延迟预算贯穿全程
6. **数据来源准确**: 费用追踪直接读 JSONL 文件（如 Opcode），准确性防线随模块同步交付
7. **安全前置**: 密钥存储、权限默认拒绝、审计日志从 Phase 0 开始，不是事后补丁

---

*最后更新: 2026-03-13*
*基于 8 个竞品深度分析制定 (Kiro, Opcode, CodePilot, Codeman, OpenChamber, ClaudeCodeUI, YepAnywhere, Conductor)*
