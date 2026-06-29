# Nova 桌面端 — TODO

打包阶段先做最小可用版（本地未签名 .dmg，运行时复用本机 Hermes）。以下细节延后：

## 打包 / 分发
- [ ] **内置 Hermes 到安装包**：先把 Hermes 源码以 submodule vendoring 到 `code/hermes/`，产出可分发运行时，再在 `electron-builder.yml` 启用 `extraResources`（`hermes/`）。当前依赖「检测优先」复用本机 Hermes。
- [ ] **应用图标**：`build/icon.icns`（mac）/ `build/icon.ico`（win）+ DMG 背景图。
- [ ] **签名与公证**：macOS code signing + notarization；移除 `mac.identity: null`。
- [ ] **Windows 构建**：NSIS 安装器；若 Hermes 无原生构建，走 WSL2 承载（沿用 `scripts/install-windows.ps1`）。
- [ ] **universal 包**：arm64 + x64（目前仅 arm64）。

## 功能增强
- [ ] **迷你浏览器**：`target=_blank` 弹窗在同一 webview 内打开；多标签页。
- [ ] **真实语音 STT**：Web Speech API 在 Electron 不稳定，改为录音 + ASR endpoint（需指定服务）。
- [ ] **会话项操作**：hover 重命名 / 删除（`hermes sessions rename` / `delete`）。
- [ ] **执行面板**：把 Hermes 工具调用解析成结构化时间线（需 Hermes 结构化事件输出，目前真实模式是单条 hermes 步骤 + 流式文本）。
- [ ] **用量**：insights 数字已解析成卡片，可加趋势图 / 按天。
- [ ] **MCP**：`mcp add` 的发现式安装可能需要交互参数，按真实交互完善表单。
