# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Nova is **not an application codebase** — it's the packaging + documentation layer that repositions the [Hermes Agent](https://hermes-agent.nousresearch.com) as an RPA replacement (positioned against UiPath / 影刀 / 八爪鱼) for Chinese business users. Nova itself ships no agent runtime, no models, and no Skill implementations. It is:

1. **Installers** — `install.sh` (macOS, also packages a `.dmg`) and `scripts/install-windows.ps1` (Windows via WSL2). They install system deps, drop a `nova` shell wrapper, and verify a Hermes install at `~/.hermes`.
2. **Product/marketing docs** — `docs/` and `README.md`, all in Chinese.

The actual capability comes from ~28 Hermes **Skills** that Nova claims to bundle (feishu-doc-create, agent-reach, browser-act, cronjob, etc.). Those Skills live in Hermes, **not in this repo** — `skills/`, `config/`, and `generated-images/` are empty placeholders.

The `nova` command is a thin wrapper that `install.sh` writes to `~/bin/nova`:
```bash
cd "$HOME" && hermes chat --profile devops -- "$@"
```
So "running Nova" means running Hermes with the `devops` profile. There is nothing to build, lint, or test in this repo.

## Common commands

```bash
bash install.sh          # macOS: install deps + write ~/bin/nova, verify ~/.hermes
bash install.sh --dmg     # macOS: install, then package Nova-Installer.dmg via hdiutil
# Windows: powershell -ExecutionPolicy Bypass -File scripts/install-windows.ps1
```
`install.sh` is `set -e` and platform-branches on `$OSTYPE`. On Windows it only prints a guide; the real Windows path is the PowerShell script, which provisions WSL2 → installs Hermes inside WSL → re-runs `install.sh` → creates a desktop shortcut.

## When editing docs

- **Keep the architecture consistent across files.** The core narrative is fixed and repeated in several docs — changing it in one place means updating the others:
  - Skill count is **28**, grouped **13 office / 5 data-collection / 4 automation-engine / 2 publishing**. This count and grouping appears in `README.md`, `install.sh`, `scripts/install-windows.ps1`, `docs/architecture.md`, and `docs/product-functions.md`.
  - Architecture is a **6-layer stack** (L1 CLI/installer → L2 Hermes core → L3 Skills → L4 AI engine → L5 runtime/scheduling → L6 integration targets) — see `docs/architecture.md`.
  - Model routing story: DeepSeek V4 (primary) / MiniMax (fast) / QwenVL (vision) / Qwen (failover).
  - Positioning invariant: Nova wraps Hermes and does **not** build its own agent engine, scheduler, or low-code designer (see "产品边界" in `docs/product-functions.md`).
- **Docs are Chinese.** Match the existing tone and terminology when editing.
- **`.html` files are paired exports** of the `.md` product docs (`architecture.html`, `product-intro.html`); regenerate/keep them in sync if you change the source markdown.
- The "目录结构" block in `README.md` is hand-maintained — update it when you add or remove files so it keeps matching the actual filesystem.

## Audience note

Docs target non-technical Chinese business users ("说人话就行" / natural-language-driven), not developers. The selling point is *"describe what you want, not how to do it"* — preserve that framing rather than introducing developer-oriented or low-code/flowchart concepts.
