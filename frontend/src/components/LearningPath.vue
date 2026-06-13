<template>
  <div class="flex flex-col gap-4">
    <div class="bg-gray-900 rounded-xl p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-amber-300 font-bold text-xl">🚀 学习路线</h3>
        <button @click="confirmReset" class="text-red-400 text-sm hover:underline">重置全部进度</button>
      </div>
      <p class="text-gray-400 text-sm mb-4">从入门到精通，按阶段解锁新字符，逐步提升速度目标</p>

      <div class="relative">
        <div class="absolute left-6 top-0 bottom-0 w-1 bg-gray-700"></div>
        <div class="flex flex-col gap-4">
          <div v-for="(stage, index) in store.learningStages" :key="stage.id" class="relative pl-16">
            <div class="absolute left-0 w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300"
              :class="getStageClass(stage)">
              <span class="text-lg font-bold">{{ getStageIcon(stage) }}</span>
            </div>

            <div class="bg-gray-800 rounded-xl p-4 transition-all duration-300 hover:bg-gray-750"
              :class="{ 'ring-2 ring-amber-500': store.currentStageId === stage.id, 'opacity-50': !stage.unlocked }">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="font-bold text-lg" :class="stage.completed ? 'text-green-400' : stage.unlocked ? 'text-amber-400' : 'text-gray-500'">
                    阶段 {{ stage.id }}: {{ stage.name }}
                  </h4>
                  <p class="text-gray-400 text-sm">{{ stage.description }}</p>
                </div>
                <div v-if="store.currentStageId === stage.id" class="bg-amber-500 text-black px-2 py-1 rounded text-xs font-bold">
                  训练中
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3 mb-3 text-sm">
                <div class="bg-gray-900 rounded p-2 text-center">
                  <div class="text-amber-400 font-bold">{{ stage.targetWpm }} WPM</div>
                  <div class="text-gray-500 text-xs">目标速度</div>
                </div>
                <div class="bg-gray-900 rounded p-2 text-center">
                  <div class="text-green-400 font-bold">{{ stage.requiredAccuracy }}%</div>
                  <div class="text-gray-500 text-xs">目标正确率</div>
                </div>
                <div class="bg-gray-900 rounded p-2 text-center">
                  <div class="text-blue-400 font-bold">{{ stage.requiredCorrectCount }}</div>
                  <div class="text-gray-500 text-xs">需正确次数</div>
                </div>
              </div>

              <div class="mb-3">
                <div class="text-gray-400 text-xs mb-1">解锁字符 ({{ stage.chars.length }}个)</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="char in stage.chars" :key="char"
                    class="bg-gray-900 px-2 py-0.5 rounded text-sm font-mono"
                    :class="getCharClass(char, stage)">
                    {{ char }}
                  </span>
                </div>
              </div>

              <div v-if="getProgress(stage.id).totalCount > 0" class="mb-3">
                <div class="flex justify-between text-xs text-gray-400 mb-1">
                  <span>进度: {{ getProgress(stage.id).correctCount }}/{{ stage.requiredCorrectCount }}</span>
                  <span>正确率: {{ store.getAccuracy(stage.id) }}%</span>
                </div>
                <div class="w-full bg-gray-900 rounded-full h-2">
                  <div class="h-2 rounded-full transition-all duration-300"
                    :class="stage.completed ? 'bg-green-500' : 'bg-amber-500'"
                    :style="{ width: Math.min(100, (getProgress(stage.id).correctCount / stage.requiredCorrectCount) * 100) + '%' }">
                  </div>
                </div>
              </div>

              <div class="flex gap-2">
                <button v-if="stage.unlocked && store.currentStageId !== stage.id"
                  @click="startStage(stage.id)"
                  class="flex-1 bg-amber-500 text-black py-2 rounded hover:bg-amber-400 font-medium transition-colors">
                  {{ getProgress(stage.id).totalCount > 0 ? '继续训练' : '开始训练' }}
                </button>
                <button v-if="store.currentStageId === stage.id"
                  @click="exitStage"
                  class="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-500 font-medium transition-colors">
                  退出此阶段
                </button>
                <button v-if="!stage.unlocked"
                  disabled
                  class="flex-1 bg-gray-700 text-gray-500 py-2 rounded cursor-not-allowed font-medium">
                  🔒 未解锁
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedStageForTraining" class="bg-gray-900 rounded-xl p-4">
      <h3 class="text-amber-300 font-bold mb-3">当前训练: {{ selectedStageForTraining.name }}</h3>
      <TrainingMode />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMorseStore } from '../store/morse'
import TrainingMode from './TrainingMode.vue'
import type { LearningStage } from '../types'

const store = useMorseStore()
const showResetConfirm = ref(false)

const selectedStageForTraining = computed(() => {
  if (store.currentStageId === null) return null
  return store.learningStages.find(s => s.id === store.currentStageId)
})

function getStageClass(stage: LearningStage) {
  if (stage.completed) return 'bg-green-500 text-black'
  if (stage.unlocked) return 'bg-amber-500 text-black'
  return 'bg-gray-700 text-gray-500'
}

function getStageIcon(stage: LearningStage) {
  if (stage.completed) return '✓'
  if (stage.unlocked) return stage.id
  return '🔒'
}

function getCharClass(char: string, stage: LearningStage) {
  if (stage.completed) return 'text-green-400'
  if (stage.unlocked) return 'text-amber-400'
  return 'text-gray-600'
}

function getProgress(stageId: number) {
  return store.stageProgress[stageId] || { correctCount: 0, totalCount: 0, bestWpm: 0 }
}

function startStage(stageId: number) {
  store.selectStage(stageId)
}

function exitStage() {
  store.exitLearningPath()
}

function confirmReset() {
  if (confirm('确定要重置所有学习进度吗？此操作不可恢复。')) {
    store.resetAllProgress()
  }
}
</script>
