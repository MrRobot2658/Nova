import { spawn, execFileSync, execSync, type ChildProcess } from 'child_process'
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
  /** 离线回退用的静态 Skill 目录 */
  skills: SkillGroup[]
  /** 已连接时由真实命令获取的文本输出 */
  profilesText: string | null
  skillsText: string | null
  mcpText: string | null
  insightsText: string | null
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

/** Nova 预制 Skill 目录（未连接时的静态展示） */
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
 * 真实 CLI（实测）：
 *  - 单次非交互执行：`hermes chat -q "<prompt>" -Q [--yolo] [-m <model>]`
 *  - profile 通过 `hermes profile use <name>` 设为粘性默认（无 --profile 标志）
 *  - 信息查询：`hermes profile list` / `skills list` / `mcp list` / `insights`
 *  - 版本：`hermes --version`
 */
export class HermesManager {
  private proc: ChildProcess | null = null
  private emit: (evt: NovaEvent) => void = () => {}
  private runSeq = 0
  private settings: NovaSettings = loadSettings()
  private _status: HermesStatus = { mode: 'simulated', detected: false, bin: null, ready: false }

  async init(emit: (evt: NovaEvent) => void): Promise<void> {
    this.emit = emit
    this.refresh()
  }

  getSettings(): NovaSettings {
    return this.settings
  }

  async setSettings(patch: Partial<NovaSettings>): Promise<NovaSettings> {
    this.settings = saveSettings(patch)
    this.refresh()
    // 设置了 profile 且已连接 → 设为 Hermes 粘性默认
    if (typeof patch.profile === 'string' && patch.profile.trim() && this._status.bin && this._status.mode !== 'simulated') {
      try {
        execFileSync(this._status.bin, ['profile', 'use', patch.profile.trim()], { stdio: 'ignore', timeout: 8000 })
      } catch {
        // 忽略（profile 可能不存在）
      }
    }
    return this.settings
  }

  status(): HermesStatus {
    return this._status
  }

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
      return out.split('\n')[0]?.trim() || null
    } catch {
      return null
    }
  }

  private bundledBin(): string | null {
    return process.resourcesPath ? join(process.resourcesPath, 'hermes', 'bin', 'hermes') : null
  }

  /** 运行一个只读子命令并返回文本（失败返回 null） */
  private query(args: string[], timeoutMs = 10000): string | null {
    const bin = this._status.bin
    if (!bin) return null
    try {
      return execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs, env: { ...process.env, NO_COLOR: '1' } }).toString().trim()
    } catch (e) {
      const err = e as { stdout?: Buffer; stderr?: Buffer }
      const out = `${err.stdout?.toString() ?? ''}${err.stderr?.toString() ?? ''}`.trim()
      return out || null
    }
  }

  async test(): Promise<TestResult> {
    const st = this.refresh()
    if (st.mode === 'simulated' || !st.bin) {
      return { ok: false, bin: null, mode: 'simulated', message: '未检测到 Hermes。可在上方手动指定路径，或先以模拟模式开发。' }
    }
    try {
      const version = execFileSync(st.bin, ['--version'], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString().trim()
      return { ok: true, bin: st.bin, version, mode: st.mode, message: `连接成功（${st.mode}）` }
    } catch {
      return { ok: true, bin: st.bin, mode: st.mode, message: `已找到 Hermes：${st.bin}（无法读取版本号）` }
    }
  }

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
      profilesText: connected ? this.query(['profile', 'list']) : null,
      skillsText: connected ? this.query(['skills', 'list']) : null,
      mcpText: connected ? this.query(['mcp', 'list']) : null,
      insightsText: connected ? this.query(['insights', '--days', '30']) : null
    }
  }

  async run(text: string): Promise<{ runId: string }> {
    const runId = `r${++this.runSeq}`
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

  // ── 真实 Hermes：`hermes chat -q "<text>" -Q [--yolo] [-m model]` ──

  private runReal(runId: string, text: string, bin: string): void {
    const stepId = `${runId}-h`
    const model = this.settings.model.trim()
    this.emit({ type: 'step-start', runId, id: stepId, skill: 'hermes', desc: `chat -q · ${model || 'Hermes 默认模型'}` })

    const args = ['chat', '-q', text, '-Q']
    if (this.settings.yolo) args.push('--yolo')
    if (model) args.push('-m', model)

    const cwd = this.settings.workdir?.trim() || homedir()
    let child: ChildProcess
    try {
      child = spawn(bin, args, { cwd, env: { ...process.env, ...this.devEnv(), NO_COLOR: '1' } })
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

  /** 开发期把仓库根 .env 注入子进程，便于 Hermes 读取 DEEPSEEK_* 等（打包后无此文件）。 */
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

  // ── 开发期模拟（未连接 Hermes 时） ──

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
