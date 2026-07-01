#!/usr/bin/env bash
# 从本机 Hermes 源码构建可分发运行时到 code/hermes/dist/（供 electron-builder extraResources 打包）。
#
# 前提：本机已有 Hermes 源码检出（NousResearch/hermes-agent），默认在 ~/.hermes/hermes-agent。
# 说明：Hermes 是 Python 应用；本脚本用 PyInstaller 打成自包含目录（含解释器与依赖），
#       产出 dist/hermes/bin/hermes。首次构建通常需要补 hidden-import / data 文件，按报错迭代。
set -euo pipefail

SRC="${HERMES_SRC:-$HOME/.hermes/hermes-agent}"
OUT="$(cd "$(dirname "$0")" && pwd)/dist"

[ -d "$SRC" ] || { echo "❌ 未找到 Hermes 源码：$SRC（设 HERMES_SRC 指定）"; exit 1; }
echo "→ Hermes 源码: $SRC"
echo "→ 输出: $OUT"

# 用源码自带 venv 的 python
PY="$SRC/venv/bin/python3"
[ -x "$PY" ] || PY="python3"

"$PY" -m pip install --quiet pyinstaller || true

rm -rf "$OUT"; mkdir -p "$OUT"
cd "$SRC"

# 入口是 cli.py；按需追加 --hidden-import / --add-data（agent、skills、locales 等）
"$PY" -m PyInstaller \
  --name hermes \
  --distpath "$OUT" \
  --workpath "$OUT/.build" \
  --specpath "$OUT/.build" \
  --noconfirm --clean \
  --collect-all agent \
  --collect-submodules acp_adapter \
  cli.py || {
    echo "⚠️ PyInstaller 构建未完成——通常是 hidden-import / data 缺失。"
    echo "   请根据报错补 --hidden-import <mod> / --add-data '<src>:<dst>' 后重试。"
    exit 1
  }

# electron-builder 期望 dist/hermes/bin/hermes
mkdir -p "$OUT/hermes/bin"
[ -f "$OUT/hermes/hermes" ] && ln -sf "../hermes" "$OUT/hermes/bin/hermes" || true
echo "✅ 运行时已产出到 $OUT/hermes ；在 electron-builder.yml 启用 extraResources 后即随包分发。"
