// 渲染层：把主进程下发的指令在右侧 <webview> 上执行

type WebviewEl = HTMLElement & {
  loadURL(url: string): Promise<void>
  getURL(): string
  getTitle(): string
  executeJavaScript(code: string, userGesture?: boolean): Promise<unknown>
  capturePage(): Promise<{ toDataURL(): string }>
}

let el: WebviewEl | null = null
let ready = false
let navHook: ((url: string) => void) | null = null

export function setWebview(w: HTMLElement | null): void {
  el = w as WebviewEl | null
  ready = false
  if (el) {
    const mark = (): void => {
      ready = true
    }
    el.addEventListener('dom-ready', mark)
    el.addEventListener('did-stop-loading', mark)
  }
}

/** 等待 webview 的 guest 就绪（dom-ready），避免命令早于附加 */
function whenReady(w: WebviewEl, ms = 8000): Promise<void> {
  return new Promise((resolve) => {
    if (ready) return resolve()
    const done = (): void => {
      ready = true
      w.removeEventListener('dom-ready', done)
      resolve()
    }
    w.addEventListener('dom-ready', done)
    setTimeout(() => {
      w.removeEventListener('dom-ready', done)
      resolve()
    }, ms)
  })
}

/** 导航发生时通知 App（切到浏览器 tab 等） */
export function setNavHook(fn: (url: string) => void): void {
  navHook = fn
}

function normalize(input: string): string {
  const t = (input || '').trim()
  if (!t) return ''
  if (/^(https?|file):\/\//i.test(t)) return t
  if (t.startsWith('/')) return `file://${encodeURI(t)}`
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return `https://${t}`
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`
}

function waitStop(w: WebviewEl, ms = 20000): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      w.removeEventListener('did-stop-loading', done)
      resolve()
    }
    w.addEventListener('did-stop-loading', done)
    setTimeout(done, ms)
  })
}

export interface BrowserCommand {
  id: number
  action: string
  url?: string
  js?: string
  [k: string]: unknown
}

export async function execBrowser(cmd: BrowserCommand): Promise<unknown> {
  if (!el) return { ok: false, error: 'browser not ready (open the 浏览器 panel first)' }
  await whenReady(el)
  try {
    switch (cmd.action) {
      case 'navigate': {
        const url = normalize(String(cmd.url ?? ''))
        if (!url) return { ok: false, error: 'missing url' }
        navHook?.(url)
        await el.loadURL(url)
        await waitStop(el)
        return { ok: true, url: el.getURL(), title: el.getTitle() }
      }
      case 'info':
        return { ok: true, url: el.getURL(), title: el.getTitle() }
      case 'text':
        return { ok: true, text: await el.executeJavaScript('document.body ? document.body.innerText : ""', true) }
      case 'html':
        return { ok: true, html: await el.executeJavaScript('document.documentElement.outerHTML', true) }
      case 'eval': {
        if (!cmd.js) return { ok: false, error: 'missing js' }
        return { ok: true, result: await el.executeJavaScript(String(cmd.js), true) }
      }
      case 'scrollBottom':
        await el.executeJavaScript('window.scrollTo(0, document.body.scrollHeight)', true)
        return { ok: true }
      case 'screenshot': {
        const img = await el.capturePage()
        return { ok: true, dataUrl: img.toDataURL() }
      }
      default:
        return { ok: false, error: `unknown action: ${cmd.action}` }
    }
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) }
  }
}
