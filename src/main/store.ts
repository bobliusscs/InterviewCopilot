// src/main/store.ts

import Store from 'electron-store'
import { AppSettings, InterviewSession } from '@shared/types'
import { DEFAULT_SHORTCUTS } from '@shared/constants'

export interface StoreSchema {
  sessions: Record<string, InterviewSession>
  settings: AppSettings
}

const defaultSettings: AppSettings = {
  apiKey: '',
  whisperModel: 'base',
  language: 'zh',
  shortcuts: {
    toggleRecording: DEFAULT_SHORTCUTS.toggleRecording,
    showWindow: DEFAULT_SHORTCUTS.showWindow,
  },
}

export const store = new Store<StoreSchema>({
  defaults: {
    sessions: {},
    settings: defaultSettings,
  },
})

export function initStore(): void {
  // 初始化已在 new Store() 时完成
  console.log('[Store] initialized at', store.path)
}

export function getSessions(): InterviewSession[] {
  return Object.values(store.get('sessions', {}))
}

export function getSession(id: string): InterviewSession | undefined {
  return store.get(`sessions.${id}`)
}

export function saveSession(session: InterviewSession): void {
  store.set(`sessions.${session.id}`, session)
}

export function deleteSession(id: string): void {
  store.delete(`sessions.${id}`)
}

export function getSettings(): AppSettings {
  return store.get('settings', defaultSettings)
}

export function saveSettings(settings: AppSettings): void {
  store.set('settings', settings)
}
