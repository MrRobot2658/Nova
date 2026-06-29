import { useEffect, useRef, useState } from 'react'
import type { Msg } from '../types'

interface Props {
  messages: Msg[]
  running: boolean
  workdir: string
  onSend: (text: string) => void
  onPickFolder: () => void
  onCancel: () => void
}

const EXAMPLES = [
  '把这周飞书文档汇总成 Excel 发给老板',
  '搜索今天 AI 领域的重要新闻并总结成要点',
  '读取未读邮件，提取合同 PDF 的关键条款'
]

// Web Speech API（Chromium 内置；Electron 上可能不可用，做优雅降级）
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

function TypingDots(): JSX.Element {
  return (
    <span className="dots">
      <i />
      <i />
      <i />
    </span>
  )
}

export default function Conversation({ messages, running, workdir, onSend, onPickFolder, onCancel }: Props): JSX.Element {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceErr, setVoiceErr] = useState('')
  const [copied, setCopied] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, running])

  // 输入框随内容自适应高度（1 行 → 最多 168px）
  useEffect(() => {
    const el = taRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 168)}px`
    }
  }, [text])

  const submit = (): void => {
    const t = text.trim()
    if (!t || running) return
    setText('')
    onSend(t)
  }

  const copy = (text: string, i: number): void => {
    void navigator.clipboard.writeText(text)
    setCopied(i)
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1200)
  }

  const toggleMic = (): void => {
    setVoiceErr('')
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) {
      setVoiceErr('当前环境不支持语音识别（可改用系统听写：连按两下 fn）')
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

  const dirName = workdir ? workdir.replace(/\/+$/, '').split('/').pop() || workdir : '默认目录'

  return (
    <main className="conversation">
      <header className="titlebar drag">对话</header>

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty">
            <div className="empty-logo">N</div>
            <h2>你想让 Nova 帮你做什么？</h2>
            <p>用一句话描述目标，Nova 会自动拆解成多步流程并执行。</p>
            <div className="examples">
              {EXAMPLES.map((e) => (
                <button key={e} className="example" onClick={() => onSend(e)} disabled={running}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role}`}>
            {m.role === 'agent' && <span className="msg-avatar">N</span>}
            <div className={`bubble ${m.role}${m.error ? ' error' : ''}`}>
              {m.text}
              {m.role === 'agent' && !m.error && m.text && (
                <button className="copy-btn" title="复制" onClick={() => copy(m.text, i)}>
                  {copied === i ? '已复制' : '复制'}
                </button>
              )}
            </div>
          </div>
        ))}

        {running && (
          <div className="msg-row agent">
            <span className="msg-avatar">N</span>
            <div className="bubble agent typing"><TypingDots /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="composer-wrap">
        <div className="composer-bar">
          <button className="chip-btn" onClick={onPickFolder} title={workdir || '选择工作目录'}>
            📁 {dirName}
          </button>
          {voiceErr && <span className="voice-err">{voiceErr}</span>}
        </div>
        <div className="composer-box">
          <button className={`mic-btn ${listening ? 'on' : ''}`} onClick={toggleMic} title={listening ? '停止语音输入' : '语音输入'}>
            {listening ? '●' : '🎤'}
          </button>
          <textarea
            ref={taRef}
            value={text}
            placeholder="给 Nova 下达任务…（Enter 发送，Shift+Enter 换行）"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
          />
          {running ? (
            <button className="send-btn stop" onClick={onCancel} title="停止">
              ■
            </button>
          ) : (
            <button className="send-btn" disabled={!text.trim()} onClick={submit} title="发送">
              ↑
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
