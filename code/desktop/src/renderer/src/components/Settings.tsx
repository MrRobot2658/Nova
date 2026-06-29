import { useEffect, useState } from 'react'
import type { HermesInfo, NovaSettings, TestResult } from '../types'

interface Props {
  onChanged: () => void
}

const EMPTY_SETTINGS: NovaSettings = { hermesPath: '', profile: '', model: '', yolo: true }

export default function Settings({ onChanged }: Props): JSX.Element {
  const [settings, setSettings] = useState<NovaSettings>(EMPTY_SETTINGS)
  const [test, setTest] = useState<TestResult | null>(null)
  const [info, setInfo] = useState<HermesInfo | null>(null)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadInfo = (): void => {
    void window.nova.info().then((i) => setInfo(i as HermesInfo))
  }

  useEffect(() => {
    void window.nova.getSettings().then((s) => setSettings(s as NovaSettings))
    loadInfo()
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
    loadInfo()
  }

  const runTest = async (): Promise<void> => {
    setTesting(true)
    await window.nova.setSettings(settings as unknown as Record<string, unknown>)
    setTest((await window.nova.test()) as TestResult)
    onChanged()
    setInfo((await window.nova.info()) as HermesInfo)
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
            {info?.bin && <span className="muted mono">{info.bin}</span>}
          </div>
        </section>

        {/* ── 基本属性 ── */}
        <section className="card">
          <div className="card-head">
            <h3>基本属性</h3>
            <span className={`pill ${connected ? 'ok' : 'warn'}`}>{connected ? `已连接 · ${info?.mode}` : '未连接（模拟模式）'}</span>
          </div>

          <div className="grid2">
            <label className="field">
              <span>Profile（留空用当前默认）</span>
              <input type="text" placeholder="如 devops / product" value={settings.profile} onChange={(e) => update({ profile: e.target.value })} />
            </label>
            <label className="field">
              <span>模型覆盖 -m（留空用 Hermes 默认）</span>
              <select value={settings.model} onChange={(e) => update({ model: e.target.value })}>
                <option value="">（用 Hermes 默认模型）</option>
                <option value="deepseek-v4-pro">deepseek-v4-pro（强推理）</option>
                <option value="deepseek-v4-flash">deepseek-v4-flash（快/省）</option>
              </select>
            </label>
          </div>

          <label className="check">
            <input type="checkbox" checked={settings.yolo} onChange={(e) => update({ yolo: e.target.checked })} />
            <span>自动批准工具调用（<code>--yolo</code>）—— 非交互执行避免卡在审批</span>
          </label>

          <div className="row">
            <button className="btn primary" onClick={save}>保存</button>
            {saved && <span className="pill ok">✓ 已保存</span>}
          </div>

          {info?.profilesText && (
            <>
              <div className="sub-label">可用 Profile（hermes profile list）</div>
              <pre className="term">{info.profilesText}</pre>
            </>
          )}
        </section>

        {/* ── Skill ── */}
        <section className="card">
          <h3>Skill</h3>
          {connected && info?.skillsText ? (
            <pre className="term">{info.skillsText}</pre>
          ) : (
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
          )}
        </section>

        {/* ── MCP ── */}
        <section className="card">
          <h3>MCP Server</h3>
          {connected ? (
            <pre className="term">{info?.mcpText || '（无输出）'}</pre>
          ) : (
            <p className="muted">连接 Hermes 后显示已配置的 MCP Server（hermes mcp list）。</p>
          )}
        </section>

        {/* ── Token 使用量 ── */}
        <section className="card">
          <h3>Token 使用量 · Insights（近 30 天）</h3>
          {connected ? (
            <pre className="term">{info?.insightsText || '（无输出）'}</pre>
          ) : (
            <p className="muted">连接 Hermes 后显示真实 token 用量（hermes insights）。</p>
          )}
        </section>
      </div>
    </main>
  )
}
