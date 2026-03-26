// src/main/ipc/whisper-handlers.ts

import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import { whisperTranscriber } from '../whisper'
import { getSettings } from '../store'

export function registerWhisperHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC.WHISPER_TRANSCRIBE, async (_event, filePath: string) => {
    try {
      const settings = getSettings()
      const result = await whisperTranscriber.transcribe(filePath, {
        model: settings.whisperModel,
        language: settings.language,
      })

      // 转录完成时发送最终结果
      mainWindow.webContents.send(IPC.WHISPER_PROGRESS, {
        percent: 100,
        text: result.text,
      })

      return result
    } catch (error) {
      throw new Error(`Transcription failed: ${(error as Error).message}`)
    }
  })

  // 监听 whisper 进度事件并转发给 renderer
  whisperTranscriber.on('progress', (progress: any) => {
    mainWindow.webContents.send(IPC.WHISPER_PROGRESS, progress)
  })

  ipcMain.handle(IPC.WHISPER_CANCEL, async () => {
    whisperTranscriber.cancel()
  })
}
