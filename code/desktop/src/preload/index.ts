import { contextBridge, ipcRenderer } from 'electron'

/** 暴露给渲染层的最小化安全 API（contextIsolation 下通过 window.nova 访问）。 */
const api = {
  /** 执行一条自然语言指令 */
  run: (text: string): Promise<{ runId: string }> => ipcRenderer.invoke('nova:run', text),
  /** 查询 Hermes 运行状态 */
  status: (): Promise<unknown> => ipcRenderer.invoke('hermes:status'),
  /** 测试 Hermes 连接 */
  test: (): Promise<unknown> => ipcRenderer.invoke('hermes:test'),
  /** 读取 Hermes 基本属性（模型/Profile/Skill/MCP/用量） */
  info: (): Promise<unknown> => ipcRenderer.invoke('hermes:info'),
  /** 读取设置 */
  getSettings: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
  /** 写入设置（部分字段） */
  setSettings: (patch: Record<string, unknown>): Promise<unknown> => ipcRenderer.invoke('settings:set', patch),
  /** 选择工作目录，返回路径或 null */
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-folder'),
  /** 订阅执行事件流；返回取消订阅函数 */
  onEvent: (cb: (evt: unknown) => void): (() => void) => {
    const listener = (_e: unknown, evt: unknown): void => cb(evt)
    ipcRenderer.on('hermes:event', listener)
    return () => ipcRenderer.removeListener('hermes:event', listener)
  }
}

contextBridge.exposeInMainWorld('nova', api)
