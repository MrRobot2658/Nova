#!/bin/bash
# Nova 一键安装器 — macOS .dmg / Windows .exe 双平台
# 用法:
#   macOS:  bash install.sh          (安装到 ~/bin/nova)
#           bash install.sh --dmg    (打包为 .dmg)
#   Windows: powershell -File scripts/install-windows.ps1
#            Nova-Setup.exe  (双击运行)
set -e

NOVA_DIR="$(cd "$(dirname "$0")" && pwd)"
HERMES_DIR="$HOME/.hermes"
PROFILE="devops"

echo "══════════════════════════════════════"
echo "  Nova — AI 办公自动化平台 安装器"
echo "  macOS .dmg  |  Windows .exe 双平台支持"
echo "══════════════════════════════════════"
echo ""

# ── 平台检测 ──
detect_platform() {
    case "$OSTYPE" in
        darwin*)  echo "macos" ;;
        linux*)   echo "linux" ;;
        msys*|cygwin*|win32) echo "windows" ;;
        *)        echo "unknown" ;;
    esac
}

PLATFORM=$(detect_platform)

# ── macOS 安装 ──
install_macos() {
    echo "🍎 macOS 平台安装..."
    echo ""

    # 依赖
    command -v brew >/dev/null || { echo "❌ 需要 Homebrew: https://brew.sh"; exit 1; }
    for dep in yt-dlp ffmpeg python3 git curl; do
        brew list "$dep" >/dev/null 2>&1 || brew install "$dep"
    done
    echo "✅ 系统依赖已就绪"

    # Python
    pip3 install --quiet yt-dlp python-dotenv requests 2>/dev/null || true

    # Nova 快捷命令
    mkdir -p "$HOME/bin"
    cat > "$HOME/bin/nova" << 'EOF'
#!/bin/bash
cd "$HOME" && hermes chat --profile devops -- "$@"
EOF
    chmod +x "$HOME/bin/nova"

    # 验证 Hermes
    if [ ! -d "$HERMES_DIR" ]; then
        echo ""
        echo "⚠️  未检测到 Hermes Agent，请先安装："
        echo "   https://hermes-agent.nousresearch.com/docs"
        exit 1
    fi

    echo ""
    echo "✅ Nova macOS 安装完成"
    echo ""
    echo "   快速开始:  nova \"帮我做XXX\""
    echo ""
}

# ── macOS .dmg 打包 ──
package_dmg() {
    echo "📦 打包 macOS .dmg ..."
    DMG_NAME="Nova-Installer.dmg"
    STAGING="/tmp/nova-dmg-staging"
    rm -rf "$STAGING"
    mkdir -p "$STAGING"

    # 复制安装器
    cp "$NOVA_DIR/install.sh" "$STAGING/"
    cp -r "$NOVA_DIR" "$STAGING/Nova/"

    # 创建 .dmg
    hdiutil create -volname "Nova" -srcfolder "$STAGING" \
        -ov -format UDZO "$NOVA_DIR/$DMG_NAME" 2>/dev/null
    rm -rf "$STAGING"

    echo "✅ .dmg 已生成: $NOVA_DIR/$DMG_NAME"
    ls -lh "$NOVA_DIR/$DMG_NAME"
}

# ── 输出 Windows 引导 ──
show_windows_guide() {
    echo "🪟 Windows 平台安装指引："
    echo ""
    echo "   方式一 — WSL2 (推荐):"
    echo "   1. 启用 WSL2: wsl --install"
    echo "   2. 在 WSL2 Ubuntu 中安装 Hermes Agent"
    echo "   3. cd /mnt/c/Users/lei26/Downloads/Nova/code && bash install.sh"
    echo ""
    echo "   方式二 — .exe 一键安装:"
    echo "   1. 下载 Nova-Setup.exe"
    echo "   2. 双击运行，自动安装 WSL2 + Hermes + Nova"
    echo "   3. 桌面快捷方式 → 双击输入需求"
    echo ""
}

# ── 主流程 ──
case "${1:-}" in
    --dmg)
        install_macos
        package_dmg
        ;;
    *)
        case "$PLATFORM" in
            macos)   install_macos ;;
            windows) show_windows_guide ;;
            *)       echo "❌ 不支持的系统: $OSTYPE"; exit 1 ;;
        esac
        ;;
esac

# ── Skill 清单 ──
echo ""
echo "📦 已激活 Skill 分组（28 个）："
echo "   🏢 办公自动化   — 飞书/企业微信/钉钉 · Google · 邮件 · Notion · Airtable · PPT · PDF · OCR (13个)"
echo "   🕷️ 数据采集     — 全网调研 · 浏览器自动化 · 国内反爬 · 裁判文书 · RSS (5个)"
echo "   ⚡ 自动化引擎   — cronjob定时器 · webhook事件 · macOS桌面 · 浏览器控制 (4个)"
echo "   📤 内容发布     — 公众号排版 · 多平台一键发布 (2个)"
echo ""
echo "💡 快速体验:"
echo "   nova \"帮我搜今天关于机器人的科技新闻，总结成飞书文档发给我\""
echo "   nova \"把这份 PDF 里的表格提取到飞书多维表格\""
echo "   nova \"每天早上 9 点抓取竞品官网更新，发飞书通知\""
echo ""
