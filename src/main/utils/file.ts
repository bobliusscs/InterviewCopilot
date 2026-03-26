// src/main/utils/file.ts

import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export function getRecordingsDir(): string {
  const dir = join(app.getPath('userData'), 'recordings')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getSessionsDir(): string {
  const dir = join(app.getPath('userData'), 'sessions')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}
