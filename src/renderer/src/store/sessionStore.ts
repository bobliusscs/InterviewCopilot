// src/renderer/src/store/sessionStore.ts

import { create } from 'zustand'
import { InterviewSession } from '@shared/types'

interface SessionState {
  currentSession: InterviewSession | null
  sessions: InterviewSession[]

  setCurrentSession: (session: InterviewSession | null) => void
  setSessions: (sessions: InterviewSession[]) => void
  addSession: (session: InterviewSession) => void
  updateSession: (session: InterviewSession) => void
  deleteSession: (id: string) => void
  loadSessions: () => Promise<void>
  saveSession: (session: InterviewSession) => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  sessions: [],

  setCurrentSession: (session) => set({ currentSession: session }),

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) => {
    set((state) => ({
      sessions: [...state.sessions, session],
      currentSession: session,
    }))
    // 持久化到主进程 store
    get().saveSession(session)
  },

  updateSession: (session) => {
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === session.id ? session : s)),
      currentSession: state.currentSession?.id === session.id ? session : state.currentSession,
    }))
    // 持久化到主进程 store
    get().saveSession(session)
  },

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSession: state.currentSession?.id === id ? null : state.currentSession,
    }))
    // 从主进程 store 删除
    window.electronAPI?.store?.deleteSession?.(id)
  },

  // 从主进程 store 加载会话
  loadSessions: async () => {
    try {
      const sessions = await window.electronAPI?.store?.getSessions?.()
      if (sessions) {
        set({ sessions })
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  },

  // 保存会话到主进程 store
  saveSession: async (session: InterviewSession) => {
    try {
      await window.electronAPI?.store?.saveSession?.(session)
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  },
}))
