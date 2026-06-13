import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { MORSE_TABLE, REVERSE_TABLE, textToMorse, morseToText } from '../utils/morse-code'
import type { TrainMode, HistoryEntry, LearningStage, StageProgress } from '../types'

const LEARNING_STAGES: Omit<LearningStage, 'unlocked' | 'completed'>[] = [
  {
    id: 1,
    name: '入门启蒙',
    description: '学习最基础的两个字符，感受莫尔斯码的节奏',
    chars: ['E', 'T'],
    targetWpm: 5,
    requiredAccuracy: 80,
    requiredCorrectCount: 10,
  },
  {
    id: 2,
    name: '字母入门',
    description: '掌握常用元音字母，开始简单组合',
    chars: ['E', 'T', 'I', 'A', 'N', 'M'],
    targetWpm: 8,
    requiredAccuracy: 80,
    requiredCorrectCount: 20,
  },
  {
    id: 3,
    name: '辅音进阶',
    description: '加入更多辅音字母，扩展字符库',
    chars: ['E', 'T', 'I', 'A', 'N', 'M', 'S', 'O', 'R', 'D', 'U', 'C'],
    targetWpm: 10,
    requiredAccuracy: 85,
    requiredCorrectCount: 30,
  },
  {
    id: 4,
    name: '完整字母',
    description: '掌握全部26个英文字母',
    chars: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    targetWpm: 12,
    requiredAccuracy: 85,
    requiredCorrectCount: 40,
  },
  {
    id: 5,
    name: '数字达人',
    description: '加入数字0-9，提升译码速度',
    chars: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    targetWpm: 15,
    requiredAccuracy: 90,
    requiredCorrectCount: 50,
  },
  {
    id: 6,
    name: '精通之路',
    description: '加入常用标点符号，挑战专业速度',
    chars: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ',', '?', '!', '/'],
    targetWpm: 20,
    requiredAccuracy: 90,
    requiredCorrectCount: 60,
  },
  {
    id: 7,
    name: '大师级',
    description: '完整字符集，挑战极速25WPM',
    chars: Object.keys(MORSE_TABLE).filter(c => c !== ' '),
    targetWpm: 25,
    requiredAccuracy: 95,
    requiredCorrectCount: 80,
  },
]

function loadProgress(): Record<number, StageProgress> {
  try {
    const saved = localStorage.getItem('morse-stage-progress')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export const useMorseStore = defineStore('morse', () => {
  const inputText = ref('')
  const morseOutput = ref('')
  const decodedText = ref('')
  const wpm = ref(15)
  const frequency = ref(700)
  const volume = ref(0.6)
  const trainMode = ref<TrainMode>('charToCode')
  const history = ref<HistoryEntry[]>([])
  const quizChar = ref('')
  const userAnswer = ref('')
  const score = ref({ correct: 0, total: 0 })
  const isPlaying = ref(false)
  let audioCtx: AudioContext | null = null
  let currentOscillator: OscillatorNode | null = null

  const learningStages = ref<LearningStage[]>([])
  const stageProgress = ref<Record<number, StageProgress>>(loadProgress())
  const currentStageId = ref<number | null>(null)
  const useLearningPath = ref(false)

  function isStageCompleted(stageId: number): boolean {
    const stage = LEARNING_STAGES.find(s => s.id === stageId)
    if (!stage) return false
    const progress = stageProgress.value[stageId]
    if (!progress) return false
    return progress.correctCount >= stage.requiredCorrectCount &&
           getAccuracy(stageId) >= stage.requiredAccuracy
  }

  function initStages() {
    learningStages.value = LEARNING_STAGES.map((stage, index) => {
      const completed = isStageCompleted(stage.id)
      const unlocked = index === 0 || isStageCompleted(LEARNING_STAGES[index - 1].id)
      return { ...stage, unlocked, completed }
    })
  }

  function getAccuracy(stageId: number): number {
    const p = stageProgress.value[stageId]
    if (!p || p.totalCount === 0) return 0
    return Math.round((p.correctCount / p.totalCount) * 100)
  }

  const currentStage = computed(() => {
    if (currentStageId.value === null) return null
    return learningStages.value.find(s => s.id === currentStageId.value) || null
  })

  const availableChars = computed(() => {
    if (useLearningPath.value && currentStage.value) {
      return currentStage.value.chars.join('')
    }
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  })

  watch(stageProgress, (val) => {
    localStorage.setItem('morse-stage-progress', JSON.stringify(val))
    initStages()
  }, { deep: true })

  function selectStage(stageId: number) {
    const stage = learningStages.value.find(s => s.id === stageId)
    if (stage && stage.unlocked) {
      currentStageId.value = stageId
      useLearningPath.value = true
      wpm.value = stage.targetWpm
      score.value = { correct: 0, total: 0 }
      history.value = []
    }
  }

  function exitLearningPath() {
    useLearningPath.value = false
    currentStageId.value = null
    score.value = { correct: 0, total: 0 }
    history.value = []
  }

  function updateStageProgress(correct: boolean) {
    if (!useLearningPath.value || currentStageId.value === null) return

    const stageId = currentStageId.value
    if (!stageProgress.value[stageId]) {
      stageProgress.value[stageId] = {
        stageId,
        correctCount: 0,
        totalCount: 0,
        bestWpm: 0,
      }
    }
    stageProgress.value[stageId].totalCount++
    if (correct) {
      stageProgress.value[stageId].correctCount++
      if (wpm.value > stageProgress.value[stageId].bestWpm) {
        stageProgress.value[stageId].bestWpm = wpm.value
      }
    }
    stageProgress.value = { ...stageProgress.value }
  }

  function checkStageCompletion(): boolean {
    if (!useLearningPath.value || currentStageId.value === null) return false
    const stage = currentStage.value
    if (!stage) return false

    const progress = stageProgress.value[stage.id]
    if (!progress) return false

    const accuracy = getAccuracy(stage.id)
    return progress.correctCount >= stage.requiredCorrectCount && accuracy >= stage.requiredAccuracy
  }

  function unlockNextStage() {
    if (!currentStage.value) return
    const nextStage = learningStages.value.find(s => s.id === currentStage.value!.id + 1)
    if (nextStage) {
      nextStage.unlocked = true
    }
  }

  function resetAllProgress() {
    stageProgress.value = {}
    localStorage.removeItem('morse-stage-progress')
    initStages()
  }

  const dotDuration = computed(() => 1200 / wpm.value)

  function getAudioCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  }

  function playTone(duration: number): Promise<void> {
    return new Promise(resolve => {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency.value
      gain.gain.value = volume.value
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      currentOscillator = osc
      setTimeout(() => { osc.stop(); currentOscillator = null; resolve() }, duration)
    })
  }

  async function playMorse(morse: string) {
    isPlaying.value = true
    const dd = dotDuration.value
    for (const token of morse.split(' ')) {
      if (token === '/') { await sleep(dd * 7); continue }
      for (const sym of token) {
        await playTone(sym === '.' ? dd : dd * 3)
        await sleep(dd)
      }
      await sleep(dd * 2)
    }
    isPlaying.value = false
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  function encode() {
    morseOutput.value = textToMorse(inputText.value)
  }

  function decode() {
    decodedText.value = morseToText(inputText.value)
  }

  function generateQuiz() {
    const chars = availableChars.value
    quizChar.value = chars[Math.floor(Math.random() * chars.length)]
    userAnswer.value = ''
  }

  function checkAnswer() {
    const correct = userAnswer.value.trim() === MORSE_TABLE[quizChar.value]
    score.value.total++
    if (correct) score.value.correct++
    history.value.unshift({
      id: Date.now(), input: quizChar.value, output: userAnswer.value,
      correct, timestamp: Date.now()
    })
    updateStageProgress(correct)
    if (checkStageCompletion()) {
      unlockNextStage()
    }
    generateQuiz()
  }

  function resetScore() {
    score.value = { correct: 0, total: 0 }
    history.value = []
  }

  initStages()

  return {
    inputText, morseOutput, decodedText, wpm, frequency, volume,
    trainMode, history, quizChar, userAnswer, score, isPlaying,
    learningStages, stageProgress, currentStageId, useLearningPath,
    currentStage, availableChars,
    dotDuration, encode, decode, playMorse, playTone,
    generateQuiz, checkAnswer, resetScore, initStages,
    selectStage, exitLearningPath, getAccuracy,
    checkStageCompletion, resetAllProgress
  }
})
