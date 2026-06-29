import type { DetailedHTMLProps, HTMLAttributes } from 'react'

// 让 TSX 识别 Electron 的 <webview> 标签
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          src?: string
          partition?: string
          allowpopups?: string
          useragent?: string
        },
        HTMLElement
      >
    }
  }
}
