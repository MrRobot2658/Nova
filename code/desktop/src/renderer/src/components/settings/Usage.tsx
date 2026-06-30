import { useEffect, useState } from 'react'
import type { HermesInfo, UsageMetric } from '../../types'

const RANGES = [7, 30, 90] as const

export default function Usage(): JSX.Element {
  const [metrics, setMetrics] = useState<UsageMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(true)
  const [days, setDays] = useState<number>(30)

  useEffect(() => {
    void window.nova.info().then((i) => setConnected(!!(i as HermesInfo).connected))
  }, [])

  useEffect(() => {
    setLoading(true)
    void window.nova.usageMetrics(days).then((m) => {
      setMetrics(m as UsageMetric[])
      setLoading(false)
    })
  }, [days])

  if (!connected) return <div className="sub-page"><p className="muted">连接 Hermes 后显示真实 token 用量。</p></div>

  return (
    <div className="sub-page">
      <section className="card">
        <div className="card-head">
          <h3>Token 用量</h3>
          <div className="seg">
            {RANGES.map((d) => (
              <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>
                近 {d} 天
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <p className="muted">加载中…</p>
        ) : metrics.length ? (
          <div className="metrics">
            {metrics.map((m) => (
              <div key={m.label} className="metric">
                <div className="metric-v">{m.value}</div>
                <div className="metric-l">{m.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">暂无用量数据。</p>
        )}
      </section>
    </div>
  )
}
