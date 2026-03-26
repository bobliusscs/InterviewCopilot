// src/main/ipc/store-handlers.ts

import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import {
  getSessions,
  getSession,
  saveSession,
  deleteSession,
  getSettings,
  saveSettings,
} from '../store'

export function registerStoreHandlers(): void {
  ipcMain.handle(IPC.STORE_GET_SESSIONS, async () => {
    return getSessions()
  })

  ipcMain.handle(IPC.STORE_GET_SESSION, async (_event, id: string) => {
    return getSession(id)
  })

  ipcMain.handle(IPC.STORE_SAVE_SESSION, async (_event, session: any) => {
    saveSession(session)
  })

  ipcMain.handle(IPC.STORE_DELETE_SESSION, async (_event, id: string) => {
    deleteSession(id)
  })

  ipcMain.handle(IPC.STORE_GET_SETTINGS, async () => {
    return getSettings()
  })

  ipcMain.handle(IPC.STORE_SAVE_SETTINGS, async (_event, settings: any) => {
    saveSettings(settings)
  })
}
