// src/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'

// 类型安全的 invoke 包装
const invoke = <T>(channel: string, ...args: unknown[]) =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>

// 注册单向监听
const on = (channel: string, callback: (...args: unknown[]) => void) => {
  const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
    callback(...args)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

contextBridge.exposeInMainWorld('electronAPI', {
  audio: {
    getSources: () => invoke(IPC.AUDIO_GET_SOURCES),
    start: (sourceId?: string) => invoke(IPC.AUDIO_START, sourceId),
    pause: () => invoke(IPC.AUDIO_PAUSE),
    resume: () => invoke(IPC.AUDIO_RESUME),
    stop: () => invoke<{ filePath: string }>(IPC.AUDIO_STOP),
    sendChunk: (chunk: ArrayBuffer) => ipcRenderer.send(IPC.AUDIO_CHUNK, chunk),
    sendLevel: (rms: number) => ipcRenderer.send(IPC.AUDIO_LEVEL_UPDATE, rms),
    onLevel: (cb: (rms: number) => void) =>
      on(IPC.AUDIO_LEVEL, (data: any) => cb(data.rms)),
    onError: (cb: (msg: string) => void) =>
      on(IPC.AUDIO_ERROR, (data: any) => cb(data.message)),
  },

  whisper: {
    transcribe: (filePath: string) =>
      invoke(IPC.WHISPER_TRANSCRIBE, filePath),
    cancel: () => invoke(IPC.WHISPER_CANCEL),
    onProgress: (cb: (p: { percent: number; text: string }) => void) =>
      on(IPC.WHISPER_PROGRESS, cb as any),
  },

  claude: {
    analyze: (sessionId: string, apiConfig?: unknown) => invoke(IPC.CLAUDE_ANALYZE, sessionId, apiConfig),
    onChunk: (cb: (delta: string) => void) =>
      on(IPC.CLAUDE_STREAM_CHUNK, (d: any) => cb(d.delta)),
    onDone: (cb: (report: any) => void) => on(IPC.CLAUDE_DONE, cb as any),
  },

  store: {
    getSessions: () => invoke(IPC.STORE_GET_SESSIONS),
    getSession: (id: string) => invoke(IPC.STORE_GET_SESSION, id),
    saveSession: (s: unknown) => invoke(IPC.STORE_SAVE_SESSION, s),
    deleteSession: (id: string) => invoke(IPC.STORE_DELETE_SESSION, id),
    getSettings: () => invoke(IPC.STORE_GET_SETTINGS),
    saveSettings: (s: unknown) => invoke(IPC.STORE_SAVE_SETTINGS, s),
  },

  file: {
    parsePdf: (arrayBuffer: ArrayBuffer) =>
      invoke<{ success: boolean; text?: string; pages?: number; error?: string }>(
        'file:parse-pdf',
        arrayBuffer
      ),
    deleteFile: (filePath: string) =>
      invoke('file:delete-file', filePath),
    readFile: (filePath: string) =>
      invoke<{ success: boolean; data?: string; error?: string }>(
        'file:read-file',
        filePath
      ),
    openFile: (filePath: string) =>
      invoke<void>('file:open-file', filePath),
  },

  app: {
    minimizeToTray: () => invoke(IPC.APP_MINIMIZE_TO_TRAY),
    getPlatform: () => invoke<'darwin' | 'win32'>(IPC.APP_GET_PLATFORM),
    checkBlackHole: () => invoke(IPC.APP_CHECK_BLACKHOLE),
    isWindowFocused: () => invoke<boolean>('app:is-window-focused'),
    getFloatingBallVisible: () => invoke<boolean>('app:get-floating-ball-visible'),
  },

  floatingBall: {
    move: (deltaX: number, deltaY: number) =>
      invoke('floating-ball:move', deltaX, deltaY),
    toggleRecording: () => invoke('floating-ball:toggle-recording'),
    updateTime: (seconds: number) => ipcRenderer.send('floating-ball:update-time', seconds),
    onTimeUpdate: (cb: (seconds: number) => void) =>
      on('floating-ball:time-update', (seconds: number) => cb(seconds)),
  },

  recordingEvents: {
    onToggleRecording: (cb: () => void) =>
      on('floating-ball:toggle-recording', cb),
  },

  shortcuts: {
    onToggleRecording: (cb: () => void) =>
      on(IPC.SHORTCUT_TOGGLE_RECORDING, cb),
  },
})
