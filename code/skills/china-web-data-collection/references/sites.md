# 分站点采集配方

> 选择器随站点改版会变化；抽取为空时先用 `browser-act.sh html` 看真实结构再调。
> 所有操作走内置浏览器桥（真实 Chrome + 登录态）。

## 小红书 xiaohongshu.com
- 搜索：`https://www.xiaohongshu.com/search_result?keyword=<词>`
- 强登录墙 + 滑块：先让用户在 Nova 窗口登录；检测 `document.querySelector('.login-container')`。
- 笔记卡片：`section.note-item`，标题 `.title`，链接 `a.cover`，作者 `.author .name`，点赞 `.like-wrapper .count`。
- 懒加载：滚动 6~10 次，每次间隔 ≥1.5s。

## 微博 weibo.com / m.weibo.cn
- 移动版更易抓：`https://m.weibo.cn/search?containerid=100103type%3D1%26q%3D<词>`
- 走 XHR JSON 更稳：`eval` 里 `fetch(apiUrl).then(r=>r.json())`（注意需登录 cookie）。
- 卡片：`.card-wrap`，正文 `.txt`，时间 `.time`。

## 知乎 zhihu.com
- 搜索：`https://www.zhihu.com/search?type=content&q=<词>`
- 需登录；未登录会弹窗 `.Modal-wrapper`。
- 条目：`.SearchResult-Card`，标题 `.ContentItem-title`，摘要 `.RichText`。

## 抖音 douyin.com
- 强风控，优先用户主页/话题页；滑块频繁，依赖人工过验证。
- 视频卡片：`[data-e2e="scroll-item"]`；多数数据在 `window.__INIT_PROPS__` / `<script>` JSON 里，可 `eval` 解析。

## B站 bilibili.com
- 搜索：`https://search.bilibili.com/all?keyword=<词>`（相对宽松）
- 卡片：`.bili-video-card`，标题 `.bili-video-card__info--tit`，UP `.bili-video-card__info--author`，播放 `.bili-video-card__stats--item`。

## 淘宝 / 京东
- 淘宝强登录+滑块，必须登录态；商品 `.item`，价格 `.price`。
- 京东相对宽松：`https://search.jd.com/Search?keyword=<词>`，商品 `.gl-item`，价格 `.p-price`，标题 `.p-name`。

## 大众点评 dianping.com
- 字体反爬（价格/数字用自定义字体加密）：优先取文本结构，数字字段可能需额外解密，必要时截图人工读。

## 企查查 / 天眼查
- 必须登录；查询 `https://www.qcc.com/web/search?key=<公司名>`。
- 结果 `.maininfo`，公司名 `.title`，详情链接 `a`。频繁查询会触发验证，务必限速。
