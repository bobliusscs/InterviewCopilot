// src/main/ipc/audio-handlers.ts

import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import * as audioModule from '../audio'

export function registerAudioHandlers(mainWindow: BrowserWindow): void {
  // 注册已在 audio.ts 中，这里做集中管理导入
  audioModule.setupAudioHandlers(mainWindow)
}
