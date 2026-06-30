import { Fragment, useState } from 'react'
import type { HermesStatus, SessionItem, View } from '../types'
import { Icon } from './Icon'
import logo from '../assets/logo.png'

const MODE_LABEL: Record<HermesStatus['mode'], string> = {
  system: '本机 Hermes（已复用）',
  bundled: '内置 Hermes',
  simulated: '模拟模式 · 开发'
}

const GROUP_ORDER = ['今天', '昨天', '本周', '更早'] as const

/** 从会话 id（YYYYMMDD_...）推断分组 */
function groupOf(id: string): string {
  const m = id.match(/(\d{4})(\d{2})(\d{2})/)
  if (!m) return '更早'
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff <= 7) return '本周'
  return '更早'
}

interface Props {
  status: HermesStatus | null
  view: View
  sessions: SessionItem[]
  currentSession: string | null
  theme: 'light' | 'dark'
  onNavigate: (v: View) => void
  onNewSession: () => void
  onSelectSession: (id: string) => void
  onToggleTheme: () => void
  onRenameSession: (id: string, title: string) => void
  onDeleteSession: (id: string) => void
}

export default function Sidebar({ status, view, sessions, currentSession, theme, onNavigate, onNewSession, onSelectSession, onToggleTheme, onRenameSession, onDeleteSession }: Props): JSX.Element {
  const label = status ? MODE_LABEL[status.mode] : '连接中…'
  const dotClass = status?.ready ? (status.mode === 'simulated' ? 'warn' : 'ok') : ''
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startRename = (id: string, name: string): void => {
    setEditingId(id)
    setEditValue(name)
  }
  const commitRename = (): void => {
    if (editingId && editValue.trim()) onRenameSession(editingId, editValue.trim())
    setEditingId(null)
  }

  const grouped = GROUP_ORDER.map((g) => ({ g, items: sessions.filter((s) => groupOf(s.id) === g) })).filter((x) => x.items.length)

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <img className="logo" src={logo} alt="Nova" /> Nova
        </div>
        <button className="new-task" onClick={onNewSession}>
          <Icon name="plus" size={16} /> 新会话
        </button>

        <ul className="task-list">
          {sessions.length === 0 ? (
            <li className="task-empty">暂无会话{status?.mode === 'simulated' ? '（连接 Hermes 后显示）' : ''}</li>
          ) : (
            grouped.map(({ g, items }) => (
              <Fragment key={g}>
                <li className="session-group">{g}</li>
                {items.map((s) => {
                  const name = s.title || s.preview || s.id
                  if (editingId === s.id) {
                    return (
                      <li key={s.id} className="session-item editing">
                        <input
                          className="session-edit"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onBlur={commitRename}
                        />
                      </li>
                    )
                  }
                  return (
                    <li
                      key={s.id}
                      className={`session-item ${currentSession === s.id ? 'active' : ''}`}
                      title={name}
                      onClick={() => onSelectSession(s.id)}
                    >
                      <span className="session-name">{name}</span>
                      {s.lastActive && <span className="session-time">{s.lastActive}</span>}
                      <span className="session-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="sa-btn" title="重命名" onClick={() => startRename(s.id, name)}>
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          className="sa-btn"
                          title="删除"
                          onClick={() => {
                            if (window.confirm('删除该会话？')) onDeleteSession(s.id)
                          }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </span>
                    </li>
                  )
                })}
              </Fragment>
            ))
          )}
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
        <button className="nav-btn foot" onClick={onToggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          {theme === 'dark' ? '亮色模式' : '暗色模式'}
        </button>
        <button className={`nav-btn foot ${view === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
          <Icon name="settings" size={16} /> 设置
        </button>
      </div>
    </aside>
  )
}
