import { useEffect, useRef, useState } from 'react'
import type { Msg } from '../types'

interface Props {
  messages: Msg[]
  running: boolean
  onSend: (text: string) => void
}

export default function Conversation({ messages, running, onSend }: Props): JSX.Element {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, running])

  const submit = (): void => {
    if (!text.trim() || running) return
    onSend(text)
    setText('')
  }

  return (
    <main className="conversation">
      <header className="titlebar drag">对话</header>

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty">
            <h2>你想让 Nova 帮你做什么？</h2>
            <p>用一句话描述目标，Nova 会自动拆解成多步流程并执行。</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}${m.error ? ' error' : ''}`}>
            {m.text}
          </div>
        ))}
        {running && <div className="bubble agent typing">执行中…</div>}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <textarea
          value={text}
          placeholder="例如：把这周飞书文档汇总成 Excel 发给老板"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button disabled={running || !text.trim()} onClick={submit}>
          发送
        </button>
      </div>
    </main>
  )
}
