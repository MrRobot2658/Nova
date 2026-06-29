import type { HermesStatus, View } from '../types'

const MODE_LABEL: Record<HermesStatus['mode'], string> = {
  system: '本机 Hermes（已复用）',
  bundled: '内置 Hermes',
  simulated: '模拟模式 · 开发'
}

const RECENT = [
  '把这周飞书文档汇总成 Excel 发给老板',
  '每天 9 点抓竞品官网更新，发飞书通知',
  '读未读邮件，把合同 PDF 关键条款汇总成表格'
]

interface Props {
  status: HermesStatus | null
  view: View
  onNavigate: (v: View) => void
}

export default function Sidebar({ status, view, onNavigate }: Props): JSX.Element {
  const label = status ? MODE_LABEL[status.mode] : '连接中…'
  const dotClass = status?.ready ? (status.mode === 'simulated' ? 'warn' : 'ok') : ''

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <span className="logo">N</span> Nova
        </div>
        <button className="new-task" onClick={() => onNavigate('chat')}>＋ 新建任务</button>
        <div className="side-label">最近</div>
        <ul className="task-list">
          {RECENT.map((t, i) => (
            <li key={i} className="task-item" title={t} onClick={() => onNavigate('chat')}>
              {t}
            </li>
          ))}
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
        <button
          className={`nav-btn foot ${view === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          ⚙️ 设置
        </button>
      </div>
    </aside>
  )
}
