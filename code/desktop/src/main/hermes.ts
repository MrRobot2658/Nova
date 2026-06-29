import { spawn, execSync, type ChildProcess } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { loadSettings, saveSettings, type NovaSettings } from './settings'

/** Hermes 运行模式 */
export type HermesMode = 'system' | 'bundled' | 'simulated'

export interface HermesStatus {
  mode: HermesMode
  detected: boolean // 本机是否已存在 Hermes（非内置）
  bin: string | null
  ready: boolean
}

export interface TestResult {
  ok: boolean
  bin: string | null
  version?: string
  mode: HermesMode
  message: string
}

export interface SkillGroup {
  group: string
  count: number
  items: string[]
}

export interface HermesInfo {
  connected: boolean
  mode: HermesMode
  bin: string | null
  model: string
  profile: string
  skills: SkillGroup[]
  mcp: Array<{ name: string; status: string }>
  usage: Array<{ label: string; value: string }>
}

export type NovaEvent =
  | { type: 'intent'; runId: string; text: string; intent: string }
  | { type: 'step-start'; runId: string; id: string; skill: string; desc: string }
  | { type: 'step-done'; runId: string; id: string; ok: boolean }
  | { type: 'output'; runId: string; chunk: string }
  | { type: 'result'; runId: string; text: string }
  | { type: 'error'; runId: string; message: string }
  | { type: 'done'; runId: string }

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Nova 预制 Skill 目录（28 个，4 组）—— 设置页展示用 */
const SKILLS: SkillGroup[] = [
  {
    group: '🏢 办公自动化',
    count: 13,
    items: ['feishu-doc-create', 'google-workspace', 'himalaya', 'notion', 'airtable', 'linear', 'obsidian', 'apple-notes', 'apple-reminders', 'powerpoint', 'nano-pdf', 'ocr-and-documents', 'qwenvl-ocr']
  },
  { group: '🕷️ 数据采集', count: 5, items: ['agent-reach', 'browser-act', 'china-web-data-collection', 'wenshu-api-crawl', 'blogwatcher'] },
  { group: '⚡ 自动化引擎', count: 4, items: ['cronjob', 'webhook-subscriptions', 'macos-computer-use', 'macos-browser-automation'] },
  { group: '📤 内容发布', count: 2, items: ['wechat-article-formatter', 'post-anywhere'] }
]

/**
 * 检测 → 连接 → 配置 → 执行 Hermes。
 *
 * 启动策略：先检测本机是否已存在 Hermes（手动路径 / PATH / ~/.hermes）。
 * 存在则复用、不安装内置版；不存在用随包内置版；开发期都没有时回退「模拟模式」。
 */
export class HermesManager {
  private proc: ChildProcess | null = null
  private emit: (evt: NovaEvent) => void = () => {}
  private runSeq = 0
  private runs = 0 // 本次会话执行计数（本地用量指标）
  private settings: NovaSettings = loadSettings()
  private _status: HermesStatus = { mode: 'simulated', detected: false, bin: null, ready: false }

  async init(emit: (evt: NovaEvent) => void): Promise<void> {
    this.emit = emit
    this.refresh()
  }

  getSettings(): NovaSettings {
    return this.settings
  }

  setSettings(patch: Partial<NovaSettings>): NovaSettings {
    this.settings = saveSettings(patch)
    this.refresh()
    return this.settings
  }

  status(): HermesStatus {
    return this._status
  }

  /** 依据当前设置重新解析 Hermes 位置与运行模式 */
  refresh(): HermesStatus {
    const bin = this.resolveBin()
    if (bin) {
      const bundled = this.bundledBin()
      const isBundled = !!bundled && bin === bundled
      this._status = { mode: isBundled ? 'bundled' : 'system', detected: !isBundled, bin, ready: true }
    } else {
      this._status = { mode: 'simulated', detected: false, bin: null, ready: true }
    }
    return this._status
  }

  /** 解析 Hermes 可执行文件：手动路径 → PATH → ~/.hermes → 内置 */
  private resolveBin(): string | null {
    const manual = this.settings.hermesPath?.trim()
    if (manual && existsSync(manual)) return manual

    const onPath = this.which('hermes')
    if (onPath) return onPath

    const home = join(homedir(), '.hermes')
    if (existsSync(home)) {
      const cand = join(home, 'bin', 'hermes')
      if (existsSync(cand)) return cand
    }

    const bundled = this.bundledBin()
    if (bundled && existsSync(bundled)) return bundled

    return null
  }

  private which(cmd: string): string | null {
    try {
      const lookup = process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`
      const out = execSync(lookup, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
      const first = out.split('\n')[0]?.trim()
      return first || null
    } catch {
      return null
    }
  }

  private bundledBin(): string | null {
    return process.resourcesPath ? join(process.resourcesPath, 'hermes', 'bin', 'hermes') : null
  }

  /** 测试连接：校验可执行并尝试读取版本 */
  async test(): Promise<TestResult> {
    const st = this.refresh()
    if (st.mode === 'simulated' || !st.bin) {
      return { ok: false, bin: null, mode: 'simulated', message: '未检测到 Hermes。可在上方手动指定可执行文件路径，或先以模拟模式开发。' }
    }
    try {
      const version = execSync(`"${st.bin}" --version`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().trim()
      return { ok: true, bin: st.bin, version, mode: st.mode, message: `连接成功（${st.mode}）` }
    } catch {
      // 找到了可执行文件，但 --version 不可用，仍视为已连接
      return { ok: true, bin: st.bin, mode: st.mode, message: `已找到 Hermes：${st.bin}（无法读取版本号）` }
    }
  }

  /** 基本属性：模型 / Profile / Skill / MCP / Token 使用量 */
  async info(): Promise<HermesInfo> {
    const st = this.refresh()
    const connected = st.mode !== 'simulated' && !!st.bin
    return {
      connected,
      mode: st.mode,
      bin: st.bin,
      model: this.settings.model,
      profile: this.settings.profile,
      skills: SKILLS,
      mcp: connected && st.bin ? this.queryMcp(st.bin) : [],
      usage: this.queryUsage(connected, st.bin)
    }
  }

  /** 查询 MCP 列表。TODO: 替换为 Hermes 真实命令（命令名待定，未知时返回空）。 */
  private queryMcp(bin: string): Array<{ name: string; status: string }> {
    try {
      const out = execSync(`"${bin}" mcp list`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().trim()
      return out ? out.split('\n').filter(Boolean).map((l) => ({ name: l.trim(), status: 'configured' })) : []
    } catch {
      return []
    }
  }

  /** Token 使用量。本地会话计数 + 预留 Hermes 真实用量接入点。 */
  private queryUsage(connected: boolean, bin: string | null): Array<{ label: string; value: string }> {
    const local = [{ label: '本次会话执行次数', value: String(this.runs) }]
    if (!connected || !bin) return local
    // TODO: 接 Hermes 真实用量命令（如 `hermes usage --json`），解析 tokens 后并入。
    return local
  }

  /** 执行一条自然语言指令；返回 runId，过程通过事件流推送。 */
  async run(text: string): Promise<{ runId: string }> {
    const runId = `r${++this.runSeq}`
    this.runs++
    const st = this._status
    if (st.mode === 'simulated' || !st.bin) {
      void this.simulate(runId, text)
    } else {
      this.runReal(runId, text, st.bin)
    }
    return { runId }
  }

  dispose(): void {
    this.proc?.kill()
    this.proc = null
  }

  // ── 真实 Hermes：spawn `hermes chat --profile <p> -- <text>`，流式转发 stdout/stderr ──

  private runReal(runId: string, text: string, bin: string): void {
    const stepId = `${runId}-h`
    this.emit({ type: 'step-start', runId, id: stepId, skill: 'hermes', desc: `profile=${this.settings.profile}` })

    let child: ChildProcess
    try {
      child = spawn(bin, ['chat', '--profile', this.settings.profile, '--', text], {
        cwd: homedir(),
        env: { ...process.env, ...this.devEnv() }
      })
    } catch (e) {
      this.emit({ type: 'step-done', runId, id: stepId, ok: false })
      this.emit({ type: 'error', runId, message: `启动 Hermes 失败：${(e as Error).message}` })
      this.emit({ type: 'done', runId })
      return
    }

    this.proc = child
    child.stdout?.on('data', (d: Buffer) => this.emit({ type: 'output', runId, chunk: d.toString() }))
    child.stderr?.on('data', (d: Buffer) => this.emit({ type: 'output', runId, chunk: d.toString() }))
    child.on('error', (e: Error) => this.emit({ type: 'error', runId, message: `Hermes 进程错误：${e.message}` }))
    child.on('close', (code: number | null) => {
      this.emit({ type: 'step-done', runId, id: stepId, ok: code === 0 })
      if (code !== 0) this.emit({ type: 'error', runId, message: `Hermes 退出码 ${code}` })
      this.emit({ type: 'done', runId })
      this.proc = null
    })
  }

  /** 开发期把仓库根 .env 注入子进程，便于 Hermes 读取 DEEPSEEK_* 等（打包后无此文件，返回空）。 */
  private devEnv(): Record<string, string> {
    const candidates = [join(process.cwd(), '.env'), join(process.cwd(), '..', '..', '.env')]
    for (const f of candidates) {
      try {
        if (!existsSync(f)) continue
        const env: Record<string, string> = {}
        for (const line of readFileSync(f, 'utf8').split('\n')) {
          const s = line.trim()
          if (!s || s.startsWith('#')) continue
          const i = s.indexOf('=')
          if (i > 0) env[s.slice(0, i).trim()] = s.slice(i + 1).trim()
        }
        return env
      } catch {
        // 忽略
      }
    }
    return {}
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
    this.emit({ type: 'intent', runId, text, intent: `已解析意图 · 规划 ${steps.length} 个 Skill（模拟模式 · 未连接 Hermes）` })
    await sleep(420)

    for (let i = 0; i < steps.length; i++) {
      const id = `${runId}-${i}`
      this.emit({ type: 'step-start', runId, id, skill: steps[i].skill, desc: steps[i].desc })
      await sleep(720)
      this.emit({ type: 'step-done', runId, id, ok: true })
    }

    await sleep(320)
    this.emit({ type: 'result', runId, text: `✅ 流程已完成 · 共调度 ${steps.length} 个 Skill（模拟模式，连接 Hermes 后为真实执行）` })
    this.emit({ type: 'done', runId })
  }
}
