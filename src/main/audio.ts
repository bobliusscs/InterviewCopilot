// src/main/audio.ts

import { BrowserWindow, desktopCapturer, ipcMain } from 'electron'
import { createWriteStream, WriteStream } from 'fs'
import { join } from 'path'
import { getRecordingsDir } from './utils/file'
import { IPC } from '@shared/ipc-channels'

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped'

interface AudioSession {
  state: RecordingState
  filePath: string
  stream: WriteStream
  startTime: number
  byteCount: number
}

let currentSession: AudioSession | null = null

/**
 * 获取 desktopCapturer 的可用源列表
 */
export async function getAudioSources(): Promise<any[]> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 0, height: 0 },
      fetchWindowIcons: false,
    })
    return sources
  } catch (error) {
    try {
      console.error('[Audio] Failed to get sources:', error)
    } catch (logError) {
      // 忽略日志错误
    }
    return []
  }
}

/**
 * 开始录音。Main process 为文件创建 WriteStream，
 * Renderer 通过 audio:chunk IPC 发送 ArrayBuffer 片段
 */
export async function startAudioCapture(): Promise<{ filePath: string }> {
  if (currentSession && currentSession.state !== 'idle') {
    throw new Error('Recording already in progress')
  }

  const recordingsDir = getRecordingsDir()
  const fileName = `interview_${Date.now()}.webm`
  const filePath = join(recordingsDir, fileName)

  const stream = createWriteStream(filePath)

  // 处理流错误，防止 EPIPE
  stream.on('error', (error) => {
    console.error('[Audio] WriteStream error:', error)
  })

  currentSession = {
    state: 'recording',
    filePath,
    stream,
    startTime: Date.now(),
    byteCount: 0,
  }

  try {
    console.log('[Audio] Recording started:', filePath)
  } catch (error) {
    // 忽略日志错误
  }
  return { filePath }
}

export function pauseAudioCapture(): void {
  if (currentSession?.state === 'recording') {
    currentSession.state = 'paused'
    try {
      console.log('[Audio] Recording paused')
    } catch (error) {
      // 忽略日志错误
    }
  }
}

export function resumeAudioCapture(): void {
  if (currentSession?.state === 'paused') {
    currentSession.state = 'recording'
    try {
      console.log('[Audio] Recording resumed')
    } catch (error) {
      // 忽略日志错误
    }
  }
}

export async function stopAudioCapture(): Promise<{ filePath: string }> {
  return new Promise((resolve, reject) => {
    if (!currentSession) {
      return reject(new Error('No active recording'))
    }

    currentSession.state = 'stopped'
    currentSession.stream.end(() => {
      const filePath = currentSession!.filePath
      const duration = (Date.now() - currentSession!.startTime) / 1000
      const size = currentSession!.byteCount / (1024 * 1024)
      try {
        console.log(`[Audio] Recording stopped: ${duration.toFixed(1)}s, ${size.toFixed(2)}MB`)
      } catch (error) {
        // 忽略日志错误
      }
      currentSession = null
      resolve({ filePath })
    })

    // 如果 stream 关闭时出错，也要清理
    currentSession.stream.on('error', () => {
      currentSession = null
    })
  })
}

/**
 * 注册 Audio IPC handlers
 */
export function setupAudioHandlers(mainWindow: BrowserWindow): void {
  // 从 renderer 接收音频数据块
  ipcMain.on(IPC.AUDIO_CHUNK, (_event, chunk: ArrayBuffer) => {
    if (currentSession?.state === 'recording') {
      currentSession.stream.write(Buffer.from(chunk))
      currentSession.byteCount += chunk.byteLength
    }
  })

  // 从 renderer 接收实时音量
  ipcMain.on(IPC.AUDIO_LEVEL_UPDATE, (_event, rms: number) => {
    mainWindow.webContents.send(IPC.AUDIO_LEVEL, { rms })
  })

  // 获取音频源
  ipcMain.handle(IPC.AUDIO_GET_SOURCES, async () => {
    return getAudioSources()
  })

  // 开始录音
  ipcMain.handle(IPC.AUDIO_START, async () => {
    return startAudioCapture()
  })

  // 暂停
  ipcMain.handle(IPC.AUDIO_PAUSE, async () => {
    pauseAudioCapture()
  })

  // 继续
  ipcMain.handle(IPC.AUDIO_RESUME, async () => {
    resumeAudioCapture()
  })

  // 停止录音
  ipcMain.handle(IPC.AUDIO_STOP, async () => {
    return stopAudioCapture()
  })
}
