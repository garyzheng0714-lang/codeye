# Codeye TODOS

> 按优先级排序。每项包含背景、动机和执行方向。
> 上次更新：2026-03-18 Eng Review (BIG CHANGE)

---

## P0 — 核心功能

### [TODO-2] DiffPane: 实时文件变更预览
- **What:** 新建 DiffPane 组件 + DiffService + readFile IPC
- **Why:** Codeye 从"聊天 wrapper"变成"AI 控制台"的关键转折点。Claude 编辑文件时，侧面板实时显示 unified diff。竞品没有这个功能
- **Architecture:** activityStream 事件总线 + 可插拔面板模式。DiffPane 订阅 `tool_executed` 事件，不直接耦合 chatStore
- **Eng Review 决策:**
  - V1 只显示最新编辑文件的 diff（多文件 Tab 延期到 TODO-10）
  - activityStream.push 插入点: chatStore.addToolCall 内部（与 resolveApproval 一致的模式）
  - 不需要 Web Worker（1MB 限制 + 500 行截断下 diff < 5ms）
  - diff 语法高亮延期到 V2
- **Scope:**
  - [ ] `services/diffService.ts` — 事件过滤 + diff 计算
  - [ ] `electron/ipc/fileSystem.ts` — readFile IPC (路径验证 + 1MB 限制 + 二进制检测)
  - [ ] `components/Chat/DiffPane.tsx` — unified diff 渲染 (V1: 只显示最新文件)
  - [ ] `activityStream.ts` — 新增 `subscribeByType(type, callback)` 方法
  - [ ] 安全：路径验证防止遍历、审计日志
  - [ ] 性能：大文件截断 (>500 行)、debounce 100ms、diff 计算 <50ms
- **Depends on:** TODO-1 (Hook 拆分)
- **Effort:** L (1-2d)

---

## P1 — 质量加固

### [TODO-1] 拆分 useInputComposer.ts (611行)
- **What:** 将 God Hook 拆分为 3-4 个独立 Hook
- **Why:** 混合了输入管理、slash 命令、上下文引用、附件、命令面板、历史记录 6 个关注点。阻塞所有输入功能扩展
- **Plan:** useSlashCommands (命令过滤/选择) + useInputHistory (上下箭头历史) + useAttachments (文件附件) + useInputComposer (组合层)
- **Eng Review 决策:**
  - 拆分策略: 子 Hook 返回纯状态/actions，handleKeyDown 留在组合层（显式优于巧妙）
  - dispatchPrompt 中的 branch rename 逻辑抽离到独立 useEffect
  - 设置 @testing-library/react，为拆分后的 Hook 写测试
  - 提取 resetInputState() 辅助函数消除重复的状态清理模式
- **Risk:** 拆分可能引入回归 → 现有 E2E 测试覆盖 input.spec.ts / slash-commands.spec.ts
- **Depends on:** 无
- **Effort:** M (2-4h)

### [TODO-3] 更新 ROADMAP.md 反映实际进度
- **What:** ROADMAP 仍显示"当前状态 v0.3"、Phase 0 验收标准全未勾选
- **Why:** 与实际状态 (Phase 0-6+8 已完成) 严重脱节。新贡献者无法了解项目状态
- **Scope:** 更新版本号、勾选已完成的验收标准、标注已跳过的项
- **Depends on:** 无
- **Effort:** S (1h)

### [TODO-4] hooks/components 层单元测试
- **What:** 为 hooks 和 components 层补充单元测试 (当前 0 测试文件)
- **Why:** services 层有 14 个测试文件，但 UI 层完全裸奔。611 行的 useInputComposer 无任何测试
- **Scope:** 设置 React Testing Library + 为拆分后的 hooks 写测试 + AIMessage/DiffPane 组件测试
- **Depends on:** TODO-1 (拆分后测试更高效)
- **Effort:** L (1-2d)

---

## P2 — Delight Features (30分钟级别)

### [TODO-5] DiffPane 未读脉冲动画
- **What:** Claude 编辑文件时，侧边栏的分屏按钮微微发光（紫色脉冲）
- **Why:** 提示用户"有新的文件变更可以看"，微妙但不打扰
- **Effort:** S (~30m)

### [TODO-6] DiffPane 底部状态栏
- **What:** 显示 "diff in 12ms · 3 files changed · +47 -12 · $0.08"
- **Why:** 让用户感觉系统透明可信。像赛车仪表盘——信息密度高但不喧宣
- **Effort:** S (~20m)

### [TODO-7] 费用温感提示
- **What:** 单次对话 >$1 时输入框边框变淡橙色
- **Why:** 温和的成本感知，不是警告。像车辆油量指示灯
- **Effort:** S (~30m)

### [TODO-8] 快捷键速查卡 (Cmd+/)
- **What:** 半透明浮层显示当前可用快捷键
- **Why:** 不用去设置里找，随时查看。比 Cmd+K 命令面板更专注
- **Effort:** S (~45m)

### [TODO-9] 会话时长徽章
- **What:** 会话列表显示 "3m"/"45m"/"2h" 时长
- **Why:** 一眼区分快速提问和深度工作会话
- **Effort:** S (~15m)

### [TODO-10] DiffPane 多文件 Tab 切换
- **What:** DiffPane 支持多文件 Tab，每个被编辑的文件一个 tab
- **Why:** V1 只显示最近一个文件的 diff，但 Claude 经常同时编辑多个文件。Tab 切换让用户能回看任意文件的变更
- **Depends on:** TODO-2 (DiffPane V1)
- **Effort:** M

---

## Deferred (NOT in scope)

- **Multi-Run (多模型并行):** `multiRun.ts` 已存在但未激活，与实时预览无关
- **Phase 7 远程桥接:** CLAUDE.md 禁止在 Threat Model 前实现
- **npm 分发 (`npx codeye`):** 打包分发是正交关注点
- **双向编辑 (DiffPane Phase 3):** 需先完成 DiffPane Phase 1
- **CI/CD 质量门禁:** 重要但不阻塞功能开发
