import type { HermesStatus } from '../types'

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

export default function Sidebar({ status }: { status: HermesStatus | null }): JSX.Element {
  const label = status ? MODE_LABEL[status.mode] : '连接中…'
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          <span className="logo">N</span> Nova
        </div>
        <button className="new-task">＋ 新建任务</button>
        <div className="side-label">最近</div>
        <ul className="task-list">
          {RECENT.map((t, i) => (
            <li key={i} className="task-item" title={t}>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="side-foot">
        <span className={`status-dot ${status?.ready ? 'ok' : ''}`} />
        <span className="status-text">{label}</span>
      </div>
    </aside>
  )
}
