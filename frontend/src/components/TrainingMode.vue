<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- Quiz Panel -->
    <div class="bg-gray-900 rounded-xl p-4">
      <div v-if="store.useLearningPath && store.currentStage" class="mb-4 p-3 bg-gray-800 rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <span class="text-amber-400 font-bold">阶段 {{ store.currentStage.id }}: {{ store.currentStage.name }}</span>
          <span class="text-sm text-gray-400">目标: {{ store.currentStage.targetWpm }} WPM</span>
        </div>
        <div class="flex justify-between text-xs text-gray-400 mb-1">
          <span>进度: {{ currentProgress.correctCount }}/{{ store.currentStage.requiredCorrectCount }}</span>
          <span>正确率: {{ currentAccuracy }}%</span>
        </div>
        <div class="w-full bg-gray-900 rounded-full h-1.5">
          <div class="h-1.5 rounded-full bg-amber-500 transition-all"
            :style="{ width: Math.min(100, (currentProgress.correctCount / store.currentStage.requiredCorrectCount) * 100) + '%' }">
          </div>
        </div>
        <div v-if="store.checkStageCompletion()" class="mt-2 p-2 bg-green-900 rounded text-center">
          <span class="text-green-400 font-bold">🎉 阶段完成！下一阶段已解锁</span>
        </div>
      </div>
      <h3 class="text-amber-300 font-bold mb-3">听音/看码 猜字符</h3>
      <div v-if="!store.quizChar" class="text-center py-8">
        <button @click="store.generateQuiz()" class="bg-amber-500 text-black px-6 py-3 rounded-lg text-lg hover:bg-amber-400">
          开始训练
        </button>
      </div>
      <div v-else class="flex flex-col items-center gap-4">
        <div class="text-8xl font-bold text-amber-400">{{ store.quizChar }}</div>
        <button @click="store.playMorse(MORSE_TABLE[store.quizChar])" :disabled="store.isPlaying"
          class="bg-green-600 px-4 py-2 rounded hover:bg-green-500 disabled:opacity-50">
          {{ store.isPlaying ? '播放中...' : '🔊 播放音频' }}
        </button>
        <div class="text-2xl font-mono text-green-400">{{ MORSE_TABLE[store.quizChar] }}</div>
        <input v-model="store.userAnswer" @keyup.enter="store.checkAnswer()"
          class="bg-gray-800 rounded px-4 py-2 text-center text-xl w-48" placeholder="输入莫尔斯码" />
        <button @click="store.checkAnswer()" class="bg-amber-500 text-black px-6 py-2 rounded hover:bg-amber-400">
          确认
        </button>
      </div>
    </div>

    <!-- Score & History -->
    <div class="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
      <div class="flex justify-between items-center">
        <h3 class="text-amber-300 font-bold">训练统计</h3>
        <button @click="store.resetScore()" class="text-red-400 text-sm hover:underline">重置</button>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="bg-gray-800 rounded p-2">
          <div class="text-2xl font-bold text-green-400">{{ store.score.correct }}</div>
          <div class="text-xs text-gray-400">正确</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <div class="text-2xl font-bold text-red-400">{{ store.score.total - store.score.correct }}</div>
          <div class="text-xs text-gray-400">错误</div>
        </div>
        <div class="bg-gray-800 rounded p-2">
          <div class="text-2xl font-bold text-amber-400">
            {{ store.score.total ? Math.round(store.score.correct / store.score.total * 100) : 0 }}%
          </div>
          <div class="text-xs text-gray-400">正确率</div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto max-h-64">
        <div v-for="h in store.history.slice(0, 20)" :key="h.id"
          class="flex justify-between bg-gray-800 rounded p-2 mb-1 text-sm"
          :class="h.correct ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'">
          <span>{{ h.input }} → {{ h.output }}</span>
          <span>{{ h.correct ? '✓' : '✗' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMorseStore } from '../store/morse'
import { MORSE_TABLE } from '../utils/morse-code'

const store = useMorseStore()

const currentProgress = computed(() => {
  if (store.currentStageId === null) return { correctCount: 0, totalCount: 0 }
  return store.stageProgress[store.currentStageId] || { correctCount: 0, totalCount: 0 }
})

const currentAccuracy = computed(() => {
  if (store.currentStageId === null) return 0
  return store.getAccuracy(store.currentStageId)
})
</script>
