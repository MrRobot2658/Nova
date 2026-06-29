import { useEffect, useState } from 'react'
import type { HermesInfo, NovaSettings, TestResult } from '../../types'

export default function Connection({ onChanged }: { onChanged: () => void }): JSX.Element {
  const [path, setPath] = useState('')
  const [test, setTest] = useState<TestResult | null>(null)
  const [info, setInfo] = useState<HermesInfo | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    void window.nova.getSettings().then((s) => setPath((s as NovaSettings).hermesPath))
    void window.nova.info().then((i) => setInfo(i as HermesInfo))
  }, [])

  const runTest = async (): Promise<void> => {
    setTesting(true)
    await window.nova.setSettings({ hermesPath: path })
    setTest((await window.nova.test()) as TestResult)
    setInfo((await window.nova.info()) as HermesInfo)
    onChanged()
    setTesting(false)
  }

  return (
    <div className="sub-page">
      <section className="card">
        <div className="card-head">
          <h3>Hermes 连接</h3>
          <span className={`pill ${info?.connected ? 'ok' : 'warn'}`}>
            {info?.connected ? `已连接 · ${info.mode}` : '未连接（模拟模式）'}
          </span>
        </div>
        <label className="field">
          <span>Hermes 可执行路径</span>
          <input
            type="text"
            value={path}
            placeholder="留空自动检测（PATH / ~/.hermes / 内置）"
            onChange={(e) => setPath(e.target.value)}
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
        {info?.bin && <p className="muted mono" style={{ marginTop: 10 }}>{info.bin}</p>}
      </section>
    </div>
  )
}
