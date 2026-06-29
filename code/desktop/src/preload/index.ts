import { contextBridge, ipcRenderer } from 'electron'

/** 暴露给渲染层的最小化安全 API（contextIsolation 下通过 window.nova 访问）。 */
const api = {
  /** 执行一条自然语言指令 */
  run: (text: string): Promise<{ runId: string }> => ipcRenderer.invoke('nova:run', text),
  /** 查询 Hermes 运行状态 */
  status: (): Promise<unknown> => ipcRenderer.invoke('hermes:status'),
  /** 订阅执行事件流；返回取消订阅函数 */
  onEvent: (cb: (evt: unknown) => void): (() => void) => {
    const listener = (_e: unknown, evt: unknown): void => cb(evt)
    ipcRenderer.on('hermes:event', listener)
    return () => ipcRenderer.removeListener('hermes:event', listener)
  }
}

contextBridge.exposeInMainWorld('nova', api)
