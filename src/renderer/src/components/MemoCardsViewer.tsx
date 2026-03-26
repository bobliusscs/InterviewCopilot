import React, { useState } from 'react'
import { MemoCard } from '@shared/types'
import './MemoCards.css'

interface MemoCardsViewerProps {
  title: string
  position: string
  cards: MemoCard[]
  onExport?: (format: 'docx') => void
  onClose?: () => void
}

export default function MemoCardsViewer({
  title,
  position,
  cards,
  onExport,
  onClose,
}: MemoCardsViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const currentCard = cards[selectedIndex]

  const handleExport = () => {
    if (onExport) {
      onExport('docx')
    }
  }

  return (
    <div className="memo-cards-viewer">
      {/* 头部 */}
      <div className="viewer-header">
        <div className="header-title">
          <h2>{title}</h2>
          <p className="header-subtitle">{position}</p>
        </div>
        <div className="header-actions">
          <button className="btn-export" onClick={handleExport}>
            📥 导出 Word
          </button>
          {onClose && (
            <button className="btn-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 主体 */}
      <div className="viewer-body">
        {/* 题目导航 */}
        <div className="questions-nav">
          <div className="nav-header">
            <span className="nav-title">题目列表</span>
            <span className="nav-count">{selectedIndex + 1} / {cards.length}</span>
          </div>
          <div className="questions-list">
            {cards.map((card, idx) => (
              <button
                key={card.id}
                className={`question-item ${idx === selectedIndex ? 'active' : ''}`}
                onClick={() => setSelectedIndex(idx)}
              >
                <span className="question-num">Q{idx + 1}</span>
                <span className="question-preview">{card.question.substring(0, 40)}...</span>
              </button>
            ))}
          </div>
        </div>

        {/* 题目详情 */}
        <div className="question-detail">
          <div className="detail-header">
            <h3 className="detail-title">
              <span className="q-number">Q{selectedIndex + 1}</span>
              {currentCard.question}
            </h3>
          </div>

          {/* 关键要点 */}
          {currentCard.keywords && currentCard.keywords.length > 0 && (
            <div className="detail-section">
              <h4 className="section-title">💡 关键要点</h4>
              <div className="keywords-grid">
                {currentCard.keywords.map((kw, idx) => (
                  <div key={idx} className="keyword-tag">
                    {kw}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 参考答案 */}
          {currentCard.tips && currentCard.tips.length > 0 && (
            <div className="detail-section">
              <h4 className="section-title">📖 参考答案</h4>
              <div className="answer-box">
                {currentCard.tips[0]}
              </div>
            </div>
          )}

          {/* STAR 框架 */}
          {currentCard.starFramework && (
            <div className="detail-section">
              <h4 className="section-title">⭐ STAR 框架</h4>
              <div className="star-grid">
                {currentCard.starFramework.situation && (
                  <div className="star-item">
                    <span className="star-label">情景 (S)</span>
                    <p>{currentCard.starFramework.situation}</p>
                  </div>
                )}
                {currentCard.starFramework.task && (
                  <div className="star-item">
                    <span className="star-label">任务 (T)</span>
                    <p>{currentCard.starFramework.task}</p>
                  </div>
                )}
                {currentCard.starFramework.action && (
                  <div className="star-item">
                    <span className="star-label">行动 (A)</span>
                    <p>{currentCard.starFramework.action}</p>
                  </div>
                )}
                {currentCard.starFramework.result && (
                  <div className="star-item">
                    <span className="star-label">结果 (R)</span>
                    <p>{currentCard.starFramework.result}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 导航按钮 */}
          <div className="detail-nav">
            <button
              className="btn-nav"
              onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0}
            >
              ← 上一题
            </button>
            <button
              className="btn-nav"
              onClick={() => setSelectedIndex(Math.min(cards.length - 1, selectedIndex + 1))}
              disabled={selectedIndex === cards.length - 1}
            >
              下一题 →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
