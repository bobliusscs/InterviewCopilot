// src/renderer/src/store/recordingStore.ts

import { create } from 'zustand'
import { RecordingStatus } from '@shared/types'

interface RecordingState {
  status: RecordingStatus
  duration: number
  filePath?: string
  transcriptText: string
  transcriptProgress: number

  setStatus: (status: RecordingStatus) => void
  setDuration: (duration: number) => void
  setFilePath: (filePath: string) => void
  setTranscriptText: (text: string) => void
  setTranscriptProgress: (progress: number) => void
  reset: () => void
}

export const useRecordingStore = create<RecordingState>((set) => ({
  status: 'idle',
  duration: 0,
  filePath: undefined,
  transcriptText: '',
  transcriptProgress: 0,

  setStatus: (status) => set({ status }),
  setDuration: (duration) => set({ duration }),
  setFilePath: (filePath) => set({ filePath }),
  setTranscriptText: (text) => set({ transcriptText: text }),
  setTranscriptProgress: (progress) => set({ transcriptProgress: progress }),
  reset: () =>
    set({
      status: 'idle',
      duration: 0,
      filePath: undefined,
      transcriptText: '',
      transcriptProgress: 0,
    }),
}))
