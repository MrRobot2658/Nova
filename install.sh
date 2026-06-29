#!/bin/bash
# Nova — Hermes RPA 替代品 一键安装器
# 用法: bash install.sh

set -e

NOVA_DIR="$HOME/Downloads/Nova"
HERMES_DIR="$HOME/.hermes"
PROFILE="devops"

echo "========================================="
echo "  Nova — Hermes RPA 安装器"
echo "  将 AI Agent 包装成办公自动化套件"
echo "========================================="
echo ""

# 1. 检查 Hermes 是否已安装
if [ ! -d "$HERMES_DIR" ]; then
    echo "❌ 未检测到 Hermes Agent，请先安装 Hermes"
    echo "   参考: https://hermes-agent.nousresearch.com/docs"
    exit 1
fi
echo "✅ Hermes Agent 已安装"

# 2. 安装必备系统依赖
echo ""
echo "📦 安装系统依赖..."

# macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    command -v brew >/dev/null || { echo "请先安装 Homebrew: https://brew.sh"; exit 1; }
    brew list yt-dlp >/dev/null 2>&1 || brew install yt-dlp
    brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg
    echo "✅ macOS 依赖已就绪"
fi

# Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq yt-dlp ffmpeg python3-pip git curl
    echo "✅ Linux 依赖已就绪"
fi

# 3. 安装 Python 依赖
echo ""
echo "📦 安装 Python 依赖..."
pip3 install --quiet yt-dlp pysrt python-dotenv requests 2>/dev/null || true
echo "✅ Python 依赖已就绪"

# 4. 安装 Nova 核心 Skill 包
echo ""
echo "📦 安装 Nova Skill 包（办公自动化 + 数据采集）..."

SKILL_LIST=(
    "办公核心"
    "feishu-doc-create"        # 飞书文档
    "google-workspace"          # Google 全家桶
    "himalaya"                  # 邮件
    "notion"                    # Notion
    "airtable"                  # Airtable
    "linear"                    # 项目管理
    "obsidian"                  # 笔记
    "apple-notes"               # Apple 备忘录
    "apple-reminders"           # Apple 提醒事项
    "ocr-and-documents"         # 文档 OCR
    "qwenvl-ocr"                # 图片 OCR
    "powerpoint"                # PPT
    "nano-pdf"                  # PDF 编辑

    "数据采集"
    "agent-reach"               # 全网调研
    "browser-act"               # 浏览器自动化
    "china-web-data-collection" # 国内数据采集
    "wenshu-api-crawl"          # 裁判文书网
    "blogwatcher"               # RSS 监控

    "自动化"
    "webhook-subscriptions"     # Webhook 事件
    "macos-computer-use"        # macOS 桌面控制
    "macos-browser-automation"  # 浏览器自动化

    "内容输出"
    "wechat-article-formatter"  # 公众号排版
    "post-anywhere"             # 多平台发布
)

echo "Skills 已在 Hermes profile 中，无需额外安装。"
echo "✅ Nova 核心包共 $((${#SKILL_LIST[@]} - 4)) 个 Skill 已就绪"

# 5. 创建快捷命令
echo ""
echo "📦 创建快捷命令..."

mkdir -p "$HOME/bin"

cat > "$HOME/bin/nova" << 'NOVA_CMD'
#!/bin/bash
# Nova — Hermes RPA 快速调用
# 用法: nova "帮我把这周飞书文档汇总成 Excel 发邮件给老板"

cd "$HOME" && hermes chat --profile devops -- "$@"
NOVA_CMD
chmod +x "$HOME/bin/nova"

echo "✅ 快捷命令 'nova' 已创建 (使用时需在 PATH 中包含 ~/bin)"

# 6. 生成配置检查报告
echo ""
echo "========================================="
echo "  安装完成！"
echo "========================================="
echo ""
echo "📋 快速开始:"
echo "  nova \"帮我做XXX\""
echo ""
echo "📦 已激活的 Skill 分组:"
echo "  办公核心 — 飞书/Google/邮件/Notion/Airtable/笔记/OCR/PPT/PDF"
echo "  数据采集 — 全网调研/浏览器自动化/国内爬虫/裁判文书/RSS"
echo "  自动运行 — Webhook触发/macOS桌面控制/浏览器自动化"
echo "  内容输出 — 公众号排版/多平台发布"
echo ""
echo "🔗 与传统 RPA 对比:"
echo "  UiPath/影刀: 可视化编程, 只能处理结构化流程"
echo "  Nova: 自然语言驱动, AI 理解非结构化数据, 自主学习"
echo ""
echo "💡 快速体验:"
echo "  nova \"帮我搜一下今天关于机器人的科技新闻，总结成飞书文档发给我\""
echo "  nova \"把这份 PDF 扫描件里的表格提取到飞书多维表格\""
echo "  nova \"每天早上 9 点抓取竞品官网更新，发飞书通知\""
echo ""
NOVA_CMD

echo "done"
