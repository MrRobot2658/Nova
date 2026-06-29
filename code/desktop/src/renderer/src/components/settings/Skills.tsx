import { useEffect, useState } from 'react'
import type { ActionResult, HermesInfo, SkillRow } from '../../types'

export default function Skills(): JSX.Element {
  const [rows, setRows] = useState<SkillRow[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<ActionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(true)

  const load = async (): Promise<void> => {
    setLoading(true)
    setRows((await window.nova.listSkills()) as SkillRow[])
    setLoading(false)
  }

  useEffect(() => {
    void window.nova.info().then((i) => setConnected(!!(i as HermesInfo).connected))
    void load()
  }, [])

  const install = async (): Promise<void> => {
    if (!q.trim()) return
    setBusy(true)
    setMsg(null)
    const r = (await window.nova.installSkill(q.trim())) as ActionResult
    setMsg(r)
    setBusy(false)
    if (r.ok) {
      setQ('')
      await load()
    }
  }

  const remove = async (name: string): Promise<void> => {
    setBusy(true)
    setMsg(null)
    setMsg((await window.nova.uninstallSkill(name)) as ActionResult)
    setBusy(false)
    await load()
  }

  if (!connected) return <div className="sub-page"><p className="muted">连接 Hermes 后可管理 Skill。</p></div>

  return (
    <div className="sub-page">
      <section className="card">
        <h3>安装 Skill</h3>
        <div className="row">
          <input type="text" style={{ flex: 1 }} value={q} placeholder="Skill 名称、registry id 或 git URL" onChange={(e) => setQ(e.target.value)} />
          <button className="btn primary" disabled={busy} onClick={install}>{busy ? '处理中…' : '安装'}</button>
        </div>
        {msg && <p className={`note ${msg.ok ? 'ok' : 'warn'}`}>{msg.message.slice(0, 400)}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>已安装 Skill</h3>
          <div className="row">
            <span className="pill">{rows.length}</span>
            <button className="btn" onClick={load}>刷新</button>
          </div>
        </div>
        {loading ? (
          <p className="muted">加载中…</p>
        ) : rows.length === 0 ? (
          <p className="muted">暂无已安装 Skill。</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>名称</th><th>来源</th><th>信任</th><th>状态</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="mono">{r.name}</td>
                  <td>{r.source}</td>
                  <td>{r.trust}</td>
                  <td><span className={`tag ${r.status === 'enabled' ? 'on' : ''}`}>{r.status}</span></td>
                  <td><button className="btn tiny" disabled={busy} onClick={() => remove(r.name)}>卸载</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
