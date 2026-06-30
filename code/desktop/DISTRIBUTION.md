# Nova 桌面端 — 打包与分发

## 本地未签名（开发/内测）

```bash
cd code/desktop
npm run dist:unsigned     # 产出 release/Nova-<ver>-arm64.dmg（未签名）
```

未签名包别人首次打开会被 Gatekeeper 拦：右键 →「打开」一次即可（或 `xattr -dr com.apple.quarantine /Applications/Nova.app`）。

## 签名 + 公证（正式分发）

需要 **Apple Developer 账号**（$99/年）。准备：

1. **签名证书**：在钥匙串里装好 "Developer ID Application: <你的名字> (TEAMID)"，导出为 `.p12`。
2. **环境变量**：
   ```bash
   export CSC_LINK="/path/to/cert.p12"          # 或 base64
   export CSC_KEY_PASSWORD="p12 密码"
   export APPLE_ID="you@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App 专用密码
   export APPLE_TEAM_ID="TEAMID"
   ```
3. 打包（自动签名 + notarytool 公证 + stapler 装订）：
   ```bash
   npm run dist:signed
   ```

配置已就位（`electron-builder.yml`）：`hardenedRuntime: true` + `build/entitlements.mac.plist`（含 JIT/网络/麦克风/用户选文件等 Electron 必需 entitlements）。`dist:signed` 通过 `--config.mac.notarize=true` 启用公证，读取上面的 `APPLE_*` 环境变量。

## 校验

```bash
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Nova.app
spctl -a -vv release/mac-arm64/Nova.app          # 应显示 accepted / Notarized Developer ID
xcrun stapler validate release/Nova-*-arm64.dmg
```

## 现状 / 待办

- ✅ 应用图标（`build/icon.icns`）、entitlements、签名/公证配置与脚本。
- ⏳ 需要 Apple Developer 账号与证书才能真正签名公证（无账号时用 `dist:unsigned`）。
- ⏳ Windows NSIS、universal(arm64+x64)、内置 Hermes：见 `TODO.md`。
