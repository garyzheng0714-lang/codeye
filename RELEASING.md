# GitHub 发版指南（仅 DMG）

本项目已配置自动发版工作流：`.github/workflows/release-dmg.yml`。

## 发版方式

### 方式 A（推荐）：打 Tag 自动发布到 GitHub Releases
1. 确认本地代码通过最少检查（建议）：
   ```bash
   npm test
   npm run dist:mac
   ```
2. 更新版本号（可选，但推荐和 tag 一致）：
   ```bash
   npm version patch
   ```
   或手动改 `package.json`。
3. 推送代码和 tag：
   ```bash
   git push origin <your-branch>
   git push origin --tags
   ```
4. 等待 GitHub Actions `Release DMG` 跑完。
5. 在仓库 `Releases` 页面查看新版本，DMG 会自动挂载到该 Release。

### 方式 B：手动触发构建（不自动发布）
1. 打开 GitHub 仓库 -> `Actions` -> `Release DMG`。
2. 点击 `Run workflow`。
3. 构建产物在该次 workflow 的 `Artifacts` 中下载（DMG）。

## 说明

- 只构建 macOS DMG（不会产出 Windows/Linux 包）。
- 工作流使用 `macos-14` 运行器。
- 当前默认不做签名/公证（`CSC_IDENTITY_AUTO_DISCOVERY=false`），首次分发会有 macOS 安全提示，属于预期行为。
- 如需正式分发（减少“无法验证开发者”提示），后续可以再接入 Apple Developer 签名和 notarization。
- App 内「One-click Update」基于 GitHub Releases：发布时必须带上 `latest-mac.yml` 与 DMG（electron-builder 默认会生成）。
