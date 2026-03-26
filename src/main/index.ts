// src/main/index.ts

import { app, BrowserWindow, shell, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { initStore } from './store'
import { setupTray } from './tray'
import { registerAllIpcHandlers } from './ipc/index'
import log from 'electron-log'

log.initialize()

let mainWindow: BrowserWindow | null = null
let floatingBallWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 800,
    minHeight: 520,
    show: false,
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    console.log('[App] Window ready to show')
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load URL or file
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 监听窗口最小化
  mainWindow.on('minimize', () => {
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      floatingBallWindow.show()
      floatingBallWindow.focus()
    }
  })

  // 监听窗口恢复
  mainWindow.on('restore', () => {
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      floatingBallWindow.hide()
    }
  })

  // 监听窗口获得焦点
  mainWindow.on('focus', () => {
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      floatingBallWindow.hide()
    }
  })

  // 窗口关闭时最小化到托盘而不是真正关闭
  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createFloatingBallWindow(): void {
  if (floatingBallWindow) {
    return
  }

  floatingBallWindow = new BrowserWindow({
    width: 80,
    height: 80,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, '../preload/index.js'),
      enableRemoteModule: false,
    },
  })

  // 创建独立的 HTML 内容而不是加载主应用
  const floatingBallHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .floating-ball {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          user-select: none;
          position: relative;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .floating-ball:active {
          cursor: grabbing;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.55);
          transform: scale(0.95);
        }

        .floating-ball:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 26px rgba(59, 130, 246, 0.55);
        }

        .ball-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .ball-time {
          font-size: 14px;
          font-weight: 800;
          color: white;
          font-family: 'Monaco', 'Courier New', monospace;
          line-height: 1;
          letter-spacing: -0.5px;
        }

        .ball-indicator {
          width: 6px;
          height: 6px;
          background: #ff4444;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
          box-shadow: 0 0 8px rgba(255, 68, 68, 0.6);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.3);
          }
        }

        /* CSS 变量 */
        :root {
          --primary: #3b82f6;
        }
      </style>
    </head>
    <body>
      <div class="floating-ball" id="ball">
        <div class="ball-content">
          <div class="ball-time" id="time">00:00</div>
          <div class="ball-indicator"></div>
        </div>
      </div>

      <script>
        const ball = document.getElementById('ball')
        const timeDisplay = document.getElementById('time')
        let isDragging = false
        let startX = 0
        let startY = 0

        // 更新时间
        function updateTime(seconds) {
          const mins = Math.floor(seconds / 60)
          const secs = seconds % 60
          timeDisplay.textContent = \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`
        }

        // 拖动功能
        ball.addEventListener('mousedown', (e) => {
          isDragging = true
          startX = e.clientX
          startY = e.clientY
        })

        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return

          const deltaX = e.clientX - startX
          const deltaY = e.clientY - startY

          if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            window.electronAPI?.floatingBall?.move?.(deltaX, deltaY)
            startX = e.clientX
            startY = e.clientY
          }
        })

        document.addEventListener('mouseup', () => {
          isDragging = false
        })

        // 点击球体切换录音
        ball.addEventListener('click', () => {
          window.electronAPI?.floatingBall?.toggleRecording?.()
        })

        // 监听来自主进程的时间更新
        window.electronAPI?.floatingBall?.onTimeUpdate?.((seconds) => {
          updateTime(seconds)
        })
      </script>
    </body>
    </html>
  `

  floatingBallWindow.loadURL(
    'data:text/html;charset=UTF-8,' + encodeURIComponent(floatingBallHTML)
  )

  // 初始位置：右下角
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  floatingBallWindow.setPosition(width - 100, height - 100)

  floatingBallWindow.on('closed', () => {
    floatingBallWindow = null
  })
}

app.whenReady().then(async () => {
  console.log('[App] Electron ready')

  // 初始化存储
  initStore()

  // 创建窗口
  createWindow()

  // 创建浮球窗口
  createFloatingBallWindow()

  // 初始化托盘
  if (mainWindow) {
    setupTray(mainWindow)
    registerAllIpcHandlers(mainWindow, floatingBallWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  ;(app as any).isQuitting = true
})
