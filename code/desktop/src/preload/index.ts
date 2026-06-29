import { contextBridge, ipcRenderer } from 'electron'

/** 暴露给渲染层的最小化安全 API（contextIsolation 下通过 window.nova 访问）。 */
const api = {
  /** 执行一条自然语言指令（可选续接已有会话） */
  run: (text: string, sessionId?: string): Promise<{ runId: string }> => ipcRenderer.invoke('nova:run', text, sessionId),
  /** 停止当前执行 */
  cancel: (): Promise<void> => ipcRenderer.invoke('nova:cancel'),
  /** 会话列表（Hermes） */
  listSessions: (): Promise<unknown> => ipcRenderer.invoke('sessions:list'),
  /** 加载某会话历史 */
  loadSession: (id: string): Promise<unknown> => ipcRenderer.invoke('session:load', id),
  /** 查询 Hermes 运行状态 */
  status: (): Promise<unknown> => ipcRenderer.invoke('hermes:status'),
  /** 测试 Hermes 连接 */
  test: (): Promise<unknown> => ipcRenderer.invoke('hermes:test'),
  /** 读取 Hermes 连接概况（模式/模型/Profile） */
  info: (): Promise<unknown> => ipcRenderer.invoke('hermes:info'),
  /** Profile 列表 */
  listProfiles: (): Promise<unknown> => ipcRenderer.invoke('profiles:list'),
  /** Skill：列表 / 安装 / 卸载 */
  listSkills: (): Promise<unknown> => ipcRenderer.invoke('skills:list'),
  installSkill: (id: string): Promise<unknown> => ipcRenderer.invoke('skills:install', id),
  uninstallSkill: (name: string): Promise<unknown> => ipcRenderer.invoke('skills:uninstall', name),
  /** MCP：列表 / 添加 / 移除 */
  listMcp: (): Promise<unknown> => ipcRenderer.invoke('mcp:list'),
  addMcp: (input: Record<string, unknown>): Promise<unknown> => ipcRenderer.invoke('mcp:add', input),
  removeMcp: (name: string): Promise<unknown> => ipcRenderer.invoke('mcp:remove', name),
  /** 用量指标 */
  usageMetrics: (): Promise<unknown> => ipcRenderer.invoke('usage:metrics'),
  /** 读取设置 */
  getSettings: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
  /** 写入设置（部分字段） */
  setSettings: (patch: Record<string, unknown>): Promise<unknown> => ipcRenderer.invoke('settings:set', patch),
  /** 选择工作目录，返回路径或 null */
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-folder'),
  /** 按关键词解析本地可预览文件，返回 file:// URL 或 null */
  resolveFile: (keyword: string): Promise<string | null> => ipcRenderer.invoke('file:resolve', keyword),
  /** 订阅执行事件流；返回取消订阅函数 */
  onEvent: (cb: (evt: unknown) => void): (() => void) => {
    const listener = (_e: unknown, evt: unknown): void => cb(evt)
    ipcRenderer.on('hermes:event', listener)
    return () => ipcRenderer.removeListener('hermes:event', listener)
  },
  /** 浏览器自动化桥：接收来自主进程的指令 */
  onBrowserCommand: (cb: (cmd: { id: number; action: string; [k: string]: unknown }) => void): (() => void) => {
    const listener = (_e: unknown, cmd: { id: number; action: string }): void => cb(cmd)
    ipcRenderer.on('browser:command', listener)
    return () => ipcRenderer.removeListener('browser:command', listener)
  },
  /** 回传指令执行结果 */
  browserResult: (id: number, result: unknown): void => ipcRenderer.send('browser:result', id, result)
}

contextBridge.exposeInMainWorld('nova', api)
