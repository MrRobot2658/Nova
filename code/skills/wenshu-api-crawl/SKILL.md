---
name: wenshu-api-crawl
description: 中国裁判文书网（wenshu.court.gov.cn）案件检索与采集。基于 Nova 内置浏览器（真实 Chrome + 登录态）做人机协作采集——人工过登录/滑块验证，脚本驱动关键词检索、翻页、抽取案件列表（案号/标题/法院/日期/链接）并入库。当用户要采集裁判文书、法律案例、特定案由/法院的判决数据时使用。
version: 1.0.0
author: Nova
category: data-collection
metadata:
  hermes:
    tags: [wenshu, legal, crawler, china, anti-bot, nova]
---

# wenshu-api-crawl — 裁判文书网采集

构建在 [[browser-act]] / [[china-web-data-collection]] 之上，走 Nova 内置浏览器桥
（`$NOVA_BROWSER_BRIDGE` + `$NOVA_BROWSER_BRIDGE_TOKEN`）。

## 重要前提（裁判文书网反爬极强）

- **必须登录 + 过滑块验证**：headless / 非住宅 IP 直接被拒。内置浏览器是真实 Chrome、用你的
  IP 和登录态，是唯一可行路径。
- **人机协作**：流程中遇到登录页/滑块，**提示用户在 Nova 窗口里手动完成**，再继续采集。
- **务必限速**：每页之间 sleep ≥ 2s，避免触发风控封号。

## 流程

```bash
# 1) 打开裁判文书网（人工登录 + 过验证码）
bash scripts/wenshu.sh open
#   → 提示用户：请在 Nova 右侧浏览器里登录并完成滑块验证，然后回复继续

# 2) 检测是否就绪（已登录、在检索页）
bash scripts/wenshu.sh check

# 3) 抽取当前结果页的案件列表（JSON）
bash scripts/wenshu.sh extract

# 4) 翻到下一页后再抽取（循环；每次间隔 ≥2s）
bash scripts/wenshu.sh next
bash scripts/wenshu.sh extract
```

检索：让用户在页面里输入关键词/案由/法院/时间筛选并点检索（SPA 的检索参数是加密的，
直接拼 URL 不可靠，所以用 UI 检索 + 抽取渲染结果的方式）。

## 抽取字段

`extract` 返回 JSON 数组，每项尽量包含：`title`（案件名/案号）、`court`（法院）、`date`、`cause`（案由）、`link`。
选择器随站点改版会变，抽取为空时先 `browser-act.sh html` 看真实结构再调 `scripts/wenshu.sh` 里的 eval。

## 入库

抽取结果交给 `airtable` / `feishu-doc-create` 写入飞书多维表格或 Excel；建议带上采集时间与检索条件。

## 合规提醒

仅用于公开裁判文书的合法检索与研究；遵守网站使用条款与频率限制，不做大规模高频抓取。
