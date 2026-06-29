import http from 'http'
import type { BrowserWindow } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

/**
 * 浏览器自动化桥：在主进程开一个仅本机的 HTTP 控制服务，
 * 把请求转成 IPC 指令发给渲染层，由渲染层在右侧 <webview> 上执行后回传结果。
 *
 * Hermes 技能可通过 `POST http://127.0.0.1:<port>/browser` 驱动内置浏览器采集：
 *   {"action":"navigate","url":"https://..."}
 *   {"action":"text"} | {"action":"html"} | {"action":"info"}
 *   {"action":"eval","js":"document.title"}
 *   {"action":"scrollBottom"} | {"action":"screenshot"}
 * 端口写入 ~/.nova/bridge.json，并通过环境变量 NOVA_BROWSER_BRIDGE 传给子进程。
 */

let server: http.Server | null = null
let getWin: () => BrowserWindow | null = () => null
let seq = 0
let activePort = 0
const pending = new Map<number, (result: unknown) => void>()

/** 渲染层执行完毕后回传结果 */
export function resolveBrowserResult(id: number, result: unknown): void {
  const cb = pending.get(id)
  if (cb) {
    pending.delete(id)
    cb(result)
  }
}

function runCommand(cmd: Record<string, unknown>, timeoutMs = 30000): Promise<unknown> {
  const win = getWin()
  if (!win) return Promise.resolve({ ok: false, error: 'window not ready' })
  const id = ++seq
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        resolve({ ok: false, error: 'timeout' })
      }
    }, timeoutMs)
    pending.set(id, (r) => {
      clearTimeout(timer)
      resolve(r)
    })
    win.webContents.send('browser:command', { id, ...cmd })
  })
}

function finalize(port: number): void {
  activePort = port
  process.env.NOVA_BROWSER_BRIDGE = `http://127.0.0.1:${port}`
  try {
    const dir = join(homedir(), '.nova')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'bridge.json'), JSON.stringify({ port, url: `http://127.0.0.1:${port}` }, null, 2))
  } catch {
    // 忽略写入失败
  }
}

export function startBridge(getWindow: () => BrowserWindow | null): void {
  getWin = getWindow
  server = http.createServer((req, res) => {
    const send = (code: number, body: unknown): void => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true, port: activePort })
    if (req.method === 'POST' && req.url === '/browser') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        let cmd: Record<string, unknown>
        try {
          cmd = JSON.parse(body || '{}')
        } catch {
          return send(400, { ok: false, error: 'invalid json' })
        }
        void runCommand(cmd).then((result) => send(200, result))
      })
      return
    }
    send(404, { ok: false, error: 'not found' })
  })

  const startPort = Number(process.env.NOVA_BRIDGE_PORT) || 8769
  const listen = (port: number, left: number): void => {
    const onError = (e: NodeJS.ErrnoException): void => {
      server?.removeListener('error', onError)
      if (e.code === 'EADDRINUSE' && left > 0) listen(port + 1, left - 1)
    }
    server?.once('error', onError)
    server?.listen(port, '127.0.0.1', () => {
      server?.removeListener('error', onError)
      finalize(port)
    })
  }
  listen(startPort, 10)
}

export function stopBridge(): void {
  server?.close()
  server = null
}
