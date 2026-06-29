import { useEffect, useRef, useState } from 'react'
import type { Msg } from '../types'

interface Props {
  messages: Msg[]
  running: boolean
  workdir: string
  onSend: (text: string) => void
  onPickFolder: () => void
}

// Web Speech API（浏览器/Chromium 内置；Electron 上可能不可用，做优雅降级）
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
}

export default function Conversation({ messages, running, workdir, onSend, onPickFolder }: Props): JSX.Element {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceErr, setVoiceErr] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, running])

  const submit = (): void => {
    const t = text.trim()
    if (!t || running) return
    setText('') // 先清空，保证发送后输入框一定为空
    onSend(t)
  }

  const toggleMic = (): void => {
    setVoiceErr('')
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) {
      setVoiceErr('当前环境不支持语音识别（可改用系统听写：fn fn）')
      return
    }
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new SR()
    rec.lang = 'zh-CN'
    rec.interimResults = true
    rec.continuous = false
    const base = text
    rec.onresult = (e): void => {
      let s = ''
      for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript
      setText(base ? `${base} ${s}` : s)
    }
    rec.onerror = (e): void => {
      setListening(false)
      setVoiceErr(`语音识别失败：${e.error ?? '未知错误'}`)
    }
    rec.onend = (): void => setListening(false)
    recRef.current = rec
    setListening(true)
    try {
      rec.start()
    } catch {
      setListening(false)
    }
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

      <div className="composer-wrap">
        <div className="composer-bar">
          <button className="chip-btn" onClick={onPickFolder} title="选择工作目录">
            📁 {workdir ? workdir.replace(/^.*\//, '') || workdir : '默认目录'}
          </button>
          {voiceErr && <span className="voice-err">{voiceErr}</span>}
        </div>
        <div className="composer">
          <button
            className={`mic-btn ${listening ? 'on' : ''}`}
            onClick={toggleMic}
            title={listening ? '停止语音输入' : '语音输入'}
          >
            {listening ? '● 录音中' : '🎤'}
          </button>
          <textarea
            value={text}
            placeholder="例如：把这周飞书文档汇总成 Excel 发给老板（Enter 发送，Shift+Enter 换行）"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
          />
          <button disabled={running || !text.trim()} onClick={submit}>
            发送
          </button>
        </div>
      </div>
    </main>
  )
}
