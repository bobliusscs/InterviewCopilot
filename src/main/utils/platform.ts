// src/main/utils/platform.ts

import { platform } from 'os'

export function getPlatform(): 'darwin' | 'win32' | 'linux' {
  return platform() as 'darwin' | 'win32' | 'linux'
}

export function isMacOS(): boolean {
  return getPlatform() === 'darwin'
}

export function isWindows(): boolean {
  return getPlatform() === 'win32'
}

export function isLinux(): boolean {
  return getPlatform() === 'linux'
}
