# White Theme Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将应用默认配色从深色改为纯白色主题

**Architecture:** 修改 themeManager.ts 中的默认主题函数，使浅色主题成为默认，同时确保 Shiki 代码高亮与浅色背景适配

**Tech Stack:** React, CSS Variables, Shiki

---

## Overview

项目已经支持浅色主题（白色背景 + 紫色强调色），只需要将默认主题从深色切换为浅色。主要涉及：

1. 修改 `src/services/themeManager.ts` - 默认返回 `'light'`
2. 验证 Shiki 代码高亮在浅色主题下正常显示

## Files

- Modify: `src/services/themeManager.ts`
- Check: `src/services/shikiHighlighter.ts`

---

## Chunk 1: 更改默认主题

### Task 1: 修改默认主题为浅色

**Files:**
- Modify: `src/services/themeManager.ts:75-83`

- [ ] **Step 1: 修改 getStoredTheme 函数**

修改 `getStoredTheme()` 函数，将默认值从 `'dark'` 改为 `'light'`

```typescript
export function getStoredTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && builtinThemes.has(stored)) return stored;
  } catch {
    // ignore
  }
  return 'light';  // 改为 'light'
}
```

- [ ] **Step 2: 验证更改**

确认修改已生效，重新加载页面验证主题

- [ ] **Step 3: 提交更改**

```bash
git add src/services/themeManager.ts
git commit -m "feat: set light theme as default"
```

---

## Chunk 2: 验证和测试

### Task 2: 验证代码高亮主题

**Files:**
- Check: `src/services/shikiHighlighter.ts`

- [ ] **Step 1: 检查 Shiki 主题配置**

查看 shikiHighlighter.ts 中代码高亮主题的配置，确认是否需要调整

- [ ] **Step 2: 如有问题则修复**

如果代码高亮在浅色主题下显示异常，修复相关配置
