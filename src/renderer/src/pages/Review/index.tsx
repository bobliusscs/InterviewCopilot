import React, { useState, useEffect, useRef } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { ReviewReport } from '@shared/types'
import './Review.css'

// 从 localStorage 读取 AI 分析配置
function getApiConfig() {
  try {
    const saved = localStorage.getItem('ai-api-config')
    if (saved) return JSON.parse(saved)
  } catch (_) {}
  return null
}

export default function Review() {
  const { currentSession } = useSessionStore()

  // 转录状态
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)
  const [transcribeProgress, setTranscribeProgress] = useState('')

  // 分析状态
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])

  useEffect(() => {
    return () => { cleanupRef.current.forEach((fn) => fn()) }
  }, [])

  // ── 第一步：语音转文本（whisper.cpp 本地转录） ───────────────────
  const handleTranscribe = async () => {
    if (!currentSession?.audioFilePath) return

    setIsTranscribing(true)
    setTranscribeError(null)
    setTranscribeProgress('正在准备转录...')

    try {
      // 监听转录进度
      const unsubProgress = window.electronAPI?.whisper?.onProgress?.((progress: { percent: number; text: string }) => {
        setTranscribeProgress(`${progress.text} (${progress.percent}%)`)
      })

      // 调用主进程的 whisper 进行转录
      setTranscribeProgress('正在初始化 whisper 模型...')
      const result = await window.electronAPI?.whisper?.transcribe?.(currentSession.audioFilePath)

      unsubProgress?.()

      if (!result?.text?.trim()) {
        throw new Error('转录结果为空，请确认录音中有语音内容')
      }

      setTranscribeProgress('转录完成，正在保存...')

      // 更新 session transcript
      const updatedSession = {
        ...useSessionStore.getState().currentSession!,
        transcript: (currentSession.transcript || '') + (currentSession.transcript ? '\n\n' : '') + result.text,
      }
      useSessionStore.getState().updateSession(updatedSession)
      await window.electronAPI?.store?.saveSession?.(updatedSession)

    } catch (error: any) {
      setTranscribeError(error?.message || '转录失败')
    } finally {
      setIsTranscribing(false)
      setTranscribeProgress('')
    }
  }

  // ── 第二步：AI 深度分析（DeepSeek / OpenAI 兼容） ────────────────
  const handleAnalyze = async () => {
    if (!currentSession) return

    // 从主进程 store 获取 API 配置
    let apiConfig: any = null
    try {
      const settings = await window.electronAPI?.store?.getSettings?.()
      if (settings?.apiKey) {
        apiConfig = {
          apiKey: settings.apiKey,
          apiUrl: settings.apiUrl,
          model: settings.model,
        }
      }
    } catch (e) {
      console.error('Failed to get settings:', e)
    }
    
    // 如果主进程 store 没有，尝试从 localStorage 读取（向后兼容）
    if (!apiConfig) {
      const saved = localStorage.getItem('ai-api-config')
      if (saved) {
        try {
          apiConfig = JSON.parse(saved)
        } catch (_) {}
      }
    }
    
    if (!apiConfig?.apiKey) {
      setAnalyzeError('请先在设置页面配置 API Key')
      return
    }

    setIsAnalyzing(true)
    setStreamingText('')
    setAnalyzeError(null)

    // 监听主进程流式输出
    const unsubChunk = window.electronAPI?.claude?.onChunk?.((delta: string) => {
      setStreamingText((prev) => prev + delta)
    })
    if (unsubChunk) cleanupRef.current.push(unsubChunk)

    // 监听分析完成
    const unsubDone = window.electronAPI?.claude?.onDone?.((report: ReviewReport) => {
      const session = useSessionStore.getState().currentSession!
      const updatedSession = { ...session, report, status: 'done' as const }
      useSessionStore.getState().updateSession(updatedSession)
      window.electronAPI?.store?.saveSession?.(updatedSession).catch(console.error)
      setIsAnalyzing(false)
    })
    if (unsubDone) cleanupRef.current.push(unsubDone)

    try {
      // 把 apiConfig 传给主进程，主进程用它调用 DeepSeek
      await window.electronAPI.claude.analyze(currentSession.id, apiConfig)
    } catch (error: any) {
      setIsAnalyzing(false)
      setAnalyzeError(error?.message || '分析失败，请检查 API 配置')
    }
  }

  // ── 无 session ──────────────────────────────────────────────────
  if (!currentSession) {
    return (
      <div className="page-container">
        <div className="page-header">
          <span className="page-icon">📊</span>
          <div>
            <h1 className="page-title">复盘分析</h1>
            <p className="page-subtitle">语音转文本 + AI 深度分析</p>
          </div>
        </div>
        <div className="empty-state card">
          <div className="empty-icon">🎙️</div>
          <h2>尚未选择面试记录</h2>
          <p>请先在录音页面完成一次录音，然后回到此页面进行复盘分析</p>
        </div>
      </div>
    )
  }

  const { report, transcript, audioFilePath } = currentSession

  // ── 分析中：显示流式输出 ─────────────────────────────────────────
  if (isAnalyzing) {
    return (
      <div className="page-container">
        <div className="page-header">
          <span className="page-icon">📊</span>
          <div>
            <h1 className="page-title">复盘分析</h1>
            <p className="page-subtitle">AI 正在分析中...</p>
          </div>
        </div>
        <div className="analyzing-state card">
          <div className="analyzing-spinner"></div>
          <h3>AI 正在深度分析你的面试表现</h3>
          <p className="analyzing-hint">基于语音转录内容，生成个性化复盘报告</p>
          {streamingText && (
            <div className="streaming-preview">
              <div className="streaming-label">实时输出</div>
              <pre className="streaming-text">{streamingText}</pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── 有 report：展示完整报告 ──────────────────────────────────────
  if (report) {
    return (
      <div className="page-container">
        <div className="page-header">
          <span className="page-icon">📊</span>
          <div>
            <h1 className="page-title">复盘分析</h1>
            <p className="page-subtitle">{currentSession.targetRole || '面试复盘'}</p>
          </div>
        </div>

        {transcript && (
          <details className="transcript-collapse card">
            <summary className="transcript-summary">
              <span>查看语音转录原文</span>
              <span className="transcript-len">{transcript.length} 字</span>
            </summary>
            <div className="transcript-body">{transcript}</div>
          </details>
        )}

        <div className="review-container">
          <div className="score-card card">
            <h2>综合评分</h2>
            <div className="score-display">
              <div className="score-circle">
                <span className="score-number">{report.overallScore}</span>
                <span className="score-label">/ 100</span>
              </div>
              <div className="score-bar">
                <div className="score-bar-fill" style={{ width: `${report.overallScore}%` }}></div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                {report.overallScore >= 80 ? '🌟 优秀表现' :
                  report.overallScore >= 60 ? '👍 良好水平' : '💪 继续努力'}
              </p>
            </div>
          </div>

          <div className="summary-card card">
            <h2>总体评价</h2>
            <p className="summary-text">{report.summary}</p>
          </div>

          <div className="card">
            <h2>表现亮点</h2>
            <div className="strengths-list">
              {report.strengths.map((s, i) => (
                <div key={i} className="strength-item">
                  <span className="strength-badge">✨</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>改进建议</h2>
            <div className="improvements-list">
              {report.improvements.map((item, i) => (
                <div key={i} className="improvement-item">
                  <div className="improvement-header">
                    <span className="improvement-aspect">{item.aspect}</span>
                  </div>
                  <p className="improvement-detail">{item.detail}</p>
                  <p className="improvement-suggestion"><strong>建议：</strong>{item.suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {report.keyMoments?.length > 0 && (
            <div className="card">
              <h2>关键时刻</h2>
              <div className="moments-list">
                {report.keyMoments.map((m, i) => (
                  <div key={i} className={`moment-item moment-${m.type}`}>
                    <span className="moment-time">
                      {Math.floor(m.timestamp / 60)}:{(m.timestamp % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="moment-badge">{m.type === 'highlight' ? '✓' : '!'}</span>
                    <span>{m.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2>下次面试准备建议</h2>
            <div className="suggestions-list">
              {report.prepSuggestions.map((s, i) => (
                <div key={i} className="suggestion-item">
                  <span className="suggestion-number">{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 两步骤操作界面 ───────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <span className="page-icon">📊</span>
        <div>
          <h1 className="page-title">复盘分析</h1>
          <p className="page-subtitle">{currentSession.targetRole || '面试复盘'}</p>
        </div>
      </div>

      {/* 第一步：语音转文本 */}
      <div className="review-step card">
        <div className="step-header">
          <div className={`step-badge ${transcript ? 'done' : 'pending'}`}>
            {transcript ? '✓' : '1'}
          </div>
          <div>
            <h3 className="step-title">第一步：语音转文本</h3>
            <p className="step-desc">
              {transcript
                ? `转录完成，共 ${transcript.length} 字`
                : '使用本地 whisper.cpp 模型进行语音识别，完全免费无需联网'}
            </p>
          </div>
        </div>

        {/* 已有转录内容时展示 */}
        {transcript && (
          <div className="transcript-preview">
            <div className="transcript-preview-text">{transcript}</div>
          </div>
        )}

        {/* 无录音文件提示 */}
        {!audioFilePath && !transcript && (
          <div className="analyze-error">
            <span>⚠️ 当前记录没有录音文件，请先完成录音</span>
          </div>
        )}

        {/* 转录进度 */}
        {isTranscribing && (
          <div className="transcribe-progress">
            <div className="analyzing-spinner" style={{ width: 24, height: 24, borderWidth: 2 }}></div>
            <span>{transcribeProgress}</span>
          </div>
        )}

        {transcribeError && (
          <div className="analyze-error"><span>⚠️ {transcribeError}</span></div>
        )}

        {/* 转录按钮：有录音文件时显示 */}
        {audioFilePath && (
          <button
            className={`analyze-btn ${transcript ? 'btn-secondary-outline' : ''}`}
            onClick={handleTranscribe}
            disabled={isTranscribing}
          >
            {isTranscribing
              ? <><div className="btn-spinner"></div>转录中...</>
              : <><span className="analyze-btn-icon">🎤</span>{transcript ? '重新转录' : '开始语音转文本'}</>
            }
          </button>
        )}

        <p className="analyze-note">
          使用 Chrome/Edge 浏览器内置语音识别，无需配置
        </p>
      </div>

      {/* 第二步：AI 深度分析 */}
      <div className="review-step card">
        <div className="step-header">
          <div className="step-badge pending">2</div>
          <div>
            <h3 className="step-title">第二步：AI 深度分析</h3>
            <p className="step-desc">
              基于转录文本，AI 将分析你的面试表现，生成评分、亮点和改进建议
            </p>
          </div>
        </div>

        {analyzeError && (
          <div className="analyze-error"><span>⚠️ {analyzeError}</span></div>
        )}

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !transcript}
          title={!transcript ? '请先完成第一步语音转文本' : ''}
        >
          <span className="analyze-btn-icon">✨</span>
          开始 AI 深度分析
        </button>

        {!transcript && (
          <p className="analyze-note" style={{ color: 'var(--danger)' }}>
            请先完成第一步的语音转文本
          </p>
        )}
        <p className="analyze-note">
          使用在设置中配置的 AI 服务（推荐 DeepSeek）
        </p>
      </div>
    </div>
  )
}
