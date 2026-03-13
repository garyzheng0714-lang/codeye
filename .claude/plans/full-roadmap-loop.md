# Full Roadmap Sequential Loop Plan

## Pattern: sequential
## Mode: safe (quality gates after each phase)
## Stop Condition: All 8 phases complete OR context exhaustion

## Execution Order

### Phase 0: 基础层补全 (partially done)
- [x] 0.2 StorageAdapter
- [x] 0.4 SecretStore interface
- [ ] 0.1 StreamEvent `{ version, type, payload }` protocol
- [ ] 0.3 Performance baseline (performance.mark/measure + Playwright assertions)
- [ ] 0.4 Integrate SecretStore into business code
- Gate: `npm test` + `tsc --noEmit` + commit

### Phase 1: 基础补全
- [x] 1.1 Session persistence
- [ ] 1.2 Shiki syntax highlighting
- [ ] 1.3 Cost tracking (JSONL parser + UsageDashboard)
- [ ] 1.4 Settings panel (4 tabs: General, Model, Shortcuts, About)
- [ ] 1.5 Error Boundary + connection status indicator
- Gate: `npm test` + `tsc --noEmit` + E2E + commit

### Phase 2: 对话体验升级
- [ ] 2.1 StreamSessionManager (globalThis singleton)
- [ ] 2.2 Turn grouping system
- [ ] 2.3 Streaming Markdown optimization
- [ ] 2.4 Optimistic updates
- [ ] 2.5 Virtual scrolling (@tanstack/react-virtual)
- [ ] 2.6 Diff viewer
- [ ] 2.7 Message search
- [ ] 2.8 Context reference system (#file, #codebase)
- Gate: `npm test` + `tsc --noEmit` + E2E + commit

### Phase 3: Git + 高级功能
- [ ] 3.1 Git branch management
- [ ] 3.2 Git Worktree isolation
- [ ] 3.3 One-click PR creation
- [ ] 3.4 Theme system (JSON themes + dark/light)
- [ ] 3.5 Custom slash commands
- [ ] 3.6 Permission approval UI
- [ ] 3.7 Checkpoint/rollback
- [ ] 3.8 Hooks/MCP management UI
- Gate: `npm test` + `tsc --noEmit` + E2E + commit

### Phase 4: 性能打磨
- [ ] 4.1 React rendering optimization
- [ ] 4.2 Streaming output optimization (adaptive batching)
- [ ] 4.3 WebSocket connection enhancement
- [ ] 4.4 PWA support
- Gate: `npm test` + perf assertions + commit

### Phase 5: Electron 桌面版
- [ ] 5.1 Electron main process implementation
- [ ] 5.2 Dual-mode adapter
- [ ] 5.3 System integration (shortcuts, notifications, menus)
- Gate: `npm test` + `npm run build` + commit

### Phase 6: 分发与国际化
- [ ] 6.1 npm global package
- [ ] 6.2 i18n (EN/ZH-CN)
- [ ] 6.3 Auth system (optional)
- Gate: `npm test` + commit

### Phase 7: 远程桥接
- [ ] 7.1 Remote connection architecture (SSH tunnel + WS relay)
- [ ] 7.2 Zero-latency input
- [ ] 7.3 Multi-agent support
- Gate: `npm test` + commit

### Phase 8: 差异化功能
- [ ] 8.1 Session Fork/Clone
- [ ] 8.2 Tiered inbox
- [ ] 8.3 Global activity stream
- [ ] 8.4 Skills marketplace
- [ ] 8.5 Multi-Run
- [ ] 8.6 Built-in terminal
- [ ] 8.7 File browser + code editor
- Gate: `npm test` + commit

## Safety Rules
- Commit after each Phase
- Run tests after each sub-item
- /compact when context > 80%
- Update CLAUDE.md after each Phase
- Re-read CLAUDE.md before each Phase
