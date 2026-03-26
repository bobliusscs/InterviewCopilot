// src/main/capturer/windows.ts

import { desktopCapturer } from 'electron'

/**
 * Windows WASAPI 通过 desktopCapturer 直接捕获系统音频
 * 无需虚拟设备，但需要同时请求 video（即使只需要 audio）
 */

export async function getWindowsAudioSource() {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 0, height: 0 },
  })
  return sources[0] // 第一个 screen source
}

export function getWindowsAudioConstraints() {
  return {
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
      },
    } as any,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        maxWidth: 1,
        maxHeight: 1,
        maxFrameRate: 1,
      },
    } as any,
  }
}
