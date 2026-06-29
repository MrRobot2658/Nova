import { useEffect, useState } from 'react'
import type { HermesInfo, NovaSettings, TestResult } from '../types'

interface Props {
  onChanged: () => void
}

export default function Settings({ onChanged }: Props): JSX.Element {
  const [settings, setSettings] = useState<NovaSettings>({ hermesPath: '', profile: 'devops', model: 'deepseek-v4-pro' })
  const [test, setTest] = useState<TestResult | null>(null)
  const [info, setInfo] = useState<HermesInfo | null>(null)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void window.nova.getSettings().then((s) => setSettings(s as NovaSettings))
    void window.nova.info().then((i) => setInfo(i as HermesInfo))
  }, [])

  const update = (patch: Partial<NovaSettings>): void => {
    setSettings((s) => ({ ...s, ...patch }))
    setSaved(false)
  }

  const save = async (): Promise<void> => {
    const s = (await window.nova.setSettings(settings as unknown as Record<string, unknown>)) as NovaSettings
    setSettings(s)
    setSaved(true)
    onChanged()
    void window.nova.info().then((i) => setInfo(i as HermesInfo))
  }

  const runTest = async (): Promise<void> => {
    setTesting(true)
    // 测试前先保存路径等设置，确保用当前输入解析
    await window.nova.setSettings(settings as unknown as Record<string, unknown>)
    const r = (await window.nova.test()) as TestResult
    setTest(r)
    onChanged()
    const i = (await window.nova.info()) as HermesInfo
    setInfo(i)
    setTesting(false)
  }

  const connected = !!info?.connected

  return (
    <main className="settings">
      <header className="titlebar drag">设置</header>
      <div className="settings-body">
        {/* ── 连接 ── */}
        <section className="card">
          <h3>Hermes 连接</h3>
          <label className="field">
            <span>Hermes 可执行路径</span>
            <input
              type="text"
              placeholder="留空自动检测（PATH / ~/.hermes / 内置）"
              value={settings.hermesPath}
              onChange={(e) => update({ hermesPath: e.target.value })}
            />
          </label>
          <div className="row">
            <button className="btn primary" disabled={testing} onClick={runTest}>
              {testing ? '测试中…' : '测试连接'}
            </button>
            {test && (
              <span className={`pill ${test.ok ? 'ok' : 'warn'}`}>
                {test.ok ? '✓' : '!'} {test.message}
                {test.version ? ` · ${test.version}` : ''}
              </span>
            )}
          </div>
        </section>

        {/* ── 基本属性（连接成功后可配置/查看） ── */}
        <section className={`card ${connected ? '' : 'disabled'}`}>
          <div className="card-head">
            <h3>基本属性</h3>
            <span className={`pill ${connected ? 'ok' : 'warn'}`}>{connected ? `已连接 · ${info?.mode}` : '未连接（模拟模式）'}</span>
          </div>

          <div className="grid2">
            <label className="field">
              <span>Profile</span>
              <input type="text" value={settings.profile} onChange={(e) => update({ profile: e.target.value })} />
            </label>
            <label className="field">
              <span>模型</span>
              <select value={settings.model} onChange={(e) => update({ model: e.target.value })}>
                <option value="deepseek-v4-pro">deepseek-v4-pro（强推理）</option>
                <option value="deepseek-v4-flash">deepseek-v4-flash（快/省）</option>
              </select>
            </label>
          </div>

          <div className="row">
            <button className="btn primary" onClick={save}>保存</button>
            {saved && <span className="pill ok">✓ 已保存</span>}
          </div>
        </section>

        {/* ── Skill ── */}
        <section className="card">
          <div className="card-head">
            <h3>Skill</h3>
            <span className="pill">{info?.skills.reduce((n, g) => n + g.count, 0) ?? 28} 个</span>
          </div>
          <div className="skill-groups">
            {info?.skills.map((g) => (
              <div key={g.group} className="skill-group">
                <div className="sg-head">
                  <span>{g.group}</span>
                  <span className="pill">{g.count}</span>
                </div>
                <div className="chips">
                  {g.items.map((it) => (
                    <span key={it} className="chip">{it}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── MCP ── */}
        <section className="card">
          <h3>MCP Server</h3>
          {connected ? (
            info && info.mcp.length > 0 ? (
              <ul className="kv-list">
                {info.mcp.map((m) => (
                  <li key={m.name}>
                    <span>{m.name}</span>
                    <span className="pill ok">{m.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">未检测到已配置的 MCP Server。</p>
            )
          ) : (
            <p className="muted">连接 Hermes 后显示已配置的 MCP Server。</p>
          )}
        </section>

        {/* ── Token 使用量 ── */}
        <section className="card">
          <h3>Token 使用量</h3>
          <ul className="kv-list">
            {info?.usage.map((u) => (
              <li key={u.label}>
                <span>{u.label}</span>
                <span className="pill">{u.value}</span>
              </li>
            ))}
          </ul>
          {!connected && <p className="muted">连接 Hermes 后显示真实 token 用量。</p>}
        </section>
      </div>
    </main>
  )
}
