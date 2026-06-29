/* ── Nova 在线 Demo：模拟自然语言终端 ── */

const SCENARIOS = [
  {
    label: '📋 日报自动化',
    cmd: '每天早上 9 点，抓取我飞书文档昨天的更新，汇总成日报发给我',
    intent: '平台=飞书 · 动作=汇总+发送 · 触发=每日 9:00',
    steps: [
      ['feishu-doc-create', '拉取昨日有更新的文档'],
      ['LLM 推理', '提取要点，按项目 / 负责人分类'],
      ['cronjob', '注册定时任务：每天 09:00 自动执行'],
      ['feishu-doc-create', '生成日报并发送到你的飞书'],
    ],
    result: '✅ 日报已生成并发送 · 定时任务已上线，明早 9:00 自动运行',
  },
  {
    label: '🔭 竞品监控',
    cmd: '每小时检查竞品官网和公众号，有更新就截图总结发飞书通知',
    intent: '平台=网页+公众号 · 动作=监控+总结 · 触发=每小时',
    steps: [
      ['browser-act', '打开竞品官网，渲染 JS 动态内容'],
      ['agent-reach', '检索竞品公众号最新推文'],
      ['LLM 推理', '对比上次快照，识别变化点并截图'],
      ['cronjob', '注册每小时巡检任务'],
      ['feishu-doc-create', '有更新时推送飞书通知'],
    ],
    result: '✅ 巡检已上线 · 检测到「定价页改版」，已截图并通知',
  },
  {
    label: '🕷️ 数据采集入库',
    cmd: '爬取裁判文书网 2024 年所有侵犯公民个人信息罪案件，存到飞书多维表格',
    intent: '平台=裁判文书网 · 动作=批量爬取+入库',
    steps: [
      ['wenshu-api-crawl', '按案由+年份批量检索，命中 1,284 篇'],
      ['china-web-data-collection', '应对反爬：代理轮换 + 限速'],
      ['LLM 推理', '抽取当事人 / 判决结果 / 涉案金额字段'],
      ['airtable', '结构化写入飞书多维表格'],
    ],
    result: '✅ 已采集 1,284 条并入库 · 字段自动归类完成',
  },
  {
    label: '📧 邮件批处理',
    cmd: '读取未读邮件，把合同 PDF 附件提取关键条款，汇总成 Excel',
    intent: '平台=邮箱 · 动作=读取+OCR+汇总',
    steps: [
      ['himalaya', '读取未读邮件，筛出带 PDF 附件的 23 封'],
      ['ocr-and-documents', '解析合同 PDF，识别文字与表格'],
      ['LLM 推理', '提取金额 / 期限 / 违约责任等关键条款'],
      ['powerpoint', '汇总生成 Excel 报表'],
    ],
    result: '✅ 23 份合同条款已提取 · 风险条款自动标红汇总',
  },
  {
    label: '📤 多平台发布',
    cmd: '把这篇飞书文档转成公众号文章，同步发小红书和知乎',
    intent: '平台=飞书→公众号/小红书/知乎 · 动作=改写+发布',
    steps: [
      ['feishu-doc-create', '读取源飞书文档正文'],
      ['wechat-article-formatter', 'Markdown → 公众号排版 HTML'],
      ['LLM 推理', '按平台调性改写：小红书图文 / 知乎长文'],
      ['post-anywhere', '一键分发到三个平台'],
    ],
    result: '✅ 公众号已排版 · 小红书 + 知乎已同步发布',
  },
  {
    label: '⚖️ 合同风险审查',
    cmd: '这几份合同里哪些条款有法律风险？标红并解释',
    intent: '平台=本地文件 · 动作=理解+判断',
    steps: [
      ['ocr-and-documents', '读取合同 PDF 全文'],
      ['LLM 推理', '逐条分析条款，比对常见风险点'],
      ['LLM 推理', '标注高风险条款并给出修改建议'],
      ['nano-pdf', '在原文标红并导出批注版'],
    ],
    result: '✅ 发现 4 处高风险条款 · 已标红并附解释与改法',
  },
];

const screen = document.getElementById('screen');
const chipsEl = document.getElementById('chips');
const replayBtn = document.getElementById('replay');
const customInput = document.getElementById('customInput');
const runCustom = document.getElementById('runCustom');

let runToken = 0; // 取消上一次未播完的动画
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function line(html, cls) {
  const div = document.createElement('div');
  div.className = 'fade-in' + (cls ? ' ' + cls : '');
  div.innerHTML = html;
  screen.appendChild(div);
  screen.scrollTop = screen.scrollHeight;
  return div;
}

function spacer() { line('&nbsp;'); }

// 把命令逐字打出来
async function typeCmd(text, token) {
  const div = line('<span class="t-prompt">$ nova</span> <span class="t-cmd"></span><span class="cursor"></span>');
  const span = div.querySelector('.t-cmd');
  const cursor = div.querySelector('.cursor');
  for (let i = 0; i < text.length; i++) {
    if (token !== runToken) return;
    span.textContent += text[i];
    await sleep(28);
  }
  cursor.remove();
}

async function run(scn, token) {
  screen.innerHTML = '';
  await typeCmd('"' + scn.cmd + '"', token);
  if (token !== runToken) return;
  spacer();

  await sleep(400);
  if (token !== runToken) return;
  line('<span class="t-step"><span class="ok">✓</span> 解析意图 · ' + scn.intent + '</span>');

  for (const [skill, desc] of scn.steps) {
    await sleep(620);
    if (token !== runToken) return;
    const el = line('<span class="t-step">  ⟳ 调用 <span class="t-skill">' + skill + '</span> · ' + desc + '</span>');
    await sleep(480);
    if (token !== runToken) return;
    el.innerHTML = '<span class="t-step"><span class="ok">✓</span> 调用 <span class="t-skill">' + skill + '</span> · ' + desc + '</span>';
  }

  await sleep(520);
  if (token !== runToken) return;
  spacer();
  line('<span class="t-result">' + scn.result + '</span>');
}

function start(scn) {
  runToken++;
  run(scn, runToken);
}

// 渲染场景按钮
SCENARIOS.forEach((scn, i) => {
  const b = document.createElement('button');
  b.className = 'schip' + (i === 0 ? ' active' : '');
  b.textContent = scn.label;
  b.addEventListener('click', () => {
    document.querySelectorAll('.schip').forEach((c) => c.classList.remove('active'));
    b.classList.add('active');
    start(scn);
  });
  chipsEl.appendChild(b);
});

replayBtn.addEventListener('click', () => {
  const active = document.querySelector('.schip.active');
  const idx = [...chipsEl.children].indexOf(active);
  start(SCENARIOS[Math.max(0, idx)]);
});

// 自定义输入：根据关键词智能拼一个执行流程
function buildCustom(text) {
  const t = text.trim();
  const lc = t.toLowerCase();
  const steps = [];
  const has = (...kw) => kw.some((k) => t.includes(k) || lc.includes(k.toLowerCase()));
  let intent = '自定义指令';

  if (has('飞书', '文档', '日报', '周报')) steps.push(['feishu-doc-create', '读写飞书文档 / 表格']);
  if (has('PDF', 'pdf', 'OCR', '扫描', '发票', '合同', '附件')) steps.push(['ocr-and-documents', 'OCR 提取文字与表格']);
  if (has('邮件', '邮箱', 'mail')) steps.push(['himalaya', '收发 / 读取邮件']);
  if (has('爬', '采集', '抓取', '网站', '网页')) steps.push(['browser-act', '浏览器自动化抓取']);
  if (has('调研', '搜索', '全网', '舆情', '竞品')) steps.push(['agent-reach', '全网多平台检索']);
  if (has('多维表格', 'airtable', '入库', '数据库')) steps.push(['airtable', '结构化数据写入']);
  if (has('公众号', '排版')) steps.push(['wechat-article-formatter', 'Markdown → 公众号排版']);
  if (has('发布', '小红书', '知乎', '视频号', 'twitter', '分发')) steps.push(['post-anywhere', '多平台一键发布']);
  if (has('PPT', 'ppt', '幻灯', '演示', 'Excel', 'excel', '表格')) steps.push(['powerpoint', '生成 PPT / 表格']);
  if (has('每天', '每小时', '每周', '定时', '点')) steps.push(['cronjob', '注册定时任务']);
  if (has('提交', '触发', 'webhook', '回调')) steps.push(['webhook-subscriptions', '事件触发']);

  // 总有 AI 推理参与
  steps.splice(Math.min(1, steps.length), 0, ['LLM 推理', '理解内容、决策、生成结果']);
  if (steps.length <= 1) steps.unshift(['agent-reach', '理解需求并规划执行路径']);

  return {
    label: '自定义',
    cmd: t,
    intent,
    steps: steps.slice(0, 5),
    result: '✅ 流程已规划并执行完成 · 共调度 ' + Math.min(steps.length, 5) + ' 个 Skill',
  };
}

function runCustomCmd() {
  const text = customInput.value.trim();
  if (!text) { customInput.focus(); return; }
  document.querySelectorAll('.schip').forEach((c) => c.classList.remove('active'));
  start(buildCustom(text));
}
runCustom.addEventListener('click', runCustomCmd);
customInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runCustomCmd(); });

// 首屏自动播放第一个场景
start(SCENARIOS[0]);
