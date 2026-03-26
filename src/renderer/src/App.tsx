import React from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Preparation from './pages/Preparation'
import Recording from './pages/Recording'
import Review from './pages/Review'
import History from './pages/History'
import SessionDetail from './pages/SessionDetail'
import Settings from './pages/Settings'
import './App.css'

function Navigation() {
  const location = useLocation()

  const navItems = [
    { path: '/preparation', label: '面试准备', icon: '📝' },
    { path: '/recording', label: '录音控制', icon: '🎙️' },
    { path: '/review', label: '复盘分析', icon: '📊' },
    { path: '/history', label: '历史记录', icon: '📋' },
  ]

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <span className="logo-icon">🚀</span>
          <span>InterviewCopilot</span>
        </div>
        <div className="nav-links">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
          <a
            href="#/settings"
            className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
          >
            <span className="nav-icon">⚙️</span>
            <span>设置</span>
          </a>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="app-container">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/preparation" replace />} />
            <Route path="/preparation" element={<Preparation />} />
            <Route path="/recording" element={<Recording />} />
            <Route path="/review" element={<Review />} />
            <Route path="/history" element={<History />} />
            <Route path="/session/:sessionId" element={<SessionDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

