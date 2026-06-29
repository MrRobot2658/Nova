---
name: browser-act
description: 通过 Nova 桌面端「内置浏览器」做网页自动化与数据采集——打开网址、提取正文/HTML、执行 JS 抽取结构化数据、滚动加载、截图。基于真实 Chrome（持久化登录态、纯 Chrome UA，规避反爬），适合需要登录或 JS 渲染的页面（小红书、微博、知乎、各类后台等）。当用户要「抓取/采集/打开网页/提取页面数据/截图网页」时使用。
version: 1.0.0
author: Nova
category: automation
metadata:
  hermes:
    tags: [browser, automation, scraping, crawler, webview, nova]
---

# browser-act — Nova 内置浏览器自动化

驱动 Nova 桌面端右侧的内置浏览器（Electron `<webview>`，真实 Chromium）。
相比 headless：**复用登录态 + 纯 Chrome UA**，能访问需要登录或反爬严格的站点；
用户也能实时看到 AI 在浏览什么。

## 前置条件

- **Nova 桌面端必须在运行**（它提供本机自动化桥）。
- 桥地址在环境变量 `NOVA_BROWSER_BRIDGE`（如 `http://127.0.0.1:8769`）；
  若没有，可从 `~/.nova/bridge.json` 读取。

## 调用方式（HTTP）

所有操作都是 `POST $NOVA_BROWSER_BRIDGE/browser`，body 是 JSON：

| action | 说明 | 返回 |
|--------|------|------|
| `navigate` `{url}` | 打开网址并等待加载完成（右侧自动切到浏览器） | `{ok,url,title}` |
| `info` | 当前页地址与标题 | `{ok,url,title}` |
| `text` | 当前页可见正文（`innerText`） | `{ok,text}` |
| `html` | 当前页完整 HTML | `{ok,html}` |
| `eval` `{js}` | 在页面执行 JS 并返回结果（**抽取结构化数据的主力**） | `{ok,result}` |
| `scrollBottom` | 滚动到底（触发无限加载） | `{ok}` |
| `screenshot` | 截图，返回 base64 dataURL | `{ok,dataUrl}` |

### 直接用 curl

```bash
B="$NOVA_BROWSER_BRIDGE"   # 或 http://127.0.0.1:$(grep -o '[0-9]\+' ~/.nova/bridge.json | head -1)
curl -s -X POST "$B/browser" -d '{"action":"navigate","url":"https://www.xiaohongshu.com"}'
curl -s -X POST "$B/browser" -d '{"action":"text"}'
```

### 或用封装脚本

```bash
bash scripts/browser-act.sh navigate "https://example.com"
bash scripts/browser-act.sh read "https://example.com"   # navigate + text 一步到位
bash scripts/browser-act.sh eval 'document.title'
bash scripts/browser-act.sh scroll
bash scripts/browser-act.sh screenshot > shot.json
```

## 抽取结构化数据（推荐用 eval 返回 JSON）

`eval` 的 `js` 最后一个表达式的值会被返回（需可 JSON 序列化）。例如抓取列表：

```bash
bash scripts/browser-act.sh eval '
JSON.stringify([...document.querySelectorAll("article, .note-item, .feed-item")].slice(0,30).map(el => ({
  title: el.querySelector("a,h2,.title")?.innerText?.trim() || "",
  href:  el.querySelector("a")?.href || ""
})))'
```

返回的 `result` 是一段 JSON 字符串，解析后即得到结构化记录，再写入飞书多维表格 / Excel 等。

## 无限滚动 / 翻页

```bash
for i in $(seq 1 8); do bash scripts/browser-act.sh scroll >/dev/null; sleep 1.2; done
bash scripts/browser-act.sh eval '<上面的抽取脚本>'
```

翻页站点：`navigate` 到带 `?page=N` 的 URL，或 `eval` 点击下一页
（`document.querySelector(".next")?.click()`），再 `text`/`eval`。

## 要点

- **登录态**：浏览器用持久化分区，用户在 Nova 里登录过的站点会保持登录；需要登录的页面直接 `navigate` 即可。
- **等渲染**：`navigate` 已等到加载完成；若是 JS 异步渲染的内容，可在 `eval` 前先 `scroll` 或重试几次。
- **反爬**：已是真实 Chrome UA；仍被拦时，降低频率、加 `sleep`，或先让用户在浏览器里过一次验证码。
- **失败处理**：返回 `{"ok":false,"error":...}` 时按提示处理；`browser not ready` 说明浏览器还没就绪，稍等重试或确认 Nova 桌面端正在运行。
