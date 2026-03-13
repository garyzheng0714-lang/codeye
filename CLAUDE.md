# Codeye — Project Rules

> Claude Code 的桌面 GUI。开发时必须遵守以下规则。
> 完整路线图见 `ROADMAP.md`，竞品研究见 memory 中的 `competitive-research.md`。

---

## 当前阶段

**Phase 0 (v0.3.x)** — 基础层搭建中。下一步 Phase 1 (v0.4)。

执行任何功能开发前，先确认该功能属于哪个 Phase，不要跨 Phase 做事。
如果用户要求的功能不在当前 Phase，先说明并确认优先级。

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
- 工具调用默认需审批（Phase 3 权限审批 UI 上线前由 Claude CLI 自身控制）
- 每次工具执行记录审计日志：timestamp + tool + args hash + result status
- 远程桥接（Phase 7）前必须完成 Threat Model

---

## 费用追踪准确性规则

- 数据源：读 `~/.claude/projects/` 下的 JSONL 文件
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
| npm 分发 | ClaudeCodeUI (`npx @siteboon/claude-code-ui`) |
| 会话 Fork | YepAnywhere |

---

## 禁止事项

- 禁止新建第 4 个 Zustand store
- 禁止直接调用 localStorage/IndexedDB（走 StorageAdapter）
- 禁止持久化数据不带 `_schemaVersion`
- 禁止 unknown model 费用默认 0（必须 null + warn）
- 禁止跳过迁移版本（v1 不能直接到 v3）
- 禁止性能指标回归无告警
- 禁止在 Phase 7 Threat Model 完成前实现远程连接功能
