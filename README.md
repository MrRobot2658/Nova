# Nova — Hermes RPA 替代品

> 把 AI Agent 包装成办公自动化套件。自然语言驱动，替代 UiPath / 影刀 / 八爪鱼。

## 一句话

**传统 RPA 说「点这个按钮、填那个框」——Nova 说「帮我把这周飞书文档汇总成 Excel 发给老板」。**

## 与传统 RPA 对比

| | 传统 RPA (UiPath/影刀) | Nova (Hermes + Skill) |
|---|---|---|
| 编程方式 | 拖拽可视化 / 录制宏 | **自然语言对话** |
| 结构化数据 | ✅ | ✅ |
| 非结构化数据 | ❌ 靠 OCR 硬凑 | ✅ **AI 原生理解** |
| 界面变化 | ❌ 选择器崩了就重录 | ✅ **自适应** |
| 学习成本 | 高（学平台操作） | **零**（说人话就行） |
| 定时执行 | ✅ 内置调度 | ✅ cronjob Skill |
| 多系统联动 | 靠 API 对接 | ✅ 原生跨平台 Skill |
| 维护成本 | 高（流程一变全改） | **低**（改一句话） |

## 核心能力

### 🏢 办公自动化

| Skill | 能干什么 |
|-------|---------|
| `feishu-doc-create` | 创建飞书文档/表格，自动填充内容 |
| `google-workspace` | Gmail/Calendar/Drive/Docs/Sheets 全家桶 |
| `himalaya` | 收发邮件，IMAP/SMTP |
| `notion` | Notion 页面/数据库操作 |
| `airtable` | Airtable 数据 CRUD |
| `linear` | 项目管理、Issue 跟踪 |
| `obsidian` | 笔记读写搜索 |
| `apple-notes` | Apple 备忘录 |
| `apple-reminders` | Apple 提醒事项 |
| `powerpoint` | 创建编辑 .pptx |
| `nano-pdf` | PDF 文字编辑 |
| `ocr-and-documents` | PDF/扫描件 OCR 提取 |
| `qwenvl-ocr` | 图片 OCR（QwenVL） |

### 🕷️ 数据采集

| Skill | 能干什么 |
|-------|---------|
| `agent-reach` | 全网调研，13 个平台搜索 |
| `browser-act` | 浏览器自动化，JS 渲染页面采集 |
| `china-web-data-collection` | 国内网站反爬策略、代理方案 |
| `wenshu-api-crawl` | 裁判文书网批量爬取 |
| `blogwatcher` | RSS/Atom 订阅监控 |

### ⚡ 自动化引擎

| Skill | 能干什么 |
|-------|---------|
| `cronjob` | 定时任务——每天早上 9 点、每小时、每周末 |
| `webhook-subscriptions` | Webhook 事件触发——表单提交→自动处理 |
| `macos-computer-use` | macOS 桌面自动化——操作任何 GUI 软件 |
| `macos-browser-automation` | Chrome/Safari 浏览器控制 |

### 📤 内容输出

| Skill | 能干什么 |
|-------|---------|
| `wechat-article-formatter` | Markdown → 公众号排版 HTML |
| `post-anywhere` | 一键发布到小红书/视频号/Twitter/知乎等 |

## 典型场景

### 场景 1：日报自动化
> "每天早上 9 点，抓取我飞书文档里昨天的更新，汇总成日报发到我的飞书"

### 场景 2：竞品监控
> "每小时检查竞品官网和公众号，有更新就截图总结发飞书通知"

### 场景 3：数据采集 + 入库
> "爬取裁判文书网 2024 年所有侵犯公民个人信息罪案件，存到飞书多维表格"

### 场景 4：邮件批处理
> "读取未读邮件，把合同 PDF 附件提取关键条款，汇总成 Excel"

### 场景 5：多平台发布
> "把我这篇飞书文档转成公众号文章，同步发小红书和知乎"

## 安装

| 平台 | 方式 | 下载 |
|------|------|------|
| macOS | 双击 `Nova.dmg` → 拖入 Applications | [下载 .dmg]() |
| Windows | 双击 `Nova-Setup.exe` → 自动安装 WSL2 + Hermes + Nova | [下载 .exe]() |

安装后即可使用：

```bash
nova "你的需求"
```

或双击桌面 Nova 图标（Windows）。

## 目录结构

```
Nova/
├── README.md                   # 本文件
├── code/                       # Nova 源代码（安装器 + 配置/Skill 脚手架）
│   ├── install.sh              # macOS 一键安装器（含 --dmg 打包）
│   ├── scripts/
│   │   └── install-windows.ps1 # Windows (WSL2) 一键安装器
│   ├── config/                 # 配置占位目录
│   └── skills/                 # Skill 占位目录（实际 Skill 由 Hermes 提供）
├── site/                       # 官网（部署到 Vercel）
│   ├── index.html              # 落地页 / 购买
│   ├── demo.html               # 在线交互 Demo
│   └── assets/                 # 样式与脚本
└── docs/
    ├── architecture.md         # 技术架构（六层 / 28 Skill）
    ├── product-functions.md    # 产品功能与场景矩阵
    ├── rpa-migration.md        # 从传统 RPA 迁移指南
    ├── tobacco-scenarios.md    # 烟草行业场景覆盖分析
    └── *.html / *.pdf          # 产品文档导出版
```

> 安装命令相应变为 `bash code/install.sh`。

## 定价定位

传统 RPA 一个 License $5,000-10,000/年 + 实施费。
Nova = Hermes 订阅 + 你已有的 AI API Key，零额外成本。
