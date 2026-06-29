import { spawn, execFileSync, execSync, type ChildProcess } from 'child_process'
import { existsSync, readFileSync, readdirSync } from 'fs'
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

export interface HermesInfo {
  connected: boolean
  mode: HermesMode
  bin: string | null
  model: string
  profile: string
}

export interface ProfileRow {
  name: string
  model: string
  isDefault: boolean
}

export interface SkillRow {
  name: string
  category: string
  source: string
  trust: string
  status: string
}

export interface McpRow {
  name: string
  detail: string
}

export interface McpAddInput {
  name: string
  url?: string
  command?: string
  args?: string
}

export interface ActionResult {
  ok: boolean
  message: string
}

export interface UsageMetric {
  label: string
  value: string
}

export interface SessionItem {
  id: string
  title: string
  preview: string
  lastActive: string
}

export interface SessionMsg {
  role: 'user' | 'agent'
  text: string
}

export type NovaEvent =
  | { type: 'intent'; runId: string; text: string; intent: string }
  | { type: 'step-start'; runId: string; id: string; skill: string; desc: string }
  | { type: 'step-done'; runId: string; id: string; ok: boolean }
  | { type: 'output'; runId: string; chunk: string }
  | { type: 'result'; runId: string; text: string }
  | { type: 'session'; runId: string; sessionId: string }
  | { type: 'error'; runId: string; message: string }
  | { type: 'done'; runId: string }

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

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
  private cancelled = false
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
      return execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1' } }).toString().trim()
    } catch (e) {
      const err = e as { stdout?: Buffer; stderr?: Buffer }
      const out = `${err.stdout?.toString() ?? ''}${err.stderr?.toString() ?? ''}`.trim()
      return out || null
    }
  }

  /** 会话列表（来自 Hermes，仅 cli 来源） */
  async listSessions(limit = 50): Promise<SessionItem[]> {
    if (this._status.mode === 'simulated' || !this._status.bin) return []
    const out = this.query(['sessions', 'list', '--source', 'cli', '--limit', String(limit)])
    if (!out) return []
    const items: SessionItem[] = []
    for (const raw of out.split('\n')) {
      const line = raw.replace(/\s+$/, '')
      if (!line.trim()) continue
      if (line.includes('Last Active') && line.includes('ID')) continue
      if (/^[\s─—-]+$/.test(line)) continue
      const cols = line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean)
      if (cols.length < 2) continue
      const id = cols[cols.length - 1]
      const lastActive = cols.length >= 3 ? cols[cols.length - 2] : ''
      const title = cols[0] === '—' ? '' : cols[0]
      const preview = cols.length >= 4 ? cols[1] : cols.length === 3 ? cols[1] : ''
      items.push({ id, title, preview, lastActive })
    }
    return items
  }

  /** 加载某个会话的历史消息（用于点击会话后回填对话） */
  async loadSession(id: string): Promise<SessionMsg[]> {
    if (this._status.mode === 'simulated' || !this._status.bin) return []
    const out = this.query(['sessions', 'export', '--session-id', id, '-'], 20000)
    if (!out) return []
    try {
      const jsonLine = out.split('\n').find((l) => l.trim().startsWith('{'))
      if (!jsonLine) return []
      const data = JSON.parse(jsonLine) as { messages?: Array<{ role?: string; content?: unknown }> }
      const msgs = data.messages ?? []
      const toText = (c: unknown): string => {
        if (typeof c === 'string') return c
        if (Array.isArray(c)) return c.map((p) => (typeof p === 'string' ? p : ((p as { text?: string })?.text ?? ''))).join('')
        return ''
      }
      return msgs
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('agent' as const), text: toText(m.content).trim() }))
        .filter((m) => m.text)
    } catch {
      return []
    }
  }

  /** 按关键词在常用目录里查找可预览文件，返回 file:// URL（用于「打开 产品介绍」这类命令） */
  resolveFile(keyword: string): string | null {
    const exts = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.html', '.htm']
    const kw = keyword.replace(/\.[a-z0-9]+$/i, '').toLowerCase().trim()
    if (!kw) return null
    const roots = [this.settings.workdir?.trim(), join(homedir(), 'Downloads'), join(homedir(), 'Desktop'), join(homedir(), 'Documents')].filter(Boolean) as string[]
    const skip = new Set(['node_modules', '.git', 'Library', '.Trash', '.cache', 'release', 'out'])

    const queue: Array<{ dir: string; depth: number }> = roots.map((d) => ({ dir: d, depth: 0 }))
    const seen = new Set<string>()
    let scanned = 0
    while (queue.length) {
      const { dir, depth } = queue.shift() as { dir: string; depth: number }
      if (seen.has(dir)) continue
      seen.add(dir)
      let entries: Array<{ name: string; isDirectory(): boolean }>
      try {
        entries = readdirSync(dir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const e of entries) {
        if (e.name.startsWith('.')) continue
        const full = join(dir, e.name)
        if (e.isDirectory()) {
          if (depth < 5 && !skip.has(e.name)) queue.push({ dir: full, depth: depth + 1 })
        } else {
          const lower = e.name.toLowerCase()
          if (exts.some((x) => lower.endsWith(x)) && lower.includes(kw)) return `file://${encodeURI(full)}`
        }
      }
      if (++scanned > 5000) break
    }
    return null
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
    return {
      connected: st.mode !== 'simulated' && !!st.bin,
      mode: st.mode,
      bin: st.bin,
      model: this.settings.model,
      profile: this.settings.profile
    }
  }

  private get connected(): boolean {
    return this._status.mode !== 'simulated' && !!this._status.bin
  }

  /** 运行一个会改状态的子命令，返回执行结果 */
  private action(args: string[], timeoutMs = 60000): ActionResult {
    const bin = this._status.bin
    if (!bin) return { ok: false, message: '未连接 Hermes' }
    try {
      const out = execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1' } }).toString().trim()
      return { ok: true, message: out || '完成' }
    } catch (e) {
      const err = e as { stdout?: Buffer; stderr?: Buffer; message?: string }
      const msg = `${err.stdout?.toString() ?? ''}${err.stderr?.toString() ?? ''}`.trim() || err.message || '执行失败'
      return { ok: false, message: msg }
    }
  }

  /** Profile 列表（解析自 `hermes profile list`） */
  async listProfiles(): Promise<ProfileRow[]> {
    if (!this.connected) return []
    const out = this.query(['profile', 'list'])
    if (!out) return []
    const rows: ProfileRow[] = []
    for (const raw of out.split('\n')) {
      const line = raw.trim()
      if (!line) continue
      if (line.includes('Profile') && line.includes('Model')) continue
      if (/^[\s─—-]+$/.test(line)) continue
      const isDefault = line.includes('◆')
      const cols = line.replace('◆', '').split(/\s{2,}/).map((s) => s.trim()).filter(Boolean)
      if (!cols.length) continue
      rows.push({ name: cols[0], model: cols[1] && cols[1] !== '—' ? cols[1] : '', isDefault })
    }
    return rows
  }

  /** 已安装 Skill 列表（解析自 `hermes skills list` 的表格） */
  async listSkills(): Promise<SkillRow[]> {
    if (!this.connected) return []
    const out = this.query(['skills', 'list'])
    if (!out) return []
    const rows: SkillRow[] = []
    for (const line of out.split('\n')) {
      if (!line.includes('│')) continue // 数据行用 │，表头用 ┃
      const inner = line.split('│').map((c) => c.trim())
      inner.shift()
      inner.pop()
      if (inner.length < 5) continue
      const [name, category, source, trust, status] = inner
      if (!name || name === 'Name') continue
      rows.push({ name, category, source, trust, status })
    }
    return rows
  }

  async installSkill(idOrUrl: string): Promise<ActionResult> {
    if (!idOrUrl.trim()) return { ok: false, message: '请填写 Skill 名称或地址' }
    return this.action(['skills', 'install', idOrUrl.trim()], 180000)
  }

  async uninstallSkill(name: string): Promise<ActionResult> {
    return this.action(['skills', 'uninstall', name], 60000)
  }

  /** MCP 服务器列表（解析自 `hermes mcp list`） */
  async listMcp(): Promise<McpRow[]> {
    if (!this.connected) return []
    const out = this.query(['mcp', 'list'])
    if (!out || /no mcp servers/i.test(out)) return []
    const rows: McpRow[] = []
    for (const raw of out.split('\n')) {
      const line = raw.trim()
      if (!line) continue
      if (/add one with|hermes mcp add|--url|--command|^usage:/i.test(line)) continue
      if (/^[\s─—-]+$/.test(line)) continue
      const cols = line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean)
      if (!cols.length) continue
      rows.push({ name: cols[0], detail: cols.slice(1).join(' · ') })
    }
    return rows
  }

  async addMcp(input: McpAddInput): Promise<ActionResult> {
    if (!input.name?.trim()) return { ok: false, message: '请填写名称' }
    const args = ['mcp', 'add', input.name.trim()]
    if (input.url?.trim()) {
      args.push('--url', input.url.trim())
    } else if (input.command?.trim()) {
      args.push('--command', input.command.trim())
      if (input.args?.trim()) args.push('--args', ...input.args.trim().split(/\s+/))
    } else {
      return { ok: false, message: '请填写 URL 或命令' }
    }
    return this.action(args, 60000)
  }

  async removeMcp(name: string): Promise<ActionResult> {
    return this.action(['mcp', 'remove', name], 30000)
  }

  /** Token 用量指标（解析自 `hermes insights`） */
  async usageMetrics(): Promise<UsageMetric[]> {
    if (!this.connected) return []
    const out = this.query(['insights', '--days', '30'], 15000)
    if (!out) return []
    const metrics: UsageMetric[] = []
    const add = (label: string, re: RegExp): void => {
      const m = out.match(re)
      if (m) metrics.push({ label, value: m[1].trim() })
    }
    add('会话数', /Sessions:\s*([\d,]+)/)
    add('消息数', /Messages:\s*([\d,]+)/)
    add('工具调用', /Tool calls:\s*([\d,]+)/)
    add('输入 tokens', /Input tokens:\s*([\d,]+)/)
    add('输出 tokens', /Output tokens:\s*([\d,]+)/)
    add('总 tokens', /Total tokens:\s*([\d,]+)/)
    add('预计成本', /(\$[\d.,]+)/)
    return metrics
  }

  /** 停止当前执行 */
  cancel(): void {
    this.cancelled = true
    this.proc?.kill()
    this.proc = null
  }

  async run(text: string, sessionId?: string): Promise<{ runId: string }> {
    const runId = `r${++this.runSeq}`
    this.cancelled = false
    const st = this._status
    if (st.mode === 'simulated' || !st.bin) {
      void this.simulate(runId, text)
    } else {
      this.runReal(runId, text, st.bin, sessionId)
    }
    return { runId }
  }

  dispose(): void {
    this.proc?.kill()
    this.proc = null
  }

  // ── 真实 Hermes：`hermes chat -q "<text>" -Q [--yolo] [-m model]` ──

  private runReal(runId: string, text: string, bin: string, sessionId?: string): void {
    const stepId = `${runId}-h`
    const model = this.settings.model.trim()
    const resuming = !!sessionId
    this.emit({ type: 'step-start', runId, id: stepId, skill: 'hermes', desc: `chat -q · ${model || 'Hermes 默认模型'}${resuming ? ' · 续接会话' : ''}` })

    const args = ['chat', '-q', text, '-Q']
    if (sessionId) args.push('--resume', sessionId)
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
    let sessionCaptured = false
    child.stdout?.on('data', (d: Buffer) => {
      let s = d.toString()
      if (!sessionCaptured) {
        const m = s.match(/session_id:\s*(\S+)/)
        if (m) {
          sessionCaptured = true
          this.emit({ type: 'session', runId, sessionId: m[1] })
          s = s.replace(/.*session_id:\s*\S+[^\n]*\n?/, '')
        }
      }
      if (s) this.emit({ type: 'output', runId, chunk: s })
    })
    child.stderr?.on('data', (d: Buffer) => this.emit({ type: 'output', runId, chunk: d.toString() }))
    child.on('error', (e: Error) => this.emit({ type: 'error', runId, message: `Hermes 进程错误：${e.message}` }))
    child.on('close', (code: number | null) => {
      if (this.cancelled) {
        this.emit({ type: 'step-done', runId, id: stepId, ok: false })
        this.emit({ type: 'output', runId, chunk: '\n（已停止）' })
        this.emit({ type: 'done', runId })
        this.proc = null
        return
      }
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
      if (this.cancelled) {
        this.emit({ type: 'output', runId, chunk: '（已停止）' })
        this.emit({ type: 'done', runId })
        return
      }
      const id = `${runId}-${i}`
      this.emit({ type: 'step-start', runId, id, skill: steps[i].skill, desc: steps[i].desc })
      await sleep(720)
      this.emit({ type: 'step-done', runId, id, ok: true })
    }
    if (this.cancelled) {
      this.emit({ type: 'done', runId })
      return
    }

    await sleep(320)
    this.emit({ type: 'result', runId, text: `✅ 流程已完成 · 共调度 ${steps.length} 个 Skill（模拟模式，连接 Hermes 后为真实执行）` })
    this.emit({ type: 'done', runId })
  }
}
