# Nova 桌面端（Electron + TypeScript + React）

Manus 风格三栏 UI 的桌面客户端。详见 [`docs/开发文档.md`](../../docs/开发文档.md) §1 架构、§5 运行、§7 桌面端开发。

## 开发

```bash
pnpm install
pnpm dev          # 启动 Electron + 渲染层热重载
pnpm typecheck    # 类型检查（main / preload / renderer）
```

`pnpm dev` 时主进程会先**检测本机 Hermes**（`~/.hermes` 或 PATH 上的 `hermes`）：
存在则复用、不安装；否则尝试内置版；开发期两者都没有时**回退「模拟模式」**，
用内置的执行模拟驱动 UI，便于独立联调（见 `src/main/hermes.ts`）。

## 结构

```
src/
├── main/        # 主进程：窗口 / Hermes 检测与托管 / IPC
│   ├── index.ts
│   └── hermes.ts      # ★ 检测本机 Hermes、运行模式、执行事件流
├── preload/     # contextBridge 安全桥（window.nova.*）
└── renderer/    # React UI（Manus 三栏）
    └── src/
        ├── App.tsx
        ├── components/  # Sidebar / Conversation / ExecutionPanel
        ├── types.ts
        └── styles.css
```

## 构建（最后阶段）

```bash
pnpm build        # electron-vite 编译
pnpm dist         # electron-builder 打包（需补全内置 Hermes extraResources）
```
