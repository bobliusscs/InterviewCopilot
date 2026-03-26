import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../../store/sessionStore'
import './History.css'

export default function History() {
  const navigate = useNavigate()
  const { sessions, loadSessions, deleteSession } = useSessionStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleSelectSession = (sessionId: string) => {
    navigate(`/session/${sessionId}`)
  }

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm('确定要删除这条记录吗？此操作不可撤销。')) {
      deleteSession(sessionId)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const hasQuestions = (session: any) => session.memoCards && session.memoCards.length > 0
  const hasRecording = (session: any) => session.transcript || session.duration
  const hasAnalysis = (session: any) => session.report

  return (
    <div className="page-container history-page">
      <div className="page-header">
        <span className="page-icon">📚</span>
        <div>
          <h1 className="page-title">面试记录</h1>
          <p className="page-subtitle">查看和管理你的所有面试准备记录</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="total-empty-state card">
          <div className="empty-icon">📭</div>
          <h3>暂无记录</h3>
          <p>在面试准备页面生成题目或录制面试后，所有记录将自动保存在这里</p>
        </div>
      ) : (
        <div className="records-grid">
          {sessions.map((session) => (
            <div key={session.id} className="record-card card">
              <div className="card-header">
                <div className="card-title-section">
                  <h3 className="card-title">{session.targetRole || '面试准备'}</h3>
                  <p className="card-date">📅 {formatDate(session.createdAt)}</p>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteSession(session.id)}
                  title="删除记录"
                >
                  🗑️
                </button>
              </div>

              {/* 功能组件指示器 */}
              <div className="components-indicator">
                {hasQuestions(session) && (
                  <span className="component-badge" title="包含生成的题目">
                    📝 {session.memoCards!.length} 道题
                  </span>
                )}
                {hasRecording(session) && (
                  <span className="component-badge" title="包含录音和转录">
                    🎙️ {session.duration ? `${Math.floor(session.duration / 60)}分${session.duration % 60}秒` : '有转录'}
                  </span>
                )}
                {hasAnalysis(session) && (
                  <span className="component-badge highlight" title="包含复盘分析">
                    📊 {session.report!.overallScore}分
                  </span>
                )}
              </div>

              {/* 岗位描述预览 */}
              {session.jobDescription && (
                <p className="card-desc">
                  {session.jobDescription.substring(0, 100)}...
                </p>
              )}

              {/* 操作按钮 */}
              <button
                className="btn-view"
                onClick={() => handleSelectSession(session.id)}
              >
                👁️ 查看详情
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

