import { spawn, type ChildProcess } from 'child_process'

/**
 * 最小化 ACP（Agent Client Protocol）客户端：驱动 `hermes acp`（newline-delimited JSON-RPC），
 * 把 session/update 里的 tool_call / agent_message_chunk 映射成结构化事件——用于「结构化执行时间线」。
 *
 * 权衡：ACP 每次 session/new 是独立 UUID 会话（与 `chat --resume` 的 cli 会话不同），
 * 因此侧栏会话列表暂不整合；作为实验模式（设置里开启）。
 */
export interface AcpCallbacks {
  onIntent: (text: string) => void
  onStepStart: (id: string, skill: string, desc: string) => void
  onStepDone: (id: string, ok: boolean) => void
  onOutput: (chunk: string) => void
  onError: (message: string) => void
  onDone: () => void
}

type Json = Record<string, unknown>

export class AcpRunner {
  private proc: ChildProcess | null = null
  private buf = ''
  private nextId = 1
  private pending = new Map<number, (msg: Json) => void>()
  private cb: AcpCallbacks
  private done = false

  constructor(cb: AcpCallbacks) {
    this.cb = cb
  }

  async run(bin: string, text: string, cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
    let child: ChildProcess
    try {
      child = spawn(bin, ['acp', '--accept-hooks', '--yes'], { cwd, env })
    } catch (e) {
      this.cb.onError(`启动 Hermes ACP 失败：${(e as Error).message}`)
      this.finish()
      return
    }
    this.proc = child
    child.stdout?.on('data', (d: Buffer) => this.feed(d.toString()))
    child.on('close', () => this.finish())
    child.on('error', (e: Error) => this.cb.onError(`ACP 进程错误：${e.message}`))

    try {
      await this.request('initialize', { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } } })
      const ns = await this.request('session/new', { cwd, mcpServers: [] })
      const sessionId = (ns.result as Json | undefined)?.sessionId as string | undefined
      if (!sessionId) {
        this.cb.onError('ACP 未返回 sessionId')
        this.dispose()
        return
      }
      this.cb.onIntent('ACP 会话已建立 · 结构化执行')
      const pr = await this.request('session/prompt', { sessionId, prompt: [{ type: 'text', text }] }, 300000)
      const stop = (pr.result as Json | undefined)?.stopReason as string | undefined
      if (stop && stop !== 'end_turn') this.cb.onOutput(`\n（结束：${stop}）`)
    } catch (e) {
      this.cb.onError(`ACP 执行出错：${(e as Error).message}`)
    } finally {
      this.dispose() // kill → close → finish()
    }
  }

  cancel(): void {
    this.dispose()
  }

  private feed(s: string): void {
    this.buf += s
    let i: number
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i).trim()
      this.buf = this.buf.slice(i + 1)
      if (line) this.handle(line)
    }
  }

  private handle(line: string): void {
    let msg: Json
    try {
      msg = JSON.parse(line)
    } catch {
      return
    }
    // 响应
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const cb = this.pending.get(msg.id as number)
      if (cb) {
        this.pending.delete(msg.id as number)
        cb(msg)
      }
      return
    }
    // 来自 agent 的请求（需回复）
    if (typeof msg.method === 'string' && msg.id !== undefined) {
      this.onAgentRequest(msg)
      return
    }
    // 通知
    if (msg.method === 'session/update') this.onUpdate((msg.params as Json)?.update as Json)
  }

  private onUpdate(u: Json | undefined): void {
    if (!u) return
    const kind = u.sessionUpdate as string
    if (kind === 'agent_message_chunk') {
      const t = (u.content as Json | undefined)?.text as string | undefined
      if (t) this.cb.onOutput(t)
    } else if (kind === 'tool_call') {
      const id = (u.toolCallId as string) || `tc${this.nextId++}`
      const title = (u.title as string) || (u.kind as string) || 'tool'
      this.cb.onStepStart(id, title, (u.kind as string) || '')
      const st = u.status as string
      if (st === 'completed' || st === 'failed') this.cb.onStepDone(id, st === 'completed')
    } else if (kind === 'tool_call_update') {
      const st = u.status as string
      if (st === 'completed' || st === 'failed') this.cb.onStepDone(u.toolCallId as string, st === 'completed')
    }
    // agent_thought_chunk / usage_update / available_commands_update 忽略
  }

  private onAgentRequest(msg: Json): void {
    if (msg.method === 'session/request_permission') {
      const options = ((msg.params as Json | undefined)?.options as Array<Json> | undefined) ?? []
      const allow = options.find((o) => /allow/i.test(`${o.kind ?? ''}${o.optionId ?? ''}`)) ?? options[0]
      if (allow) {
        this.send({ jsonrpc: '2.0', id: msg.id, result: { outcome: { outcome: 'selected', optionId: allow.optionId } } })
      } else {
        this.send({ jsonrpc: '2.0', id: msg.id, result: { outcome: { outcome: 'cancelled' } } })
      }
    } else {
      this.send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'not supported' } })
    }
  }

  private request(method: string, params: Json, timeoutMs = 120000): Promise<Json> {
    const id = this.nextId++
    const promise = new Promise<Json>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} 超时`))
      }, timeoutMs)
      this.pending.set(id, (msg) => {
        clearTimeout(timer)
        if (msg.error) reject(new Error((msg.error as Json).message as string))
        else resolve(msg)
      })
    })
    this.send({ jsonrpc: '2.0', id, method, params })
    return promise
  }

  private send(obj: Json): void {
    this.proc?.stdin?.write(`${JSON.stringify(obj)}\n`)
  }

  private finish(): void {
    if (this.done) return
    this.done = true
    this.cb.onDone()
  }

  private dispose(): void {
    this.proc?.kill()
    this.proc = null
  }
}
