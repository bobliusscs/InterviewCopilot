// src/main/claude.ts
// 使用 OpenAI 兼容格式调用 DeepSeek / 任意 AI API（流式输出）

import * as https from 'https'
import * as http from 'http'
import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import { InterviewSession, ReviewReport } from '@shared/types'
import { URL } from 'url'

export interface ApiConfig {
  provider: string
  apiKey: string
  apiUrl: string
  model: string
}

function buildAnalysisPrompt(session: InterviewSession): string {
  return `你是一位资深面试教练。请根据以下面试录音转录文本，生成一份结构化的复盘分析报告。

## 面试背景
- 目标岗位：${session.targetRole ?? '未知'}
- 公司：${(session as any).targetCompany ?? '未知'}
- 面试时长：${Math.round((session.duration ?? 0) / 60)} 分钟

## 面试转录
${session.transcript || '(无转录文本，请根据背景信息给出通用建议)'}

## 输出要求
请以 JSON 格式返回，结构如下：
{
  "overallScore": 75,
  "summary": "总体评价...",
  "strengths": ["亮点1", "亮点2"],
  "improvements": [
    { "aspect": "技术深度", "detail": "具体问题描述", "suggestion": "改进建议" }
  ],
  "keyMoments": [
    { "timestamp": 120, "type": "highlight", "description": "表现出色的时刻" }
  ],
  "prepSuggestions": ["下次准备建议1", "建议2"]
}

请直接返回 JSON，不要有任何 markdown 代码块或额外说明。`
}

export async function analyzeInterview(
  session: InterviewSession,
  mainWindow: BrowserWindow,
  apiConfig: ApiConfig
): Promise<ReviewReport> {
  if (!apiConfig?.apiKey) {
    throw new Error('API key not configured. Please configure it in Settings.')
  }

  const baseUrl = apiConfig.apiUrl.replace(/\/$/, '')
  const chatUrl = `${baseUrl}/chat/completions`

  console.log(`[Analysis] Calling ${apiConfig.provider} (${apiConfig.model}) at ${chatUrl}`)

  const requestBody = JSON.stringify({
    model: apiConfig.model,
    max_tokens: 2048,
    stream: true,
    messages: [
      { role: 'user', content: buildAnalysisPrompt(session) }
    ],
  })

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(chatUrl)
    const isHttps = parsedUrl.protocol === 'https:'
    const lib = isHttps ? https : http

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Accept': 'text/event-stream',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    }

    const req = lib.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        let errBody = ''
        res.on('data', (chunk) => { errBody += chunk })
        res.on('end', () => {
          reject(new Error(`API error ${res.statusCode}: ${errBody}`))
        })
        return
      }

      let fullContent = ''
      let buffer = ''

      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8')

        // 按行解析 SSE
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // 最后一行可能不完整，留到下次

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (!trimmed.startsWith('data: ')) continue

          try {
            const json = JSON.parse(trimmed.slice(6))
            const delta = json.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              fullContent += delta
              mainWindow.webContents.send(IPC.CLAUDE_STREAM_CHUNK, { delta })
            }
          } catch (_) {
            // 跳过解析失败的行
          }
        }
      })

      res.on('end', () => {
        try {
          // 提取 JSON（模型可能在 JSON 外面加文字或 markdown 代码块）
          const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error('No JSON found in response. Raw: ' + fullContent.slice(0, 200))
          const report: ReviewReport = JSON.parse(jsonMatch[0])
          console.log(`[Analysis] Complete. Score: ${report.overallScore}`)
          mainWindow.webContents.send(IPC.CLAUDE_DONE, report)
          resolve(report)
        } catch (e) {
          reject(new Error(`Failed to parse response: ${(e as Error).message}`))
        }
      })

      res.on('error', reject)
    })

    req.on('error', reject)
    req.write(requestBody)
    req.end()
  })
}
