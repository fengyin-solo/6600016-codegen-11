export interface MorseSymbol {
  char: string
  code: string
}

export type TrainMode = 'charToCode' | 'codeToChar' | 'audioToChar' | 'typingToCode'

export interface HistoryEntry {
  id: number
  input: string
  output: string
  correct: boolean
  timestamp: number
}

export interface LearningStage {
  id: number
  name: string
  description: string
  chars: string[]
  targetWpm: number
  requiredAccuracy: number
  requiredCorrectCount: number
  unlocked: boolean
  completed: boolean
}

export interface StageProgress {
  stageId: number
  correctCount: number
  totalCount: number
  bestWpm: number
}
