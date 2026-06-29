import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Conversation from './components/Conversation'
import ExecutionPanel from './components/ExecutionPanel'
import type { HermesStatus, Msg, NovaEvent, Step } from './types'

export default function App(): JSX.Element {
  const [messages, setMessages] = useState<Msg[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<HermesStatus | null>(null)

  useEffect(() => {
    void window.nova.status().then((s) => setStatus(s as HermesStatus))

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
        case 'result':
          setMessages((m) => [...m, { role: 'agent', text: evt.text }])
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
      <Sidebar status={status} />
      <Conversation messages={messages} running={running} onSend={send} />
      <ExecutionPanel steps={steps} running={running} />
    </div>
  )
}
