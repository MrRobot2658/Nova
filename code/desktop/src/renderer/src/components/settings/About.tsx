import { useEffect, useState } from 'react'
import { Icon } from '../Icon'

type Status = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'

export default function About(): JSX.Element {
  const [version, setVersion] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [latest, setLatest] = useState('')
  const [percent, setPercent] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void window.nova.getVersion().then(setVersion)
    const off = window.nova.onUpdateEvent((evt) => {
      const p = (evt.payload ?? {}) as { version?: string; percent?: number; message?: string }
      switch (evt.type) {
        case 'checking': setStatus('checking'); setMessage(''); break
        case 'available': setStatus('available'); setLatest(p.version ?? ''); break
        case 'not-available': setStatus('not-available'); break
        case 'progress': setStatus('downloading'); setPercent(p.percent ?? 0); break
        case 'downloaded': setStatus('downloaded'); setLatest(p.version ?? latest); break
        case 'error': setStatus('error'); setMessage(p.message ?? '更新出错'); break
      }
    })
    return off
  }, [])

  const check = async (): Promise<void> => {
    setStatus('checking')
    const r = (await window.nova.checkUpdate()) as { ok: boolean; message?: string }
    if (!r.ok) {
      setStatus('error')
      setMessage(r.message ?? '检查失败')
    }
  }

  return (
    <div className="sub-page">
      <section className="card">
        <div className="card-head">
          <h3>关于 Nova</h3>
          <span className="pill">当前版本 v{version || '—'}</span>
        </div>

        <div className="row" style={{ marginTop: 4 }}>
          <button className="btn primary" disabled={status === 'checking' || status === 'downloading'} onClick={check}>
            {status === 'checking' ? '检查中…' : '检查更新'}
          </button>

          {status === 'not-available' && <span className="pill ok">已是最新版本</span>}
          {status === 'available' && (
            <>
              <span className="pill warn">发现新版本 v{latest}</span>
              <button className="btn" onClick={() => window.nova.downloadUpdate()}>
                <Icon name="download" size={15} /> 下载更新
              </button>
            </>
          )}
          {status === 'downloading' && <span className="pill">下载中 {percent}%</span>}
          {status === 'downloaded' && (
            <>
              <span className="pill ok">v{latest} 已就绪</span>
              <button className="btn primary" onClick={() => window.nova.installUpdate()}>立即重启更新</button>
            </>
          )}
          {status === 'error' && <span className="note warn" style={{ marginTop: 0 }}>{message}</span>}
        </div>

        <p className="muted" style={{ marginTop: 14 }}>
          更新通过 GitHub Releases 分发。提示：macOS 自动安装更新需应用已签名（见 DISTRIBUTION.md）；未签名版可下载到新包后手动替换。
        </p>
      </section>
    </div>
  )
}
