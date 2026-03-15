# UI 改进设计 (参考 Kiro)

> **For agentic workers:** This is the SPEC - implementation should follow this exactly.

**Goal:** 改进 Codeye UI，参考 Kiro 的设计风格

**Design:**
- 等待状态：添加头像 + 三点动画
- 任务卡片：圆角渐变卡片 + 图标 + 进度条
- 整体风格：圆角、渐变、毛玻璃

---

## 1. 等待状态 (Thinking)

**设计:**
- 可爱机器人头像（圆形，带渐变背景）
- 三点 loading 动画
- 文字提示 "正在思考..."

**组件:** `src/components/Chat/AIMessage.tsx`

---

## 2. 任务卡片 (Steps)

**设计:**
- 圆角渐变卡片背景（紫色→蓝色）
- 任务项：
  - 图标（✓ 完成 / ○ 进行中 / ! 错误）
  - 任务标题和详情
- 进度条显示完成百分比
- 毛玻璃效果

**组件:** `src/components/Chat/AIMessage.tsx` (Steps 区块)

---

## 3. CSS 样式

**文件:** `src/styles/components/messages.css`

需要添加或修改：
- `.thinking-row` - 等待状态样式
- `.ai-steps-block` - 任务卡片样式
- `.steps-progress-bar` - 进度条样式
- 渐变背景和毛玻璃效果
