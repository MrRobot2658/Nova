import { useEffect, useRef, useState } from 'react'

type WebviewEl = HTMLElement & {
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getURL(): string
}

function normalize(input: string): string {
  const t = input.trim()
  if (!t) return ''
  if (/^(https?|file):\/\//i.test(t)) return t
  // 形似域名/路径 → 加 https；否则当作搜索
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return `https://${t}`
  if (t.startsWith('/')) return `file://${t}`
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`
}

export default function Browser({ url }: { url: string }): JSX.Element {
  const ref = useRef<HTMLElement | null>(null)
  const [addr, setAddr] = useState(url)
  const [loading, setLoading] = useState(false)

  useEffect(() => setAddr(url), [url])

  useEffect(() => {
    const wv = ref.current
    if (!wv) return
    const onStart = (): void => setLoading(true)
    const onStop = (): void => {
      setLoading(false)
      setAddr((wv as WebviewEl).getURL())
    }
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    return () => {
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-stop-loading', onStop)
    }
  }, [])

  const wv = (): WebviewEl | null => ref.current as WebviewEl | null
  const go = (raw: string): void => {
    const target = normalize(raw)
    if (target) void wv()?.loadURL(target).catch(() => undefined)
  }

  return (
    <div className="pane browser-pane">
      <div className="browser-bar">
        <button className="nav-ico" onClick={() => wv()?.goBack()} title="后退">‹</button>
        <button className="nav-ico" onClick={() => wv()?.goForward()} title="前进">›</button>
        <button className="nav-ico" onClick={() => (loading ? wv()?.stop() : wv()?.reload())} title="刷新">
          {loading ? '✕' : '⟳'}
        </button>
        <input
          className="addr"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go(addr)
          }}
          placeholder="输入网址或搜索…"
        />
      </div>
      {loading && <div className="browser-progress" />}
      <webview ref={ref} src={url} className="webview" partition="persist:nova" />
    </div>
  )
}
