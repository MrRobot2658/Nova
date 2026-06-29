import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Conversation from './components/Conversation'
import ExecutionPanel from './components/ExecutionPanel'
import Settings from './components/Settings'
import type { HermesStatus, Msg, NovaEvent, Step, View } from './types'

export default function App(): JSX.Element {
  const [view, setView] = useState<View>('chat')
  const [messages, setMessages] = useState<Msg[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<HermesStatus | null>(null)
  const [workdir, setWorkdir] = useState('')

  const refreshStatus = (): void => {
    void window.nova.status().then((s) => setStatus(s as HermesStatus))
  }

  const refreshWorkdir = (): void => {
    void window.nova.getSettings().then((s) => setWorkdir((s as { workdir?: string }).workdir ?? ''))
  }

  const pickFolder = async (): Promise<void> => {
    const dir = await window.nova.selectFolder()
    if (dir) {
      await window.nova.setSettings({ workdir: dir })
      setWorkdir(dir)
    }
  }

  useEffect(() => {
    refreshStatus()
    refreshWorkdir()

    const off = window.nova.onEvent((raw) => {
      const evt = raw as NovaEvent
      switch (evt.type) {
        case 'intent':
          setMessages((m) => [...m, { role: 'agent', text: evt.intent }])
          break
        case 'step-start':
          setSteps((s) => [...s, { id: evt.id, skill: evt.skill, desc: evt.desc, status: 'running' }])
          break
        case 'step-done':
          setSteps((s) => s.map((x) => (x.id === evt.id ? { ...x, status: evt.ok ? 'done' : 'fail' } : x)))
          break
        case 'output':
          // 流式输出：按 runId 追加到同一条 agent 气泡
          setMessages((m) => {
            const i = m.findIndex((x) => x.id === evt.runId)
            if (i >= 0) {
              const cp = [...m]
              cp[i] = { ...cp[i], text: cp[i].text + evt.chunk }
              return cp
            }
            return [...m, { role: 'agent', text: evt.chunk, id: evt.runId }]
          })
          break
        case 'result':
          setMessages((m) => [...m, { role: 'agent', text: evt.text }])
          break
        case 'error':
          setMessages((m) => [...m, { role: 'agent', text: `⚠️ ${evt.message}`, error: true }])
          break
        case 'done':
          setRunning(false)
          break
      }
    })
    return off
  }, [])

  const send = async (text: string): Promise<void> => {
    if (!text.trim() || running) return
    setMessages((m) => [...m, { role: 'user', text }])
    setSteps([])
    setRunning(true)
    await window.nova.run(text)
  }

  return (
    <div className="app">
      <Sidebar status={status} view={view} onNavigate={setView} />
      {view === 'chat' ? (
        <>
          <Conversation messages={messages} running={running} workdir={workdir} onSend={send} onPickFolder={pickFolder} />
          <ExecutionPanel steps={steps} running={running} />
        </>
      ) : (
        <Settings onChanged={() => { refreshStatus(); refreshWorkdir() }} />
      )}
    </div>
  )
}
