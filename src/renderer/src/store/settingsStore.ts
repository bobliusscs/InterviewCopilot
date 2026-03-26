// src/renderer/src/store/settingsStore.ts

import { create } from 'zustand'
import { AppSettings } from '@shared/types'
import { DEFAULT_SHORTCUTS } from '@shared/constants'

interface SettingsState {
  settings: AppSettings
  loaded: boolean

  setSettings: (settings: AppSettings) => void
  updateApiKey: (key: string) => void
  loadSettings: (settings: AppSettings) => void
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

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  loaded: false,

  setSettings: (settings) => set({ settings, loaded: true }),
  updateApiKey: (key) =>
    set((state) => ({
      settings: { ...state.settings, apiKey: key },
    })),
  loadSettings: (settings) =>
    set({ settings, loaded: true }),
}))
