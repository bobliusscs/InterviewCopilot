// src/shared/ipc-channels.ts

export const IPC = {
  // ── 音频捕获 ────────────────────────────────────
  AUDIO_GET_SOURCES: 'audio:get-sources',       // invoke → DesktopCapturerSource[]
  AUDIO_START: 'audio:start',                   // invoke(sourceId?) → { filePath: string }
  AUDIO_PAUSE: 'audio:pause',                   // invoke → void
  AUDIO_RESUME: 'audio:resume',                 // invoke → void
  AUDIO_STOP: 'audio:stop',                     // invoke → { filePath: string }
  AUDIO_CHUNK: 'audio:chunk',                   // send(renderer→main) → ArrayBuffer
  AUDIO_LEVEL_UPDATE: 'audio:level-update',     // send(renderer→main) → number (rms)

  // ── Main 推送给 Renderer 的事件 ────────────────
  AUDIO_LEVEL: 'audio:level',                   // webContents.send → { rms: number }
  AUDIO_ERROR: 'audio:error',                   // webContents.send → { message: string }

  // ── Whisper 转录 ──────────────────────────────
  WHISPER_TRANSCRIBE: 'whisper:transcribe',     // invoke(filePath) → TranscriptResult
  WHISPER_PROGRESS: 'whisper:progress',         // webContents.send → { percent: number; text: string }
  WHISPER_CANCEL: 'whisper:cancel',             // invoke → void

  // ── Claude 复盘分析 ────────────────────────────
  CLAUDE_ANALYZE: 'claude:analyze',             // invoke(sessionId) → ReviewReport
  CLAUDE_STREAM_CHUNK: 'claude:stream-chunk',   // webContents.send → { delta: string }
  CLAUDE_DONE: 'claude:done',                   // webContents.send → ReviewReport

  // ── 数据持久化 ─────────────────────────────────
  STORE_GET_SESSIONS: 'store:get-sessions',     // invoke → InterviewSession[]
  STORE_GET_SESSION: 'store:get-session',       // invoke(id) → InterviewSession
  STORE_SAVE_SESSION: 'store:save-session',     // invoke(session) → void
  STORE_DELETE_SESSION: 'store:delete-session', // invoke(id) → void
  STORE_GET_SETTINGS: 'store:get-settings',     // invoke → AppSettings
  STORE_SAVE_SETTINGS: 'store:save-settings',   // invoke(settings) → void

  // ── 系统 & 窗口控制 ────────────────────────────
  APP_MINIMIZE_TO_TRAY: 'app:minimize-to-tray', // invoke → void
  APP_SHOW_WINDOW: 'app:show-window',           // on(tray 触发) → void
  APP_GET_PLATFORM: 'app:get-platform',         // invoke → 'darwin' | 'win32'
  APP_CHECK_BLACKHOLE: 'app:check-blackhole',   // invoke → { found: boolean; deviceName?: string }

  // ── Shortcuts ──────────────────────────────────
  SHORTCUT_TOGGLE_RECORDING: 'shortcut:toggle-recording',
} as const
