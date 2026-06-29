# Nova 烟草行业场景覆盖分析

> 28 个预制 Skill × 烟草行业 8 大部门，覆盖率 95%。

## 覆盖矩阵

| # | 部门 | 场景 | 核心 Skill | 说明 |
|---|------|------|-----------|------|
| 1 | 专卖监督管理 | 涉烟案件情报监测 | wenshu-api-crawl, agent-reach, cronjob | 裁判文书网批量采集 + 全网假烟/走私舆情监控 |
| 2 | 专卖监督管理 | 许可证全生命周期管理 | cronjob, browser-act, feishu-doc-create | 到期自动提醒 + 异常巡检 + 数据入表 |
| 3 | 卷烟营销 | 零售终端价格监测 | browser-act, cronjob, webhook | 定时爬取各省平台价格，异常自动告警 |
| 4 | 卷烟营销 | 竞品/新品市场调研 | agent-reach, china-web-data-collection | 13 平台全网搜索，行业报告自动汇总 |
| 5 | 卷烟营销 | 零售户档案管理 | airtable, feishu-doc-create | 客户信息自动录入、分类、跟进 |
| 6 | 烟叶管理 | 收购单/质检单数字化 | ocr-and-documents, qwenvl-ocr, airtable | 纸质单据 OCR，等级/批次自动归类 |
| 7 | 烟叶管理 | 收购进度自动报表 | feishu-doc-create, cronjob, airtable | 每日汇总 + 历史同期对比 |
| 8 | 物流配送 | 配送异常告警 | webhook, cronjob | 延迟/错发自动飞书通知 |
| 9 | 物流配送 | 到货确认自动化 | webhook, browser-act | 签收状态回写 + 异常二次配送调度 |
| 10 | 财务管理 | 发票/凭证批量处理 | ocr-and-documents, feishu-doc-create | 发票 OCR + 银行回单归档 + 月度对账 |
| 11 | 财务管理 | 财务报表自动生成 | feishu-doc-create, cronjob | 月报/季报/年报定时生成推送 |
| 12 | 人事/办公 | 公文自动流转 | himalaya, powerpoint, feishu-doc-create | 邮件分类归档 + PPT 汇报一键生成 |
| 13 | 人事/办公 | 会议纪要自动生成 | qwenvl-ocr, feishu-doc-create | 录音转文字 → AI 提取要点 → 飞书文档 |
| 14 | 政策法规 | 法规更新实时追踪 | blogwatcher, agent-reach, cronjob | 国家局官网监控 + 政策变更自动推送 |
| 15 | 政策法规 | 法律文书归档检索 | obsidian, notion | 全文检索 + 关键词自动标注 |
| 16 | 信息中心 | 系统巡检 + 数据备份 | cronjob, webhook | 定时检查服务器/数据库状态 |
| 17 | 信息中心 | IT 工单自动分类 | himalaya, linear | 邮件提交工单 → 自动分类 → 分配处理人 |
| 18 | 跨部门 | 行业数据中台 | feishu-doc-create, airtable, cronjob | 生产/销售/库存/专卖多源数据统一汇总 |
| 19 | 跨部门 | 领导看板定时推送 | feishu-doc-create, cronjob | 每日经营指标自动生成飞书推送 |
| 20 | 工业生产 | 生产线数据日报 | feishu-doc-create, cronjob | MES 数据自动拉取 → 格式化 → 推送管理层 |

## 覆盖率分析

| 维度 | 覆盖 |
|------|------|
| 烟草行业核心部门 | 8/8（100%） |
| 可自动化场景 | 20/21（95%） |
| 需二次开发的场景 | 1（内部 ERP/SCM 深度集成） |

## 未覆盖场景

**ERP/SCM 深度集成**：对接烟草行业专属的 ERP 系统（如用友烟草版、浪潮烟草版）需要定制开发。这属于系统对接范畴，需要 API 文档或数据库权限。该场景可在企业定制方案中覆盖。

## 定价参考

- **全套方案**：¥19,999/年 · 5 账号 · 28 Skill 全包
- **按需购买**：¥2,000/Skill 永久
- **企业定制**：按需报价（含烟草行业深度适配 + 内部系统对接）

## 对标传统 RPA 成本

| 项目 | 传统 RPA | Nova |
|------|---------|------|
| License 年费 | $5,000-10,000 | ¥19,999 (5 账号) |
| 实施费 | ¥3-10 万 | ¥0 |
| 专人维护 | ¥15-25 万/年 | ¥0 |
| **三年总成本** | ¥54-85 万 | ¥6 万 |
