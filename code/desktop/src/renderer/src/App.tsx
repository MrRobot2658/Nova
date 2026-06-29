import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import Sidebar from './components/Sidebar'
import Conversation from './components/Conversation'
import ExecutionPanel from './components/ExecutionPanel'
import Browser from './components/Browser'
import Settings from './components/Settings'
import type { HermesStatus, Msg, NovaEvent, SessionItem, Step, View } from './types'
import { execBrowser, setNavHook, type BrowserCommand } from './webviewBridge'

type RightTab = 'exec' | 'browser'

// 常见站点名 → 网址：在内置真实浏览器里打开（你的 IP、登录态），避免 headless 被拦
const SITE_MAP: Record<string, string> = {
  小红书: 'https://www.xiaohongshu.com',
  微博: 'https://weibo.com',
  知乎: 'https://www.zhihu.com',
  抖音: 'https://www.douyin.com',
  b站: 'https://www.bilibili.com',
  哔哩哔哩: 'https://www.bilibili.com',
  bilibili: 'https://www.bilibili.com',
  淘宝: 'https://www.taobao.com',
  京东: 'https://www.jd.com',
  百度: 'https://www.baidu.com',
  豆瓣: 'https://www.douban.com',
  大众点评: 'https://www.dianping.com',
  企查查: 'https://www.qcc.com',
  天眼查: 'https://www.tianyancha.com',
  github: 'https://github.com',
  google: 'https://www.google.com'
}

/** 识别「打开/预览 X」这类命令，返回目标（url / 绝对路径 / 关键词） */
function parseOpenCommand(text: string): { kind: 'url' | 'path' | 'keyword'; value: string } | null {
  const m = text.trim().match(/^(?:(?:在)?(?:内置)?浏览器(?:里|中)?\s*)?(?:打开|预览|查看|访问|open)\s+(.+)$/i)
  if (!m) return null
  const v = m[1].trim().replace(/^["'`「【]+|["'`」】]+$/g, '').trim()
  if (!v) return null
  if (/^(https?|file):\/\//i.test(v)) return { kind: 'url', value: v }
  if (v.startsWith('/')) return { kind: 'path', value: v }
  const site = SITE_MAP[v.toLowerCase()] ?? SITE_MAP[v]
  if (site) return { kind: 'url', value: site } // 已知站点名 → 内置浏览器打开
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return { kind: 'url', value: `https://${v}` } // 裸域名
  return { kind: 'keyword', value: v }
}

/** 从文本里识别可在右侧打开的网址 / 本地可预览文件（支持中文路径） */
function detectUrl(text: string): string | null {
  const web = text.match(/(https?:\/\/[^\s<>"')\]]+)/i)
  if (web) return web[1].replace(/[.,;]+$/, '')
  const fileUrl = text.match(/file:\/\/[^\s<>"')\]]+/i)
  if (fileUrl) return fileUrl[0]
  // 绝对路径（允许中文、连字符等非空白字符）指向可预览文件
  const path = text.match(/(\/[^\s"'<>`]*\.(?:pdf|png|jpe?g|gif|svg|html?))/i)
  if (path) return `file://${encodeURI(path[1])}`
  return null
}

export default function App(): JSX.Element {
  const [view, setView] = useState<View>('chat')
  const [messages, setMessages] = useState<Msg[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<HermesStatus | null>(null)
  const [workdir, setWorkdir] = useState('')
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>('exec')
  const [browserUrl, setBrowserUrl] = useState('about:blank')
  const [rightWidth, setRightWidth] = useState(420)
  const [dragging, setDragging] = useState(false)
  const sessionRef = useRef<string | null>(null)
  const runBufferRef = useRef('')
  const autoOpenedRef = useRef(false)

  const refreshStatus = (): void => void window.nova.status().then((s) => setStatus(s as HermesStatus))
  const refreshWorkdir = (): void => void window.nova.getSettings().then((s) => setWorkdir((s as { workdir?: string }).workdir ?? ''))
  const refreshSessions = (): void => void window.nova.listSessions().then((s) => setSessions(s as SessionItem[]))

  const openUrl = (u: string): void => {
    setBrowserUrl(u)
    setRightTab('browser')
  }

  // 拖拽分隔条调整中间/右侧宽度
  const startDrag = (e: ReactMouseEvent): void => {
    e.preventDefault()
    setDragging(true)
    const onMove = (ev: MouseEvent): void => {
      const w = Math.min(820, Math.max(300, window.innerWidth - ev.clientX))
      setRightWidth(w)
    }
    const onUp = (): void => {
      setDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const cancel = (): void => {
    void window.nova.cancel()
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
    refreshSessions()
    setNavHook(() => setRightTab('browser'))

    // 浏览器自动化桥：执行主进程下发的指令并回传结果
    const offCmd = window.nova.onBrowserCommand((cmd) => {
      void execBrowser(cmd as BrowserCommand).then((result) => window.nova.browserResult(cmd.id, result))
    })

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
          setMessages((m) => {
            const i = m.findIndex((x) => x.id === evt.runId)
            if (i >= 0) {
              const cp = [...m]
              cp[i] = { ...cp[i], text: cp[i].text + evt.chunk }
              return cp
            }
            return [...m, { role: 'agent', text: evt.chunk, id: evt.runId }]
          })
          runBufferRef.current += evt.chunk
          if (!autoOpenedRef.current) {
            const u = detectUrl(runBufferRef.current)
            if (u) {
              autoOpenedRef.current = true
              openUrl(u)
            }
          }
          break
        case 'session':
          if (!sessionRef.current) {
            sessionRef.current = evt.sessionId
            setCurrentSession(evt.sessionId)
          }
          break
        case 'result':
          setMessages((m) => [...m, { role: 'agent', text: evt.text }])
          break
        case 'error':
          setMessages((m) => [...m, { role: 'agent', text: `⚠️ ${evt.message}`, error: true }])
          break
        case 'done':
          setRunning(false)
          refreshSessions()
          break
      }
    })
    return () => {
      off()
      offCmd()
    }
  }, [])

  const send = async (text: string): Promise<void> => {
    if (!text.trim() || running) return

    // 1) 显式「打开/预览 X」命令 → 内置浏览器
    const op = parseOpenCommand(text)
    if (op) {
      let target: string | null = null
      if (op.kind === 'url') target = op.value
      else if (op.kind === 'path') target = `file://${encodeURI(op.value)}`
      else target = await window.nova.resolveFile(op.value) // 关键词 → 查找本地文件
      if (target) {
        openUrl(target)
        return // 直接在右侧打开，不跑 Agent
      }
      if (op.kind === 'keyword') {
        // 没找到本地文件：提示并交给 Agent 继续尝试
        setMessages((m) => [...m, { role: 'agent', text: `没在常用目录找到「${op.value}」，交给 Hermes 处理…` }])
      }
    }

    // 2) 文本里含 url/路径 → 顺带在右侧打开
    const url = detectUrl(text)
    if (url) openUrl(url)
    if (url && text.trim() === url) return

    setMessages((m) => [...m, { role: 'user', text }])
    setSteps([])
    runBufferRef.current = ''
    autoOpenedRef.current = !!url
    setRunning(true)
    await window.nova.run(text, sessionRef.current ?? undefined)
  }

  const newSession = (): void => {
    sessionRef.current = null
    setCurrentSession(null)
    setMessages([])
    setSteps([])
    setRunning(false)
    setRightTab('exec')
    setView('chat')
  }

  const selectSession = async (id: string): Promise<void> => {
    sessionRef.current = id
    setCurrentSession(id)
    setSteps([])
    setView('chat')
    setMessages([{ role: 'agent', text: '正在载入会话历史…' }])
    const history = (await window.nova.loadSession(id)) as Msg[]
    setMessages(history.length ? history : [{ role: 'agent', text: '（该会话暂无可显示的文本消息）' }])
  }

  return (
    <div className="app" style={{ gridTemplateColumns: `260px minmax(0, 1fr) ${rightWidth}px` }}>
      <Sidebar
        status={status}
        view={view}
        sessions={sessions}
        currentSession={currentSession}
        onNavigate={setView}
        onNewSession={newSession}
        onSelectSession={selectSession}
      />
      {view === 'chat' ? (
        <>
          <Conversation messages={messages} running={running} workdir={workdir} onSend={send} onPickFolder={pickFolder} onCancel={cancel} />
          <div className="right-col">
            <div className="splitter" onMouseDown={startDrag} title="拖拽调整宽度" />
            <div className="right-tabs drag">
              <button className={`rtab ${rightTab === 'exec' ? 'active' : ''}`} onClick={() => setRightTab('exec')}>
                ⚡ 执行{running && <span className="rdot" />}
              </button>
              <button className={`rtab ${rightTab === 'browser' ? 'active' : ''}`} onClick={() => setRightTab('browser')}>
                🌐 浏览器
              </button>
            </div>
            <div className="right-content">
              <div className={`pane-host ${rightTab === 'exec' ? 'shown' : 'hidden'}`}>
                <ExecutionPanel steps={steps} running={running} />
              </div>
              {/* 浏览器面板始终保持在布局中（用 visibility 切换），否则 display:none 会让 webview 不附加、dom-ready 不触发 */}
              <div className={`pane-host ${rightTab === 'browser' ? 'shown' : 'hidden'}`}>
                <Browser url={browserUrl} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <Settings
          onChanged={() => {
            refreshStatus()
            refreshWorkdir()
            refreshSessions()
          }}
        />
      )}
      {dragging && <div className="drag-overlay" />}
    </div>
  )
}
