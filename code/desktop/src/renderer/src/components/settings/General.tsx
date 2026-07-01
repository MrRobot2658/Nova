import { useEffect, useState } from 'react'
import type { NovaSettings, ProfileRow } from '../../types'

const EMPTY: NovaSettings = { hermesPath: '', profile: '', model: '', yolo: true, workdir: '', useAcp: false }

export default function General({ onChanged }: { onChanged: () => void }): JSX.Element {
  const [s, setS] = useState<NovaSettings>(EMPTY)
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void window.nova.getSettings().then((v) => setS(v as NovaSettings))
    void window.nova.listProfiles().then((p) => setProfiles(p as ProfileRow[]))
  }, [])

  const up = (patch: Partial<NovaSettings>): void => {
    setS((x) => ({ ...x, ...patch }))
    setSaved(false)
  }

  const save = async (): Promise<void> => {
    const v = (await window.nova.setSettings(s as unknown as Record<string, unknown>)) as NovaSettings
    setS(v)
    setSaved(true)
    onChanged()
  }

  return (
    <div className="sub-page">
      <section className="card">
        <h3>Profile 与模型</h3>
        <div className="grid2">
          <label className="field">
            <span>Profile（留空用当前默认）</span>
            {profiles.length ? (
              <select value={s.profile} onChange={(e) => up({ profile: e.target.value })}>
                <option value="">（当前默认）</option>
                {profiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                    {p.isDefault ? ' ◆' : ''}
                    {p.model ? ` · ${p.model}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" value={s.profile} placeholder="如 devops / product" onChange={(e) => up({ profile: e.target.value })} />
            )}
          </label>
          <label className="field">
            <span>模型覆盖 -m（留空用默认）</span>
            <select value={s.model} onChange={(e) => up({ model: e.target.value })}>
              <option value="">（用 Hermes 默认）</option>
              <option value="deepseek-v4-pro">deepseek-v4-pro（强推理）</option>
              <option value="deepseek-v4-flash">deepseek-v4-flash（快/省）</option>
            </select>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={s.yolo} onChange={(e) => up({ yolo: e.target.checked })} />
          <span>自动批准工具调用（<code>--yolo</code>）—— 非交互执行避免卡在审批</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.useAcp} onChange={(e) => up({ useAcp: e.target.checked })} />
          <span>ACP 模式（实验）—— 走 <code>hermes acp</code>，右侧显示结构化工具调用时间线；会话不整合侧栏列表</span>
        </label>
      </section>

      <section className="card">
        <h3>工作目录</h3>
        <label className="field">
          <span>Agent 执行的 cwd（留空用主目录）</span>
          <div className="row">
            <input type="text" value={s.workdir} placeholder="默认：用户主目录" onChange={(e) => up({ workdir: e.target.value })} />
            <button
              className="btn"
              onClick={async () => {
                const d = await window.nova.selectFolder()
                if (d) up({ workdir: d })
              }}
            >
              选择文件夹
            </button>
          </div>
        </label>
      </section>

      <div className="row">
        <button className="btn primary" onClick={save}>保存</button>
        {saved && <span className="pill ok">✓ 已保存</span>}
      </div>
    </div>
  )
}
