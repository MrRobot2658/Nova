import { useEffect, useRef, useState } from 'react'

type WebviewEl = HTMLElement & {
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getURL(): string
}

/** 把地址栏输入归一化成可加载的 URL（支持本地文件路径与中文） */
function normalize(input: string): string {
  const t = input.trim()
  if (!t) return ''
  if (/^(https?|file):\/\//i.test(t)) return t
  if (t.startsWith('/')) return `file://${encodeURI(t)}`
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return `https://${t}`
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`
}

export default function Browser({ url }: { url: string }): JSX.Element {
  const ref = useRef<WebviewEl | null>(null)
  const [addr, setAddr] = useState(url)
  const [loading, setLoading] = useState(false)

  // 仅挂事件监听；plugins/src 通过属性在元素创建时设置（早于 guest 创建，PDF 才能渲染）
  const attach = (el: HTMLElement | null): void => {
    if (!el || ref.current === el) return
    const wv = el as WebviewEl
    ref.current = wv
    el.addEventListener('did-start-loading', () => setLoading(true))
    el.addEventListener('did-stop-loading', () => {
      setLoading(false)
      setAddr(wv.getURL())
    })
  }

  useEffect(() => setAddr(url), [url])

  const wv = (): WebviewEl | null => ref.current
  const go = (raw: string): void => {
    const target = normalize(raw)
    if (target) void wv()?.loadURL(target).catch(() => undefined)
  }

  // plugins/allowpopups 必须在 <webview> 创建时就存在；用 any 展开绕过 JSX 属性类型限制
  const guestAttrs = { src: url, partition: 'persist:nova', plugins: 'true', allowpopups: 'true' }

  return (
    <div className="pane browser-pane">
      <div className="browser-bar">
        <button className="nav-ico" onClick={() => wv()?.goBack()} title="后退">‹</button>
        <button className="nav-ico" onClick={() => wv()?.goForward()} title="前进">›</button>
        <button className="nav-ico" onClick={() => (loading ? wv()?.stop() : wv()?.reload())} title="刷新 / 停止">
          {loading ? '✕' : '⟳'}
        </button>
        <input
          className="addr"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go(addr)
          }}
          placeholder="输入网址或本地文件路径…"
        />
      </div>
      {loading && <div className="browser-progress" />}
      <webview ref={attach} className="webview" {...(guestAttrs as any)} />
    </div>
  )
}
