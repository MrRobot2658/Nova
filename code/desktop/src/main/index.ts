import { app, shell, BrowserWindow, ipcMain, dialog, session } from 'electron'
import { join } from 'path'
import { HermesManager } from './hermes'

let mainWindow: BrowserWindow | null = null
const hermes = new HermesManager()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f7f8fa',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // electron-vite 在 dev 时注入 ELECTRON_RENDERER_URL；打包后加载本地文件
  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // 允许麦克风（语音输入）等媒体权限
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    const p = permission as string
    cb(p === 'media' || p === 'audioCapture' || p === 'microphone')
  })

  // 启动即检测本机 Hermes：存在则复用、不安装；否则用内置；开发期回退模拟
  await hermes.init((evt) => mainWindow?.webContents.send('hermes:event', evt))

  ipcMain.handle('hermes:status', () => hermes.status())
  ipcMain.handle('hermes:test', () => hermes.test())
  ipcMain.handle('hermes:info', () => hermes.info())
  ipcMain.handle('settings:get', () => hermes.getSettings())
  ipcMain.handle('settings:set', (_event, patch) => hermes.setSettings(patch))
  ipcMain.handle('nova:run', (_event, text: string, sessionId?: string) => hermes.run(text, sessionId))
  ipcMain.handle('sessions:list', () => hermes.listSessions())
  ipcMain.handle('session:load', (_event, id: string) => hermes.loadSession(id))

  // 选择工作目录
  ipcMain.handle('dialog:select-folder', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0]
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => hermes.dispose())
