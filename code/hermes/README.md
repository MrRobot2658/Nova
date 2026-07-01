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

## 源码来源（已确认）

- Hermes 源码仓库：**`git@github.com:NousResearch/hermes-agent.git`**（本机已检出 v0.16.0，位于 `~/.hermes/hermes-agent`，含 `acp_adapter/`、`cli.py`、`agent/` 等）。
- 二开可以此为上游做 submodule/subtree + patch。二开点见 `docs/开发文档.md` §1.5。

## 构建运行时

```bash
bash code/hermes/build-runtime.sh   # 从本机源码用 PyInstaller 产出 dist/hermes/bin/hermes
```

产出后在 `code/desktop/electron-builder.yml` 启用 `extraResources`（`../hermes/dist` → `hermes`），桌面端会从
`process.resourcesPath/hermes/bin/hermes` 启动内置版。

## 剩余工程点（#2 的真正难点）

源码已具备；剩下是**产出一个自包含、可重定位的运行时**：
- PyInstaller 首次构建通常要补 `--hidden-import` / `--add-data`（Hermes 动态导入多、还带 skills/locales/node 资源），需按报错迭代。
- 体积较大（内置解释器 + 依赖）；启动需做进度提示。
- 跨平台（Windows）另需各自构建。

这块属于构建工程，建议放到 CI 里跑通后再随包分发；当前桌面端已能「检测复用本机 Hermes」，不内置也可用。
