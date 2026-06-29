import { spawn, execSync, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

/** Hermes 运行模式 */
export type HermesMode = 'system' | 'bundled' | 'simulated'

export interface HermesStatus {
  mode: HermesMode
  detected: boolean // 本机是否已存在 Hermes
  path?: string
  ready: boolean
}

export type NovaEvent =
  | { type: 'intent'; runId: string; text: string; intent: string }
  | { type: 'step-start'; runId: string; id: string; skill: string; desc: string }
  | { type: 'step-done'; runId: string; id: string; ok: boolean }
  | { type: 'result'; runId: string; text: string }
  | { type: 'done'; runId: string }

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * 负责：检测本机 Hermes → 决定运行模式 → 启动/复用 → 转发执行事件。
 *
 * 安装/启动策略（按需求）：
 *  - 先检测本机是否已存在 Hermes；存在则直接复用，**不安装内置版**。
 *  - 不存在则使用随安装包分发的内置 Hermes（构建阶段落地，见 §构建）。
 *  - 开发期两者都没有时，回退「模拟模式」，让桌面端 UI 可独立开发联调。
 */
export class HermesManager {
  private proc: ChildProcess | null = null
  private emit: (evt: NovaEvent) => void = () => {}
  private runSeq = 0
  private _status: HermesStatus = { mode: 'simulated', detected: false, ready: false }

  async init(emit: (evt: NovaEvent) => void): Promise<void> {
    this.emit = emit

    const existing = this.detectExisting()
    if (existing) {
      // 本机已存在 Hermes → 复用，不安装
      this._status = { mode: 'system', detected: true, path: existing, ready: true }
      // TODO: 按需拉起本机 Hermes 的本地服务（localhost），此处先标记就绪
      return
    }

    const bundled = this.bundledPath()
    if (bundled && existsSync(bundled)) {
      this._status = { mode: 'bundled', detected: false, path: bundled, ready: true }
      // TODO: spawn 内置 Hermes 子进程并做健康检查
      return
    }

    // 开发期回退：模拟执行
    this._status = { mode: 'simulated', detected: false, ready: true }
  }

  /** 检测本机是否已安装 Hermes：~/.hermes 目录存在，或 PATH 上能找到 hermes 可执行文件。 */
  detectExisting(): string | null {
    const homeDir = join(homedir(), '.hermes')
    if (existsSync(homeDir)) return homeDir

    try {
      const cmd = process.platform === 'win32' ? 'where hermes' : 'command -v hermes'
      const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
      const bin = out.split('\n')[0]?.trim()
      if (bin) return bin
    } catch {
      // 未找到 hermes，忽略
    }
    return null
  }

  /** 内置 Hermes 的预期路径（构建时通过 electron-builder extraResources 落到 resources/hermes）。 */
  private bundledPath(): string | null {
    return process.resourcesPath ? join(process.resourcesPath, 'hermes') : null
  }

  status(): HermesStatus {
    return this._status
  }

  /** 执行一条自然语言指令。返回 runId，过程通过 emit 事件流推送给渲染层。 */
  async run(text: string): Promise<{ runId: string }> {
    const runId = `r${++this.runSeq}`
    if (this._status.mode === 'simulated') {
      void this.simulate(runId, text)
    } else {
      // TODO: 接入真实 Hermes —— 经 localhost HTTP / stdio 调用并把进度流式转发为 NovaEvent
      void this.simulate(runId, text)
    }
    return { runId }
  }

  dispose(): void {
    this.proc?.kill()
    this.proc = null
  }

  // ── 开发期模拟：把一句话拆成若干 Skill 步骤，逐步推送事件 ──

  private skillsFor(text: string): Array<{ skill: string; desc: string }> {
    const steps: Array<{ skill: string; desc: string }> = []
    const has = (...kw: string[]): boolean => kw.some((k) => text.includes(k))

    if (has('飞书', '文档', '日报', '周报')) steps.push({ skill: 'feishu-doc-create', desc: '读写飞书文档 / 表格' })
    if (has('PDF', 'OCR', '扫描', '发票', '合同', '附件')) steps.push({ skill: 'ocr-and-documents', desc: 'OCR 提取文字与表格' })
    if (has('邮件', '邮箱')) steps.push({ skill: 'himalaya', desc: '收发 / 读取邮件' })
    if (has('爬', '采集', '抓取', '网站', '网页')) steps.push({ skill: 'browser-act', desc: '浏览器自动化抓取' })
    if (has('调研', '搜索', '全网', '舆情', '竞品')) steps.push({ skill: 'agent-reach', desc: '全网多平台检索' })
    if (has('多维表格', '入库', '数据库')) steps.push({ skill: 'airtable', desc: '结构化数据写入' })
    if (has('公众号', '排版')) steps.push({ skill: 'wechat-article-formatter', desc: 'Markdown → 公众号排版' })
    if (has('发布', '小红书', '知乎', '视频号')) steps.push({ skill: 'post-anywhere', desc: '多平台一键发布' })
    if (has('PPT', '幻灯', '演示', 'Excel', '表格')) steps.push({ skill: 'powerpoint', desc: '生成 PPT / 表格' })
    if (has('每天', '每小时', '每周', '定时', '点')) steps.push({ skill: 'cronjob', desc: '注册定时任务' })

    steps.splice(Math.min(1, steps.length), 0, { skill: 'LLM 推理', desc: '理解内容、决策、生成结果' })
    if (steps.length <= 1) steps.unshift({ skill: 'agent-reach', desc: '理解需求并规划执行路径' })
    return steps.slice(0, 5)
  }

  private async simulate(runId: string, text: string): Promise<void> {
    const steps = this.skillsFor(text)
    this.emit({ type: 'intent', runId, text, intent: `已解析意图 · 规划 ${steps.length} 个 Skill（开发期模拟）` })
    await sleep(420)

    for (let i = 0; i < steps.length; i++) {
      const id = `${runId}-${i}`
      this.emit({ type: 'step-start', runId, id, skill: steps[i].skill, desc: steps[i].desc })
      await sleep(720)
      this.emit({ type: 'step-done', runId, id, ok: true })
    }

    await sleep(320)
    this.emit({ type: 'result', runId, text: `✅ 流程已完成 · 共调度 ${steps.length} 个 Skill（开发期模拟，真实执行待接入 Hermes）` })
    this.emit({ type: 'done', runId })
  }
}
