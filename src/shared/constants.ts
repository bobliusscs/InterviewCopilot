// src/shared/constants.ts

export const DEFAULT_SHORTCUTS = {
  toggleRecording: 'CommandOrControl+Shift+R',
  showWindow: 'CommandOrControl+Shift+I',
} as const

export const WHISPER_MODELS = ['tiny', 'base', 'small', 'medium', 'large'] as const

export const SUPPORTED_LANGUAGES = {
  zh: '中文',
  en: 'English',
  auto: '自动检测',
} as const

export const SAMPLE_RATE = 16000
export const AUDIO_CHANNEL_COUNT = 1
