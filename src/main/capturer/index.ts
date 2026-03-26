// src/main/capturer/index.ts

import { isMacOS, isWindows } from '../utils/platform'

export async function getPlatformCapturerConfig() {
  if (isMacOS()) {
    const m = await import('./macos')
    return {
      mode: 'macos' as const,
      detectVirtualAudioDevice: m.detectVirtualAudioDevice,
      getAudioConstraints: m.getMacOSAudioConstraints,
      getScreenSource: m.getScreenSource,
    }
  } else if (isWindows()) {
    const w = await import('./windows')
    return {
      mode: 'windows' as const,
      getAudioSource: w.getWindowsAudioSource,
      getAudioConstraints: w.getWindowsAudioConstraints,
    }
  }
  throw new Error('Unsupported platform for audio capture')
}
