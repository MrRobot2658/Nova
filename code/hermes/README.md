# code/hermes/ — 内置 Hermes 运行时（待填充）

Nova 的目标是**安装包内置 Hermes**，用户无需单独安装。本目录用于放置可分发的 Hermes
运行时，由 `electron-builder` 通过 `extraResources` 打入安装包。

## 现状

- 桌面端**已支持「检测优先」**：启动时先找本机 Hermes（`~/.hermes` 或 PATH 上的 `hermes`），
  存在则复用、不安装；不存在才用内置版；都没有时回退模拟。见 `code/desktop/src/main/hermes.ts`。
- 因此当前**无需内置 Hermes 也能在已装 Hermes 的机器上运行**。

## 待办：填充内置运行时

Hermes 是 Python CLI（pip 安装）。要做到「内置、开箱即用」，需产出一个**自包含运行时**，例如：

1. **方式 A — 打包二进制**：用 PyInstaller / shiv 把 `hermes` 及依赖打成单目录可执行，
   产出到 `code/hermes/dist/`（含 `bin/hermes`）。
2. **方式 B — vendored 源码 + 内置 Python**：把 Hermes 源码以 git submodule 纳入本目录，
   配套内置一个精简 Python 运行时；二开改动集中在 patch/overlay。

产出后在 `code/desktop/electron-builder.yml` 启用：

```yaml
extraResources:
  - from: ../hermes/dist
    to: hermes
```

桌面端会从 `process.resourcesPath/hermes/bin/hermes` 找到并启动它（`hermes.ts` 的 `bundledBin()`）。

## 阻塞点

- 需要 Hermes 的**源码仓库地址**或**官方可分发运行时**。给到来源后即可落地（submodule + 构建脚本 + 启用 extraResources）。
- 二次开发点（devops profile、Skill 注册、DeepSeek 模型路由、与桌面端 localhost 通信）见 `docs/开发文档.md` §1.5。
