// src/main/capturer/macos.ts

import { desktopCapturer } from 'electron'

/**
 * macOS 音频捕获约束生成
 * 需要虚拟音频设备如 BlackHole、Soundflower 等
 */

const VIRTUAL_AUDIO_DEVICES = [
  'BlackHole 2ch',
  'BlackHole 16ch',
  'Soundflower (2ch)',
  'Soundflower (64ch)',
  'Loopback Audio',
]

export async function detectVirtualAudioDevice(): Promise<{
  found: boolean
  deviceName?: string
}> {
  // macOS 音频设备不出现在 desktopCapturer 中
  // 需要在 renderer 侧通过 enumerateDevices() 检测
  // 这里返回提示，实际检测在 renderer 完成后通过 IPC 回报
  return { found: false, deviceName: undefined }
}

export function getMacOSAudioConstraints(deviceId?: string) {
  return {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      sampleRate: 16000,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    } as const,
    video: false,
  }
}

export async function getScreenSource() {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 0, height: 0 },
  })
  return sources[0] // 通常第一个 screen source
}
