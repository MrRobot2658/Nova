# Nova 桌面端 — TODO

## 打包 / 分发
- [~] **内置 Hermes 到安装包**：结构+文档已就位（`code/hermes/README.md`，extraResources 注释待启用）。**阻塞**：缺 Hermes 源码/可分发运行时，给到来源即可落地。当前靠「检测优先」复用本机 Hermes。
- [x] **应用图标**：`build/icon.icns`（从 `icon.png` 生成），打包后 .app 使用该图标。
- [x] **签名与公证**：entitlements + hardenedRuntime 配置 + `dist:signed` 脚本 + `DISTRIBUTION.md` 就位。**需 Apple Developer 证书**才能真正签名公证（无证书用 `dist:unsigned`）。
- [x] **OTA 自动更新**：electron-updater（GitHub Releases）；设置→关于：显示版本、检查更新、下载、重启安装。macOS 自动安装需签名。
- [ ] **Windows 构建**：NSIS 安装器（**需 Windows 工具链/CI**）；Hermes 无原生构建时走 WSL2。
- [ ] **universal 包**：arm64 + x64（目前仅 arm64）。

## 功能增强
- [x] **浏览器模拟 Chrome**：纯 Chrome UA。
- [x] **浏览器自动化桥**：本机 HTTP 控制服务驱动 webview（navigate/text/html/info/eval/scroll/screenshot）。
- [x] **桥安全**：token 鉴权（写入 `~/.nova/bridge.json` + `NOVA_BROWSER_BRIDGE_TOKEN`，请求需 `x-nova-token`），已实测 401/200。
- [x] **browser-act skill** / **china-web-data-collection skill** / **wenshu-api-crawl skill**：均做成真正的 Hermes skill，走浏览器桥。
- [x] **应用级代理**：主进程读 `.env`/env 的 `HTTPS_PROXY/ALL_PROXY`，`session.setProxy` 作用到 webview 分区。
- [x] **会话项操作**：hover 重命名（内联编辑）/ 删除（`hermes sessions rename/delete`）。
- [x] **用量按天**：用量页支持 近 7/30/90 天 切换（`hermes insights --days`）。
- [~] **迷你浏览器**：`target=_blank` 弹窗已在同一 webview 内打开；**多标签页**待做。
- [ ] **真实语音 STT**：Web Speech 在 Electron 不稳，改录音 + ASR endpoint（**需指定转写服务**）。
- [ ] **执行面板结构化时间线**：需 Hermes **ACP**（编辑器集成的 JSON-RPC 协议）输出结构化工具事件；属较大独立集成。当前真实模式为单条 hermes 步骤 + 流式文本。
- [ ] **MCP 表单**：`mcp add` 发现式安装的交互参数完善。
