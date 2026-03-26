// src/main/whisper.ts
// 本地转录实现 - 使用 whisper.cpp CLI

import { EventEmitter } from 'events'
import { spawn, execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { app } from 'electron'
import { TranscriptResult } from '@shared/types'

export interface WhisperProgress {
  percent: number
  text: string
}

export class WhisperTranscriber extends EventEmitter {
  private whisperCliPath: string
  private modelPath: string
  private ffmpegPath: string

  constructor() {
    super()
    // 使用无中文的路径
    const basePath = app.isPackaged 
      ? process.resourcesPath 
      : 'C:/whisper-resources/resources'
    
    // whisper-cli.exe 路径
    this.whisperCliPath = path.join(basePath, 'whisper', 'Release', 'whisper-cli.exe')
    // 模型文件路径
    this.modelPath = path.join(basePath, 'whisper', 'models', 'ggml-base.bin')
    // ffmpeg 路径 - 实际位置是 C:\whisper-resources\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe
    // 从 C:/whisper-resources/resources 到 C:/whisper-resources/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe
    this.ffmpegPath = path.join(path.dirname(basePath), 'ffmpeg-master-latest-win64-gpl', 'bin', 'ffmpeg.exe')
    
    console.log('[Whisper] Base path:', basePath)
    console.log('[Whisper] FFmpeg path:', this.ffmpegPath)
    console.log('[Whisper] FFmpeg exists:', require('fs').existsSync(this.ffmpegPath))
  }

  /**
   * 使用 whisper.cpp CLI 进行本地语音转文本
   */
  async transcribe(
    audioFilePath: string,
    options: { model?: string; language?: string } = {}
  ): Promise<TranscriptResult> {
    return new Promise((resolve, reject) => {
      console.log('[Whisper] Starting transcription:', audioFilePath)
      this.emit('progress', { percent: 10, text: '正在初始化...' })

      const language = 'zh-CN' // 简体中文
      
      // 如果是 webm 格式，先转换为 wav
      let inputFile = audioFilePath
      if (audioFilePath.toLowerCase().endsWith('.webm')) {
        this.emit('progress', { percent: 20, text: '正在转换音频格式...' })
        const wavPath = path.join(os.tmpdir(), `whisper_input_${Date.now()}.wav`)
        
        try {
          // 使用 ffmpeg 转换为 16kHz 单声道 WAV
          execSync(`"${this.ffmpegPath}" -y -i "${audioFilePath}" -ar 16000 -ac 1 -acodec pcm_s16le "${wavPath}"`, {
            windowsHide: true,
            timeout: 60000
          })
          inputFile = wavPath
          console.log('[Whisper] Converted to:', wavPath)
        } catch (err) {
          console.error('[Whisper] FFmpeg conversion failed:', err)
          reject(new Error(`音频格式转换失败: ${(err as Error).message}`))
          return
        }
      }
      
      // whisper.cpp CLI 参数
      const args = [
        '-m', this.modelPath,
        '-f', inputFile,
        '-l', language,           // 语言
        '--no-timestamps',         // 不输出时间戳
        '-otxt',                   // 输出纯文本
        '-np',                     // 不打印进度信息到 stdout
      ]

      console.log('[Whisper] Running whisper-cli with args:', args.join(' '))

      const proc = spawn(this.whisperCliPath, args, {
        windowsHide: true,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data) => {
        stderr += data.toString()
        // 处理 stderr 中的进度信息
        const line = data.toString().trim()
        if (line.includes('%')) {
          console.log('[Whisper]', line)
        }
      })

      proc.on('error', (error) => {
        console.error('[Whisper] Process error:', error)
        reject(new Error(`启动 whisper 失败: ${error.message}`))
      })

      proc.on('close', (code) => {
        // 清理临时文件
        if (inputFile !== audioFilePath && fs.existsSync(inputFile)) {
          try {
            fs.unlinkSync(inputFile)
          } catch (e) {
            console.error('[Whisper] Failed to delete temp file:', e)
          }
        }

        if (code === 0) {
          this.emit('progress', { percent: 100, text: '转录完成' })
          
          const transcriptText = stdout.trim()
          console.log('[Whisper] Transcription result:', transcriptText)

          const result: TranscriptResult = {
            text: transcriptText,
            segments: [{
              start: 0,
              end: 0,
              text: transcriptText,
            }],
          }
          resolve(result)
        } else {
          console.error('[Whisper] Exit code:', code)
          console.error('[Whisper] Stderr:', stderr)
          reject(new Error(`转录失败，错误码: ${code}\n${stderr}`))
        }
      })

      // 模拟进度更新
      let progress = 25
      const progressInterval = setInterval(() => {
        progress += 5
        if (progress < 90) {
          this.emit('progress', { percent: progress, text: `正在转录... ${progress}%` })
        }
      }, 2000)
      
      // 清理
      proc.on('close', () => clearInterval(progressInterval))
    })
  }

  cancel(): void {
    console.log('[Whisper] Transcription cancelled')
  }
}

export const whisperTranscriber = new WhisperTranscriber()
