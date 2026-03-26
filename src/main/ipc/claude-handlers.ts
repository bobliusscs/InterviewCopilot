// src/main/ipc/claude-handlers.ts

import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import { getSession, saveSession } from '../store'
import { analyzeInterview, ApiConfig } from '../claude'

export function registerClaudeHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC.CLAUDE_ANALYZE, async (_event, sessionId: string, apiConfig: ApiConfig) => {
    try {
      const session = getSession(sessionId)
      if (!session) {
        throw new Error(`Session ${sessionId} not found`)
      }

      if (!apiConfig?.apiKey) {
        throw new Error('API key not configured. Please go to Settings and configure your AI API.')
      }

      const report = await analyzeInterview(session, mainWindow, apiConfig)

      // 保存报告到 electron-store
      session.report = report
      session.status = 'done'
      saveSession(session)

      return report
    } catch (error) {
      throw new Error(`Analysis failed: ${(error as Error).message}`)
    }
  })
}
