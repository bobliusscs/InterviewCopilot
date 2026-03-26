// src/main/ipc/index.ts

import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import { registerAudioHandlers } from './audio-handlers'
import { registerWhisperHandlers } from './whisper-handlers'
import { registerClaudeHandlers } from './claude-handlers'
import { registerStoreHandlers } from './store-handlers'
import './file-handlers'
import { getPlatform } from '../utils/platform'
import { detectVirtualAudioDevice } from '../capturer/macos'

export function registerAllIpcHandlers(mainWindow: BrowserWindow, floatingBallWindow?: BrowserWindow | null): void {
  console.log('[IPC] Registering all handlers...')

  // 注册各模块的 handlers
  registerAudioHandlers(mainWindow)
  registerWhisperHandlers(mainWindow)
  registerClaudeHandlers(mainWindow)
  registerStoreHandlers()

  // 应用系统信息
  ipcMain.handle(IPC.APP_GET_PLATFORM, async () => {
    return getPlatform()
  })

  // macOS BlackHole 检测
  ipcMain.handle(IPC.APP_CHECK_BLACKHOLE, async () => {
    const platform = getPlatform()
    if (platform === 'darwin') {
      return detectVirtualAudioDevice()
    }
    return { found: false }
  })

  ipcMain.handle(IPC.APP_MINIMIZE_TO_TRAY, async () => {
    mainWindow.hide()
  })

  // 浮球窗口状态检查
  ipcMain.handle('app:is-window-focused', async () => {
    return mainWindow.isFocused()
  })

  ipcMain.handle('app:get-floating-ball-visible', async () => {
    return floatingBallWindow && !floatingBallWindow.isDestroyed() && floatingBallWindow.isVisible()
  })

  // 浮球控制
  ipcMain.handle('floating-ball:move', async (event, deltaX: number, deltaY: number) => {
    if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
    const [x, y] = floatingBallWindow.getPosition()
    floatingBallWindow.setPosition(x + deltaX, y + deltaY)
  })

  ipcMain.handle('floating-ball:toggle-recording', async () => {
    // 向主窗口发送切换录音的消息
    mainWindow.webContents.send('floating-ball:toggle-recording')
  })

  ipcMain.on('floating-ball:update-time', (event, seconds: number) => {
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      floatingBallWindow.webContents.send('floating-ball:time-update', seconds)
    }
  })

  console.log('[IPC] All handlers registered')
}
