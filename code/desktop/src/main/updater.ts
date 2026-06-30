import { app, ipcMain, type BrowserWindow } from 'electron'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

/** OTA 自动更新：检查 → 用户点击下载 → 下载完点击重启安装。 */
export function setupUpdater(getWin: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const send = (type: string, payload?: unknown): void => {
    getWin()?.webContents.send('update:event', { type, payload })
  }

  autoUpdater.on('checking-for-update', () => send('checking'))
  autoUpdater.on('update-available', (info) => send('available', { version: info.version }))
  autoUpdater.on('update-not-available', () => send('not-available'))
  autoUpdater.on('error', (e: Error) => send('error', { message: String(e?.message ?? e) }))
  autoUpdater.on('download-progress', (p) => send('progress', { percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => send('downloaded', { version: info.version }))

  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) return { ok: false, message: '开发模式不检查更新（打包后生效）' }
    try {
      const r = await autoUpdater.checkForUpdates()
      return { ok: true, version: r?.updateInfo?.version }
    } catch (e) {
      return { ok: false, message: String((e as Error).message) }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (e) {
      return { ok: false, message: String((e as Error).message) }
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })

  // 启动后静默检查一次（仅打包后）
  if (app.isPackaged) {
    setTimeout(() => {
      void autoUpdater.checkForUpdates().catch(() => undefined)
    }, 4000)
  }
}
