import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { setWebview } from '../webviewBridge'

type WebviewEl = HTMLElement & {
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  loadURL(url: string): Promise<void>
  getURL(): string
}

/** 纯 Chrome User-Agent：去掉 Electron / 应用名标识，避免被站点（如小红书）按非标准浏览器拦截 */
function chromeUserAgent(): string {
  const ua = navigator.userAgent.replace(/ (Electron|Nova)\/[\d.]+/gi, '').replace(/\s{2,}/g, ' ').trim()
  if (/Chrome\/[\d.]+/.test(ua) && !/Electron/i.test(ua)) return ua
  // 兜底：构造 macOS Chrome UA
  const chrome = (navigator.userAgent.match(/Chrome\/[\d.]+/) || ['Chrome/126.0.0.0'])[0]
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${chrome} Safari/537.36`
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
    if (!el) return
    const wv = el as WebviewEl
    setWebview(wv) // 注册到自动化桥（幂等：StrictMode 重挂载也要重新登记）
    if (ref.current === wv) return // 监听器已挂
    ref.current = wv
    wv.addEventListener('did-start-loading', () => setLoading(true))
    wv.addEventListener('did-stop-loading', () => {
      setLoading(false)
      setAddr(wv.getURL())
    })
    // target=_blank / 弹窗 → 在同一 webview 内打开
    wv.addEventListener('new-window', (e: Event) => {
      const url = (e as unknown as { url?: string }).url
      if (url) void wv.loadURL(url).catch(() => undefined)
    })
  }

  useEffect(() => setAddr(url), [url])

  const wv = (): WebviewEl | null => ref.current
  const go = (raw: string): void => {
    const target = normalize(raw)
    if (target) void wv()?.loadURL(target).catch(() => undefined)
  }

  // plugins/allowpopups/useragent 必须在 <webview> 创建时就存在；用 any 展开绕过 JSX 属性类型限制
  const guestAttrs = { src: url, partition: 'persist:nova', plugins: 'true', allowpopups: 'true', useragent: chromeUserAgent() }

  return (
    <div className="pane browser-pane">
      <div className="browser-bar">
        <button className="nav-ico" onClick={() => wv()?.goBack()} title="后退"><Icon name="chevronLeft" size={18} /></button>
        <button className="nav-ico" onClick={() => wv()?.goForward()} title="前进"><Icon name="chevronRight" size={18} /></button>
        <button className="nav-ico" onClick={() => (loading ? wv()?.stop() : wv()?.reload())} title="刷新 / 停止">
          <Icon name={loading ? 'x' : 'refresh'} size={16} />
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
