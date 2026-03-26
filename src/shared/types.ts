// src/shared/types.ts

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'transcribing' | 'analyzing' | 'done' | 'error'

export interface MemoCard {
  id: string
  question: string                     // 面试题目
  category: 'frequency' | 'star'       // 高频题 或 STAR框架题
  keywords?: string[]                  // 相关关键词
  tips?: string[]                      // 回答建议
  starFramework?: {
    situation?: string
    task?: string
    action?: string
    result?: string
  }
}

export interface InterviewSession {
  id: string
  createdAt: number                    // Unix timestamp
  targetRole?: string                  // 目标岗位
  jobDescription?: string              // 岗位描述
  resumeSnapshot?: string              // 简历内容

  // 生成题目部分
  memoCards?: MemoCard[]               // 生成的备忘卡

  // 录音部分 - 支持多段录音
  audioFilePath?: string               // 最后一段录音文件路径（向后兼容）
  duration?: number                    // 最后一段录音时长（秒）
  transcript?: string                  // 最后一段转录文本
  transcriptSegments?: Array<{
    start: number
    end: number
    text: string
  }>

  // 多段录音支持
  recordings?: Array<{
    id: string                         // 唯一标识
    audioFilePath: string              // 音频文件路径
    duration: number                   // 录音时长（秒）
    transcript: string                 // 转录文本
    createdAt: number                  // 录制时间
  }>

  // 复盘分析部分
  report?: ReviewReport

  // 状态
  status: RecordingStatus
}

export interface ReviewReport {
  overallScore: number                 // 0-100
  summary: string
  strengths: string[]
  improvements: Array<{
    aspect: string
    detail: string
    suggestion: string
  }>
  keyMoments: Array<{
    timestamp: number                  // 秒
    type: 'highlight' | 'weakness'
    description: string
  }>
  prepSuggestions: string[]
}

export interface AppSettings {
  // AI API 配置
  provider: string                      // 服务商名称
  apiKey: string                        // API Key
  apiUrl: string                         // API 端点
  model: string                          // 模型名称
  
  whisperModel: 'tiny' | 'base' | 'small' | 'medium' | 'large'
  language: string                     // 'zh' | 'en' | 'auto'
  shortcuts: {
    toggleRecording: string            // e.g. 'CommandOrControl+Shift+R'
    showWindow: string
  }
  audioDevice?: {
    micDeviceId?: string
    loopbackDeviceLabel?: string       // macOS BlackHole 设备名
  }
}

export interface TranscriptResult {
  text: string                         // 完整转录文本
  segments: Array<{
    start: number                      // 秒
    end: number
    text: string
  }>
}

