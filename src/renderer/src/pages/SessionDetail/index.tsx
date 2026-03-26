import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../../store/sessionStore'
import MemoCardsViewer from '../../components/MemoCardsViewer'
import { exportToDocx } from '../../utils/exportCards'
import './SessionDetail.css'

export default function SessionDetail() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { sessions } = useSessionStore()
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'questions' | 'recording' | 'analysis'>('questions')

  const session = sessions.find(s => s.id === sessionId)

  if (!session) {
    return (
      <div className="page-container">
        <div className="empty-state card">
          <div className="empty-icon">❌</div>
          <h2>记录不存在</h2>
          <p>无法找到该面试记录</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/history')}
            style={{ marginTop: '16px' }}
          >
            ← 返回历史记录
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  const handleExport = async (format: 'docx') => {
    if (!session.memoCards || session.memoCards.length === 0) return

    setIsExporting(true)
    try {
      const params = {
        position: session.targetRole || '面试准备',
        jobDescription: session.jobDescription || '',
        cards: session.memoCards,
        createdAt: session.createdAt,
      }
      await exportToDocx(params)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }

  const hasQuestions = session.memoCards && session.memoCards.length > 0
  const hasRecording = session.transcript || session.duration
  const hasAnalysis = session.report

  return (
    <div className="session-detail-page">
      {/* 返回按钮和基本信息 */}
      <div className="detail-header">
        <button
          className="btn-back"
          onClick={() => navigate('/history')}
        >
          ← 返回
        </button>
        <div className="header-content">
          <h1>{session.targetRole || '面试准备'}</h1>
          <p className="meta-text">📅 {formatDate(session.createdAt)}</p>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="tabs-container">
        <div className="tabs-nav">
          {hasQuestions && (
            <button
              className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              📝 生成题目 ({session.memoCards!.length})
            </button>
          )}
          {hasRecording && (
            <button
              className={`tab-button ${activeTab === 'recording' ? 'active' : ''}`}
              onClick={() => setActiveTab('recording')}
            >
              🎙️ 录音转录
            </button>
          )}
          {hasAnalysis && (
            <button
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              📊 复盘分析
            </button>
          )}
        </div>
      </div>

      <div className="detail-wrapper">
        {/* 主内容区域 */}
        <div className="detail-main">
          {/* 生成题目标签页 */}
          {activeTab === 'questions' && hasQuestions && (
            <div className="tab-content">
              <MemoCardsViewer
                title={session.targetRole || '面试题目'}
                position={session.targetRole || ''}
                cards={session.memoCards!}
                onExport={handleExport}
                onClose={undefined}
              />
            </div>
          )}

          {/* 录音转录标签页 */}
          {activeTab === 'recording' && hasRecording && (
            <div className="tab-content">
              <div className="content-card">
                <h2>录音与转录</h2>

                {session.duration && (
                  <div className="info-section">
                    <label>录音时长</label>
                    <p className="info-value">
                      {Math.floor(session.duration / 60)}分{session.duration % 60}秒
                    </p>
                  </div>
                )}

                {session.transcript && (
                  <div className="info-section">
                    <label>转录内容</label>
                    <div className="transcript-box">
                      {session.transcript}
                    </div>
                  </div>
                )}

                {!session.transcript && !session.duration && (
                  <div className="empty-section">
                    <p>暂无录音和转录内容</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 复盘分析标签页 */}
          {activeTab === 'analysis' && hasAnalysis && (
            <div className="tab-content">
              <div className="content-card">
                <h2>复盘分析报告</h2>

                <div className="score-section">
                  <div className="score-display">
                    <span className="score-number">{session.report!.overallScore}</span>
                    <span className="score-text">总体评分</span>
                  </div>
                </div>

                <div className="info-section">
                  <label>评分概述</label>
                  <p className="info-text">{session.report!.summary}</p>
                </div>

                {session.report!.strengths && session.report!.strengths.length > 0 && (
                  <div className="info-section">
                    <label>优势</label>
                    <ul className="list-items">
                      {session.report!.strengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.report!.improvements && session.report!.improvements.length > 0 && (
                  <div className="info-section">
                    <label>改进方向</label>
                    <div className="improvements-list">
                      {session.report!.improvements.map((item, idx) => (
                        <div key={idx} className="improvement-item">
                          <div className="improvement-aspect">{item.aspect}</div>
                          <p className="improvement-detail">{item.detail}</p>
                          <p className="improvement-suggestion">💡 建议：{item.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {session.report!.prepSuggestions && session.report!.prepSuggestions.length > 0 && (
                  <div className="info-section">
                    <label>后续准备建议</label>
                    <ul className="list-items">
                      {session.report!.prepSuggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 没有该部分的提示 */}
          {!hasQuestions && activeTab === 'questions' && (
            <div className="empty-section-card">
              <p>暂无生成的题目</p>
            </div>
          )}
          {!hasRecording && activeTab === 'recording' && (
            <div className="empty-section-card">
              <p>暂无录音和转录</p>
            </div>
          )}
          {!hasAnalysis && activeTab === 'analysis' && (
            <div className="empty-section-card">
              <p>暂无复盘分析</p>
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="detail-sidebar">
          <div className="info-card card">
            <h3>基本信息</h3>

            {session.targetRole && (
              <div className="info-item">
                <span className="info-label">目标岗位</span>
                <span className="info-value">{session.targetRole}</span>
              </div>
            )}

            {hasQuestions && (
              <div className="info-item">
                <span className="info-label">题目数量</span>
                <span className="info-value">{session.memoCards!.length} 道</span>
              </div>
            )}

            {session.duration && (
              <div className="info-item">
                <span className="info-label">录音时长</span>
                <span className="info-value">
                  {Math.floor(session.duration / 60)}分{session.duration % 60}秒
                </span>
              </div>
            )}

            {hasAnalysis && (
              <div className="info-item">
                <span className="info-label">评分</span>
                <span className="score-badge">{session.report!.overallScore}分</span>
              </div>
            )}

            <div className="info-item">
              <span className="info-label">状态</span>
              <span className={`status-badge status-${session.status}`}>
                {session.status === 'done' && '✓ 完成'}
                {session.status === 'recording' && '● 录音中'}
                {session.status === 'transcribing' && '⟳ 转录中'}
                {session.status === 'analyzing' && '⟳ 分析中'}
                {session.status === 'error' && '✗ 错误'}
              </span>
            </div>
          </div>

          {/* 岗位描述 */}
          {session.jobDescription && (
            <div className="desc-card card">
              <h3>岗位描述</h3>
              <p className="desc-text">{session.jobDescription}</p>
            </div>
          )}

          {/* 导出按钮 */}
          {hasQuestions && (
            <div className="actions-card card">
              <button
                className="btn-export"
                onClick={() => handleExport('docx')}
                disabled={isExporting}
              >
                {isExporting ? '导出中...' : '📥 导出为 Word'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
