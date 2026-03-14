# GitHub 发版指南（仅 DMG）

本项目已配置自动发版工作流：`.github/workflows/release-dmg.yml`。

## 发版方式

### 方式 A（默认）：main 每次更新自动发布
1. 提交并 push 到 `main`。
2. GitHub Actions 会自动计算下一个 patch 版本（例如 `0.1.5 -> 0.1.6`）。
3. 自动创建 `main-v<version>` tag，并发布到 GitHub Releases。
4. Release 资产自动包含：`.dmg` + `.zip` + `latest-mac.yml` + `.blockmap`。

### 方式 B：打稳定 Tag 手动指定版本
1. 本地打 tag（例如 `v0.1.9`）并推送：
   ```bash
   git tag v0.1.9
   git push origin v0.1.9
   ```
2. 工作流会按该 tag 版本发布稳定版。

### 方式 C：手动触发构建（不自动发布）
1. 打开 GitHub 仓库 -> `Actions` -> `Release DMG`。
2. 点击 `Run workflow`。
3. 构建产物在该次 workflow 的 `Artifacts` 中下载（DMG）。

## 说明

- 只构建 macOS 包（`.dmg` + `.zip`，不会产出 Windows/Linux 包）。
- 工作流使用 `macos-14` 运行器；main 更新会排队执行，不会取消前一个发布任务。
- `electron-builder` 已固定 `--publish never`，由 workflow 统一负责发布到 GitHub Releases，可避免 `GH_TOKEN` 缺失导致的构建失败。
- 当前默认不做签名/公证（`CSC_IDENTITY_AUTO_DISCOVERY=false`），首次分发会有 macOS 安全提示，属于预期行为。
- 如需正式分发（减少“无法验证开发者”提示），后续可以再接入 Apple Developer 签名和 notarization。
- App 内「One-click Update」基于 GitHub Releases：必须有更高版本号的 Release，并包含 `latest-mac.yml`、`.zip`、`.dmg`、`.blockmap`。
- 若要真正“应用内自动安装更新”（无需手动拖拽覆盖），macOS 包还需要 **Developer ID** 签名（并建议 notarization）；ad-hoc 签名只能跳转下载页进行手动安装。
