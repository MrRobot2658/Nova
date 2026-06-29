import type { HermesStatus, SessionItem, View } from '../types'

const MODE_LABEL: Record<HermesStatus['mode'], string> = {
  system: '本机 Hermes（已复用）',
  bundled: '内置 Hermes',
  simulated: '模拟模式 · 开发'
}

interface Props {
  status: HermesStatus | null
  view: View
  sessions: SessionItem[]
  currentSession: string | null
  onNavigate: (v: View) => void
  onNewSession: () => void
  onSelectSession: (id: string) => void
}

export default function Sidebar({ status, view, sessions, currentSession, onNavigate, onNewSession, onSelectSession }: Props): JSX.Element {
  const label = status ? MODE_LABEL[status.mode] : '连接中…'
  const dotClass = status?.ready ? (status.mode === 'simulated' ? 'warn' : 'ok') : ''

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <span className="logo">N</span> Nova
        </div>
        <button className="new-task" onClick={onNewSession}>＋ 新会话</button>

        <div className="side-label">会话</div>
        <ul className="task-list">
          {sessions.length === 0 && <li className="task-empty">暂无会话{status?.mode === 'simulated' ? '（连接 Hermes 后显示）' : ''}</li>}
          {sessions.map((s) => {
            const name = s.title || s.preview || s.id
            return (
              <li
                key={s.id}
                className={`session-item ${currentSession === s.id ? 'active' : ''}`}
                title={name}
                onClick={() => onSelectSession(s.id)}
              >
                <span className="session-name">{name}</span>
                {s.lastActive && <span className="session-time">{s.lastActive}</span>}
              </li>
            )
          })}
        </ul>
      </div>

      {/* 左下角：账户名 + 设置 */}
      <div className="sidebar-foot">
        <div className="account">
          <span className="avatar">本</span>
          <div className="account-meta">
            <span className="account-name">本地用户</span>
            <span className="account-sub">
              <span className={`status-dot ${dotClass}`} /> {label}
            </span>
          </div>
        </div>
        <button className={`nav-btn foot ${view === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
          ⚙️ 设置
        </button>
      </div>
    </aside>
  )
}
