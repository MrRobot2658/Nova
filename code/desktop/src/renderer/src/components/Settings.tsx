import { useState } from 'react'
import Connection from './settings/Connection'
import General from './settings/General'
import Skills from './settings/Skills'
import Mcp from './settings/Mcp'
import Usage from './settings/Usage'
import { Icon } from './Icon'

const TABS = [
  { key: 'connection', label: '连接', icon: 'plug' },
  { key: 'general', label: '通用', icon: 'settings' },
  { key: 'skills', label: 'Skill', icon: 'puzzle' },
  { key: 'mcp', label: 'MCP', icon: 'link' },
  { key: 'usage', label: '用量', icon: 'chart' }
] as const

type TabKey = (typeof TABS)[number]['key']

export default function Settings({ onChanged }: { onChanged: () => void }): JSX.Element {
  const [tab, setTab] = useState<TabKey>('connection')

  return (
    <main className="settings">
      <header className="titlebar drag">设置</header>
      <nav className="settings-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={15} className="tab-ico" />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="settings-body">
        {tab === 'connection' && <Connection onChanged={onChanged} />}
        {tab === 'general' && <General onChanged={onChanged} />}
        {tab === 'skills' && <Skills />}
        {tab === 'mcp' && <Mcp />}
        {tab === 'usage' && <Usage />}
      </div>
    </main>
  )
}
