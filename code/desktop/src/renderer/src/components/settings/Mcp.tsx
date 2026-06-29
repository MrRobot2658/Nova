import { useEffect, useState } from 'react'
import type { ActionResult, HermesInfo, McpRow } from '../../types'

export default function Mcp(): JSX.Element {
  const [rows, setRows] = useState<McpRow[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [cmd, setCmd] = useState('')
  const [args, setArgs] = useState('')
  const [mode, setMode] = useState<'url' | 'cmd'>('url')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<ActionResult | null>(null)
  const [connected, setConnected] = useState(true)

  const load = async (): Promise<void> => {
    setRows((await window.nova.listMcp()) as McpRow[])
  }

  useEffect(() => {
    void window.nova.info().then((i) => setConnected(!!(i as HermesInfo).connected))
    void load()
  }, [])

  const add = async (): Promise<void> => {
    setBusy(true)
    setMsg(null)
    const input = mode === 'url' ? { name, url } : { name, command: cmd, args }
    const r = (await window.nova.addMcp(input)) as ActionResult
    setMsg(r)
    setBusy(false)
    if (r.ok) {
      setName('')
      setUrl('')
      setCmd('')
      setArgs('')
      await load()
    }
  }

  const remove = async (n: string): Promise<void> => {
    setBusy(true)
    setMsg((await window.nova.removeMcp(n)) as ActionResult)
    setBusy(false)
    await load()
  }

  if (!connected) return <div className="sub-page"><p className="muted">连接 Hermes 后可管理 MCP Server。</p></div>

  return (
    <div className="sub-page">
      <section className="card">
        <h3>添加 MCP Server</h3>
        <label className="field">
          <span>名称</span>
          <input type="text" value={name} placeholder="如 n8n" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="seg">
          <button className={mode === 'url' ? 'on' : ''} onClick={() => setMode('url')}>URL 端点</button>
          <button className={mode === 'cmd' ? 'on' : ''} onClick={() => setMode('cmd')}>本地命令</button>
        </div>
        {mode === 'url' ? (
          <label className="field">
            <span>URL</span>
            <input type="text" value={url} placeholder="https://..." onChange={(e) => setUrl(e.target.value)} />
          </label>
        ) : (
          <>
            <label className="field">
              <span>命令</span>
              <input type="text" value={cmd} placeholder="npx" onChange={(e) => setCmd(e.target.value)} />
            </label>
            <label className="field">
              <span>参数（空格分隔）</span>
              <input type="text" value={args} placeholder="-y some-mcp-server" onChange={(e) => setArgs(e.target.value)} />
            </label>
          </>
        )}
        <div className="row">
          <button className="btn primary" disabled={busy} onClick={add}>{busy ? '处理中…' : '添加'}</button>
        </div>
        {msg && <p className={`note ${msg.ok ? 'ok' : 'warn'}`}>{msg.message.slice(0, 400)}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>已配置 MCP</h3>
          <div className="row">
            <span className="pill">{rows.length}</span>
            <button className="btn" onClick={load}>刷新</button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted">暂无已配置的 MCP Server。</p>
        ) : (
          <ul className="kv-list">
            {rows.map((r) => (
              <li key={r.name}>
                <span className="mono">{r.name}{r.detail ? ` · ${r.detail}` : ''}</span>
                <button className="btn tiny" disabled={busy} onClick={() => remove(r.name)}>移除</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
