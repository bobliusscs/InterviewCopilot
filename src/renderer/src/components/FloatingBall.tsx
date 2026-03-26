import React, { useEffect, useState } from 'react'
import { useRecordingStore } from '../../store/recordingStore'
import './FloatingBall.css'

interface FloatingBallProps {
  isRecording: boolean
  isPaused: boolean
  duration: number
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export const FloatingBall: React.FC<FloatingBallProps> = ({
  isRecording,
  isPaused,
  duration,
  onPause,
  onResume,
  onStop,
}) => {
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [windowFocused, setWindowFocused] = useState(true)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 录音停止时重置最小化状态
  useEffect(() => {
    if (!isRecording) {
      setIsMinimized(false)
      // 重置位置
      setPosition({ x: window.innerWidth - 100, y: 100 })
    }
  }, [isRecording])
  useEffect(() => {
    const checkWindowFocus = async () => {
      try {
        const focused = await (window as any).electronAPI?.app?.isWindowFocused?.()
        setWindowFocused(focused ?? true)
      } catch (err) {
        console.error('Failed to check window focus:', err)
      }
    }

    // 初始检查
    checkWindowFocus()

    // 定期检查窗口焦点（300ms）
    const interval = setInterval(checkWindowFocus, 300)

    return () => clearInterval(interval)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.ball-controls')) return
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // 仅在录音且窗口未获得焦点时显示
  if (!isRecording || windowFocused) return null

  return (
    <div
      className="floating-ball"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onMouseDown={handleMouseDown}
    >
      {!isMinimized ? (
        <div className="ball-content">
          <div className="ball-header">
            <span className="ball-title">🎙️ 录音中</span>
            <button
              className="ball-close"
              onClick={() => setIsMinimized(true)}
              title="最小化"
            >
              −
            </button>
          </div>

          <div className="ball-time">
            <span>{formatTime(duration)}</span>
            {isPaused && <span className="ball-status">已暂停</span>}
          </div>

          <div className="ball-controls">
            {!isPaused ? (
              <button
                className="ball-btn ball-pause"
                onClick={onPause}
                title="暂停"
              >
                ⏸
              </button>
            ) : (
              <button
                className="ball-btn ball-resume"
                onClick={onResume}
                title="继续"
              >
                ▶
              </button>
            )}
            <button
              className="ball-btn ball-stop"
              onClick={onStop}
              title="停止"
            >
              ⏹
            </button>
          </div>
        </div>
      ) : (
        <div className="ball-minimized">
          <div className="ball-indicator">●</div>
          <span className="ball-time-mini">{formatTime(duration)}</span>
          <button
            className="ball-expand"
            onClick={() => setIsMinimized(false)}
            title="展开"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
