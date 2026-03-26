import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRecordingStore } from '../../store/recordingStore'
import { useSessionStore } from '../../store/sessionStore'
import './Recording.css'

export default function Recording() {
  const { status, duration, filePath } = useRecordingStore()
  const { currentSession, sessions } = useSessionStore()
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showSessionSelector, setShowSessionSelector] = useState(false)
  const [selectedSession, setSelectedSession] = useState<string | null>(
    currentSession?.id || null
  )

  // 播放器相关
  const [audioDataUrl, setAudioDataUrl] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playProgress, setPlayProgress] = useState(0)
  const [playCurrentTime, setPlayCurrentTime] = useState(0)
  const [playDuration, setPlayDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 波形动画相关
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isActiveRef = useRef(false) // 控制动画是否应该继续

  // 真正负责录制音频数据的 MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // 语音识别已移除（Electron 环境不支持 Web Speech API）
  // 转录在复盘分析页面通过 Whisper API 完成
  const transcriptRef = useRef<string>('')
  const [liveTranscript, setLiveTranscript] = useState<string>('')

  // 录音完成时加载音频
  useEffect(() => {
    const loadAudio = async () => {
      if (status !== 'done' || !filePath) {
        setAudioDataUrl('')
        return
      }

      try {
        const result = await window.electronAPI?.file?.readFile?.(filePath)
        if (result?.success && result?.data) {
          const dataUrl = `data:audio/webm;base64,${result.data}`
          setAudioDataUrl(dataUrl)
          console.log('Audio data URL created')
        }
      } catch (error) {
        console.error('Failed to load audio:', error)
      }
    }

    loadAudio()
  }, [status, filePath])

  // 绘制波形到 canvas（时域波形，说话有波动，静音是平线）
  const drawWaveform = useCallback((dataArray: Uint8Array, active: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    // 绘制中心基线
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()

    if (!active) {
      // 暂停或停止：只绘制平线
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()
      return
    }

    const bufferLength = dataArray.length
    const sliceWidth = width / bufferLength

    // 上方波形（蓝色）
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)'
    ctx.lineWidth = 2.5
    ctx.beginPath()

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0 // 时域数据，128 = 静音中心
      const y = height / 2 - (v - 1) * (height / 2.2)
      const x = i * sliceWidth
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // 下方镜像（绿色，透明度低）
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = height / 2 + (v - 1) * (height / 2.2)
      const x = i * sliceWidth
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // 填充区域（中间渐变）
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.12)')
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.04)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.08)')
    ctx.fillStyle = gradient
    ctx.beginPath()

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = height / 2 - (v - 1) * (height / 2.2)
      const x = i * sliceWidth
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let i = bufferLength - 1; i >= 0; i--) {
      const v = dataArray[i] / 128.0
      const y = height / 2 + (v - 1) * (height / 2.2)
      const x = i * sliceWidth
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }, [])

  // 初始化音频上下文用于波形显示，同时启动 MediaRecorder 向主进程发送音频数据
  const initAudioContext = useCallback(async (isResume = false) => {
    try {
      // 恢复时复用已有流，避免重新申请权限导致录音断续
      let stream = mediaStreamRef.current
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream
      }

      // ── 波形可视化 ──────────────────────────────────
      // 如果已经有 AudioContext，直接复用，不需要重建
      if (!audioContextRef.current) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        audioContextRef.current = audioContext
        analyserRef.current = analyser
      }

      isActiveRef.current = true
      const analyser = analyserRef.current!
      const dataArray = new Uint8Array(analyser.fftSize)
      const animate = () => {
        if (!isActiveRef.current) return
        analyser.getByteTimeDomainData(dataArray)
        drawWaveform(dataArray, true)
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      animate()

      // ── MediaRecorder（真正录音） ────────────────────
      if (!isResume) {
        // 首次开始：创建新的 MediaRecorder
        // 优先使用 webm/opus，回退到浏览器默认格式
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            e.data.arrayBuffer().then((buf) => {
              window.electronAPI.audio.sendChunk(buf)
            })
          }
        }

        // 每 250ms 触发一次 ondataavailable，保证数据持续写入
        recorder.start(250)
        mediaRecorderRef.current = recorder
        console.log('[Recording] MediaRecorder started, mimeType:', recorder.mimeType)
      } else {
        // 恢复录音：直接 resume MediaRecorder
        if (mediaRecorderRef.current?.state === 'paused') {
          mediaRecorderRef.current.resume()
          console.log('[Recording] MediaRecorder resumed')
        }
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
      throw error
    }
  }, [drawWaveform])

  // 停止波形动画；clear=true 时同时停止 MediaRecorder 和释放麦克风
  const stopWaveform = useCallback((clear = false) => {
    isActiveRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (clear) {
      // 停止 MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current = null
      }
      // 释放麦克风
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }
      // 关闭 AudioContext
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
        analyserRef.current = null
      }
      // 清空 canvas
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
    } else {
      // 暂停时：暂停 MediaRecorder（保留流和 AudioContext，恢复时复用）
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.pause()
        console.log('[Recording] MediaRecorder paused')
      }
      // 绘制静态平线
      const emptyData = new Uint8Array(128).fill(128)
      drawWaveform(emptyData, false)
    }
  }, [drawWaveform])

  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // 空函数占位，避免修改调用处
  const startSpeechRecognition = useCallback(() => {}, [])
  const stopSpeechRecognition = useCallback(() => {}, [])

  // 持续更新时间显示
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isRecording && !isPaused) {
      timer = setInterval(() => {
        useRecordingStore.setState((state) => ({
          duration: state.duration + 1,
        }))
        window.electronAPI?.floatingBall?.updateTime?.(duration + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isRecording, isPaused, duration])

  // 音频播放器事件
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      setPlayCurrentTime(audio.currentTime)
      setPlayProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    const onLoadedMetadata = () => setPlayDuration(audio.duration || 0)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioDataUrl])

  // 监听浮球窗口的录音切换事件
  useEffect(() => {
    const unsubscribe = window.electronAPI?.recordingEvents?.onToggleRecording?.(async () => {
      if (!isRecording) {
        await handleStart()
      } else if (!isPaused) {
        await handlePause()
      } else {
        await handleResume()
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [isRecording, isPaused, selectedSession])

  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId)
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      useSessionStore.getState().setCurrentSession(session)
    }
    setShowSessionSelector(false)
  }

  const handleStart = async () => {
    if (!selectedSession) {
      alert('请先选择保存位置')
      return
    }

    try {
      // 重置上次的转录内容
      transcriptRef.current = ''
      setLiveTranscript('')

      await window.electronAPI.audio.start()
      useRecordingStore.getState().setStatus('recording')
      setIsRecording(true)
      setIsPaused(false)
      await initAudioContext() // 启动波形 + MediaRecorder
      startSpeechRecognition() // 启动语音识别
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('录音启动失败，请检查麦克风权限')
    }
  }

  const handlePause = async () => {
    try {
      await window.electronAPI.audio.pause()
      useRecordingStore.getState().setStatus('paused')
      setIsPaused(true)
      stopWaveform(false) // 暂停波形
      stopSpeechRecognition() // 暂停时停止识别，恢复时重启
    } catch (error) {
      console.error('Failed to pause recording:', error)
    }
  }

  const handleResume = async () => {
    try {
      await window.electronAPI.audio.resume()
      useRecordingStore.getState().setStatus('recording')
      setIsPaused(false)
      await initAudioContext(true) // 恢复波形 + MediaRecorder
      startSpeechRecognition()    // 重启语音识别
    } catch (error) {
      console.error('Failed to resume recording:', error)
    }
  }

  const handleStop = async () => {
    try {
      // 先停止 MediaRecorder，等待最后一个 chunk 发送完毕后再关闭主进程文件流
      await new Promise<void>((resolve) => {
        const recorder = mediaRecorderRef.current
        if (!recorder || recorder.state === 'inactive') {
          resolve()
          return
        }
        // ondataavailable 在 onstop 之前触发，但 arrayBuffer() 是异步的
        // 用一个小延迟确保所有 pending 的 sendChunk 都已发出
        recorder.onstop = () => setTimeout(resolve, 100)
        recorder.stop()
      })

      // 再通知主进程关闭文件写流
      const result = await window.electronAPI.audio.stop()
      useRecordingStore.getState().setStatus('done')
      useRecordingStore.getState().setFilePath(result.filePath)
      setIsRecording(false)
      setIsPaused(false)
      mediaRecorderRef.current = null

      // 停止波形动画和释放资源（不重复 stop MediaRecorder）
      isActiveRef.current = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
        analyserRef.current = null
      }
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }

      console.log('Recording saved to:', result.filePath)

      // 停止语音识别并获取最终转录文本
      stopSpeechRecognition()
      const finalTranscript = transcriptRef.current
      console.log('[SR] Final transcript length:', finalTranscript.length)

      // 保存录音到会话（含转录文本）
      const sessionToUpdate = useSessionStore.getState().currentSession
      if (sessionToUpdate) {
        const newRecording = {
          id: `recording_${Date.now()}`,
          audioFilePath: result.filePath,
          duration,
          transcript: finalTranscript,
          createdAt: Date.now(),
        }

        const existingRecordings = sessionToUpdate.recordings || []
        const updatedSession = {
          ...sessionToUpdate,
          audioFilePath: result.filePath,
          duration,
          // 将本段转录文本追加到 session 级 transcript（供 Claude 分析用）
          transcript: (sessionToUpdate.transcript || '') + (finalTranscript ? '\n\n' + finalTranscript : ''),
          recordings: [...existingRecordings, newRecording],
          status: 'done' as const,
        }
        useSessionStore.getState().updateSession(updatedSession)

        // 同步到 electron-store，供 Claude 分析时读取
        try {
          await window.electronAPI.store.saveSession(updatedSession)
          console.log('[Store] Session synced to electron-store')
        } catch (e) {
          console.error('[Store] Failed to sync session:', e)
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      useRecordingStore.getState().setStatus('error')
      alert('录音停止失败')
    }
  }

  const handleDeleteRecording = async () => {
    if (!confirm('确定要删除此段录音吗？此操作不可撤销。')) {
      return
    }

    try {
      const currentFilePath = useRecordingStore.getState().filePath
      if (currentFilePath) {
        await window.electronAPI?.file?.deleteFile?.(currentFilePath)
      }

      useRecordingStore.getState().setFilePath('')
      useRecordingStore.getState().setDuration(0)
      useRecordingStore.getState().setStatus('idle')
      setIsRecording(false)
      setIsPaused(false)
      setAudioDataUrl('')
      setIsPlaying(false)

      const currentSession = useSessionStore.getState().currentSession
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          audioFilePath: undefined,
          duration: undefined,
        }
        useSessionStore.getState().updateSession(updatedSession)
      }

      alert('录音已删除，可以重新开始录音')
    } catch (error) {
      console.error('Failed to delete recording:', error)
      alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const handleReset = () => {
    useRecordingStore.getState().setStatus('idle')
    useRecordingStore.getState().setDuration(0)
    setIsRecording(false)
    setIsPaused(false)
    setAudioDataUrl('')
    setIsPlaying(false)
  }

  const handlePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = parseFloat(e.target.value)
    audio.currentTime = newTime
    setPlayCurrentTime(newTime)
    setPlayProgress(audio.duration ? newTime / audio.duration : 0)
  }

  const formatPlayTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`
  }

  const getStatusText = () => {
    switch (status) {
      case 'recording':
        return '正在录音中...'
      case 'paused':
        return '录音已暂停'
      case 'done':
        return '录音已完成'
      default:
        return '准备就绪'
    }
  }

  const getSelectedSessionInfo = () => {
    if (!selectedSession) return null
    return sessions.find((s) => s.id === selectedSession)
  }

  const selectedInfo = getSelectedSessionInfo()

  return (
    <div className="page-container">
      <div className="page-header">
        <span className="page-icon">🎙️</span>
        <div>
          <h1 className="page-title">录音控制</h1>
          <p className="page-subtitle">选择保存位置后开始录音</p>
        </div>
      </div>

      <div className="recording-container">
        <div className="recording-control card">

          {/* 保存位置选择 */}
          <div className="session-selector-section">
            <div className="selector-header">
              <span className="selector-label">📁 保存位置</span>
              <button
                className="selector-toggle-btn"
                onClick={() => setShowSessionSelector(!showSessionSelector)}
                disabled={isRecording}
              >
                {showSessionSelector ? '关闭' : '选择'}
              </button>
            </div>

            {selectedInfo && (
              <div className="selector-selected">
                <div className="selected-title">{selectedInfo.targetRole || '面试准备'}</div>
                <div className="selected-meta">
                  📅 {new Date(selectedInfo.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            )}

            {showSessionSelector && (
              <div className="selector-dropdown">
                {sessions.length === 0 ? (
                  <div className="selector-empty">
                    <p>暂无可选的面试记录</p>
                    <p className="selector-hint">请先在面试准备中生成题目</p>
                  </div>
                ) : (
                  <div className="selector-list">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        className={`selector-item ${selectedSession === session.id ? 'active' : ''}`}
                        onClick={() => handleSelectSession(session.id)}
                      >
                        <div className="selector-item-title">
                          {session.targetRole || '面试准备'}
                        </div>
                        <div className="selector-item-meta">
                          📅 {new Date(session.createdAt).toLocaleString('zh-CN')}
                          {session.memoCards && (
                            <span>📝 {session.memoCards.length}道题</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedSession && (
              <div className="selector-hint-box">
                <p>⚠️ 请选择一个面试记录作为保存位置</p>
              </div>
            )}
          </div>

          {/* 状态指示 */}
          <div className={`status-indicator ${status === 'recording' ? 'recording' : status === 'paused' ? 'paused' : ''}`}>
            <div className="status-dot"></div>
            <span className="status-text">{getStatusText()}</span>
          </div>

          {/* 时间显示 */}
          <div className="time-display">
            <div className="time-number">{formatTime(duration)}</div>
            <div className="time-label">已录制时间</div>
          </div>

          {/* 波形可视化 - 录音中或暂停时显示 */}
          {(isRecording || isPaused) && (
            <div className="waveform-container">
              <canvas
                ref={canvasRef}
                width={500}
                height={100}
                className="waveform-canvas"
              />
              {isPaused && (
                <div className="waveform-paused-hint">已暂停</div>
              )}
            </div>
          )}

          {/* 实时转录预览 - 录音中显示 */}
          {isRecording && (
            <div className="live-transcript-box">
              <div className="live-transcript-label">
                <span className="live-dot"></span>实时转录
              </div>
              <div className="live-transcript-text">
                {liveTranscript || '等待语音输入...'}
              </div>
            </div>
          )}

          {/* 控制按钮 */}
          <div className="recording-buttons">
            {!isRecording ? (
              <button
                onClick={handleStart}
                className="btn-record recording-btn"
                disabled={!selectedSession || status === 'done'}
              >
                <span className="btn-icon">●</span>
                开始录音
              </button>
            ) : (
              <>
                <button
                  onClick={isPaused ? handleResume : handlePause}
                  className={`btn-pause-resume recording-btn ${isPaused ? 'resume' : ''}`}
                >
                  <span className="btn-icon">{isPaused ? '▶' : '⏸'}</span>
                  {isPaused ? '继续' : '暂停'}
                </button>
                <button
                  onClick={handleStop}
                  className="btn-stop recording-btn"
                >
                  <span className="btn-icon">⏹</span>
                  结束
                </button>
              </>
            )}
          </div>

          {/* 录音完成后：自定义播放器 + 操作按钮 */}
          {!isRecording && status === 'done' && filePath && (
            <div className="recording-complete-card">
              <div className="complete-header">
                <span className="complete-check">✓ 录音已保存</span>
                <span className="file-name">📁 {filePath.split('/').pop()}</span>
              </div>

              {/* 隐藏的原生 audio 元素 */}
              {audioDataUrl && (
                <audio
                  ref={audioRef}
                  src={audioDataUrl}
                  preload="metadata"
                  style={{ display: 'none' }}
                />
              )}

              {/* 自定义播放控件 */}
              <div className="custom-player">
                <button
                  className={`player-play-btn ${isPlaying ? 'playing' : ''}`}
                  onClick={handlePlayPause}
                  disabled={!audioDataUrl}
                  title={isPlaying ? '暂停' : '播放'}
                >
                  <span>{isPlaying ? '⏸' : '▶'}</span>
                </button>

                <div className="player-progress-wrap">
                  <input
                    type="range"
                    className="player-seek"
                    min={0}
                    max={playDuration || 0}
                    step={0.1}
                    value={playCurrentTime}
                    onChange={handleSeek}
                    disabled={!audioDataUrl}
                  />
                  <div className="player-time">
                    <span>{formatPlayTime(playCurrentTime)}</span>
                    <span>{formatPlayTime(playDuration)}</span>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="complete-actions">
                <button onClick={handleReset} className="action-btn btn-new">
                  + 新建录音
                </button>
                <button onClick={handleDeleteRecording} className="action-btn btn-del">
                  🗑️ 删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
