---
name: china-web-data-collection
description: 国内网站数据采集与反爬。基于 Nova 内置浏览器（真实 Chrome + 持久化登录态）采集小红书/微博/知乎/抖音/B站/电商/企查查等站点——应对登录墙、滑块验证、懒加载/无限滚动；限速采集、人工过验证码、可选代理；抽取结构化数据并入库（飞书多维表格/Excel）。当用户要采集国内网站、做竞品/舆情/行业数据收集时使用。
version: 1.0.0
author: Nova
category: data-collection
metadata:
  hermes:
    tags: [scraping, crawler, china, anti-bot, xiaohongshu, weibo, zhihu, nova]
---

# china-web-data-collection — 国内站点采集（反爬）

构建在 [[browser-act]] 之上：所有页面操作都走 Nova 桌面端的**内置浏览器桥**
（`$NOVA_BROWSER_BRIDGE`，见 browser-act）。本 skill 负责国内站点的**反爬策略**与**采集流程**。

## 为什么用内置浏览器（而非 headless）

- **真实 Chrome UA + 持久化登录态**：用户在 Nova 浏览器里登录过的站点保持登录，直接采集，绕开大部分登录墙。
- **看得见、可介入**：遇到滑块/验证码，用户可在窗口里手动过一次，再继续采集。
- 指纹更接近真人，风控概率低于无头浏览器。

## 反爬要点（务必遵守）

1. **限速**：每次滚动/翻页之间 `sleep 1~3s`，不要高频请求。
2. **登录态优先**：需要登录的站点，先让用户在 Nova 浏览器登录一次（持久化分区会记住）。
3. **人工验证码检查点**：`navigate` 后先 `eval` 检测是否出现验证/登录拦截（见下），若有则提示用户在 Nova 窗口里手动通过，再继续。
4. **小批量**：单次别抓太多；分页/分段，必要时分多次会话。
5. **代理（可选）**：跨境或被封 IP 时走代理（当前需在系统/网络层配置；应用级代理见 TODO）。

## 通用采集流程

```bash
# 1) 打开 + 限速滚动 N 次 + 抽取（一步到位）
bash scripts/collect.sh "<url>" <scrolls> '<返回 JSON.stringify(...) 的 JS>'
```

`collect.sh` 内部：`navigate` → 循环 `scrollBottom`（带 1.5s 间隔）→ `eval` 抽取 → 输出 JSON。

### 检测拦截（验证码/登录墙）

```bash
bash scripts/collect.sh "<url>" 0 'JSON.stringify({
  blocked: /验证|登录|安全|slider|captcha|verify/i.test(document.body.innerText.slice(0,500)),
  title: document.title
})'
```
若 `blocked:true` → 告诉用户：「请在 Nova 窗口里完成登录/验证，然后回复继续」，之后再跑抽取。

### 抽取结构化数据

`eval` 的 JS 最后一个表达式返回值需可 JSON 序列化，例如：
```js
JSON.stringify([...document.querySelectorAll(SELECTOR)].slice(0, 50).map(el => ({
  title: el.querySelector('.title')?.innerText?.trim() || '',
  link:  el.querySelector('a')?.href || '',
  meta:  el.querySelector('.meta')?.innerText?.trim() || ''
})))
```

## 分站点配方

各站点的 URL 规律、选择器、登录/滑块注意事项见 `references/sites.md`
（小红书 / 微博 / 知乎 / 抖音 / B站 / 淘宝·京东 / 大众点评 / 企查查）。

## 入库

抽取得到的 JSON 数组，交给 `airtable` / `feishu-doc-create` 等 skill 写入飞书多维表格或 Excel。

## 失败处理

- `{"ok":false,"error":"...浏览器桥未运行"}` → 先启动 Nova 桌面端。
- 抽取为空 → 多半是懒加载未完成或选择器变了：增加 `scrolls`、`sleep` 后重试，或先 `html` 看真实结构再调选择器。
- 频繁失败/跳验证 → 降频、换登录账号、人工过验证码、或启用代理。
