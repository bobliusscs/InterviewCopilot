// src/preload/index.d.ts

import { InterviewSession, ReviewReport, AppSettings, TranscriptResult } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      audio: {
        getSources: () => Promise<any[]>
        start: (sourceId?: string) => Promise<{ filePath: string }>
        pause: () => Promise<void>
        resume: () => Promise<void>
        stop: () => Promise<{ filePath: string }>
        sendChunk: (chunk: ArrayBuffer) => void
        sendLevel: (rms: number) => void
        onLevel: (cb: (rms: number) => void) => () => void
        onError: (cb: (msg: string) => void) => () => void
      }
      whisper: {
        transcribe: (filePath: string) => Promise<TranscriptResult>
        cancel: () => Promise<void>
        onProgress: (cb: (p: { percent: number; text: string }) => void) => () => void
      }
      claude: {
        analyze: (sessionId: string, apiConfig?: unknown) => Promise<ReviewReport>
        onChunk: (cb: (delta: string) => void) => () => void
        onDone: (cb: (report: ReviewReport) => void) => () => void
      }
      store: {
        getSessions: () => Promise<InterviewSession[]>
        getSession: (id: string) => Promise<InterviewSession | undefined>
        saveSession: (s: InterviewSession) => Promise<void>
        deleteSession: (id: string) => Promise<void>
        getSettings: () => Promise<AppSettings>
        saveSettings: (s: AppSettings) => Promise<void>
      }
      file: {
        parsePdf: (arrayBuffer: ArrayBuffer) => Promise<{
          success: boolean
          text?: string
          pages?: number
          error?: string
        }>
        deleteFile: (filePath: string) => Promise<void>
        readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
        openFile: (filePath: string) => Promise<void>
      }
      app: {
        minimizeToTray: () => Promise<void>
        getPlatform: () => Promise<'darwin' | 'win32'>
        checkBlackHole: () => Promise<{ found: boolean; deviceName?: string }>
        isWindowFocused: () => Promise<boolean>
        getFloatingBallVisible: () => Promise<boolean>
      }

      floatingBall: {
        move: (deltaX: number, deltaY: number) => Promise<void>
        toggleRecording: () => Promise<void>
        updateTime: (seconds: number) => void
        onTimeUpdate: (cb: (seconds: number) => void) => () => void
      }

      recordingEvents: {
        onToggleRecording: (cb: () => void) => () => void
      }
      shortcuts: {
        onToggleRecording: (cb: () => void) => () => void
      }
    }
  }
}

export {}
