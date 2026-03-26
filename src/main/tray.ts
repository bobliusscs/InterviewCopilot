// src/main/tray.ts

import { Tray, Menu, globalShortcut, BrowserWindow, app, nativeImage } from 'electron'
import { join } from 'path'
import { IPC } from '@shared/ipc-channels'
import { DEFAULT_SHORTCUTS } from '@shared/constants'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow): void {
  try {
    const iconPath = join(__dirname, '../../resources/tray-icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    tray = new Tray(icon.resize({ width: 16, height: 16 }))
    tray.setToolTip('InterviewCopilot')

    // 双击托盘恢复窗口
    tray.on('double-click', () => {
      mainWindow.show()
      mainWindow.focus()
    })

    updateTrayMenu(mainWindow, 'idle')
    registerGlobalShortcuts(mainWindow)

    console.log('[Tray] Tray initialized')
  } catch (error) {
    console.error('[Tray] Failed to initialize tray:', error)
  }
}

export function updateTrayMenu(
  mainWindow: BrowserWindow,
  state: 'idle' | 'recording' | 'paused'
): void {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: state === 'recording' ? '暂停录音' : state === 'paused' ? '继续录音' : '开始录音',
      click: () => {
        if (state === 'recording') {
          mainWindow.webContents.send(IPC.AUDIO_PAUSE)
        } else {
          mainWindow.webContents.send(IPC.SHORTCUT_TOGGLE_RECORDING)
        }
      },
    },
    {
      label: '结束录音',
      enabled: state !== 'idle',
      click: () => mainWindow.webContents.send(IPC.AUDIO_STOP),
    },
    { type: 'separator' },
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        ;(app as any).isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  try {
    // 全局快捷键：Cmd/Ctrl+Shift+R 切换录音
    globalShortcut.register(DEFAULT_SHORTCUTS.toggleRecording, () => {
      mainWindow.webContents.send(IPC.SHORTCUT_TOGGLE_RECORDING)
    })

    // 全局快捷键：Cmd/Ctrl+Shift+I 显示/隐藏窗口
    globalShortcut.register(DEFAULT_SHORTCUTS.showWindow, () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })

    console.log('[Tray] Global shortcuts registered')

    app.on('will-quit', () => globalShortcut.unregisterAll())
  } catch (error) {
    console.error('[Tray] Failed to register shortcuts:', error)
  }
}
