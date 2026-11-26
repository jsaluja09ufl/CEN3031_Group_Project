import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  PLANT_STAGES,
  getDefaultPlantState,
  getPlantState,
  savePlantState,
  recordTaskCompletion,
  waterPlant,
  plantNewSeed
} from '../src/utils/plantState.js'
import { api } from '../src/api/client.js'

// Simple mock for localStorage in Node environment
const mockStorage = {}
globalThis.window = {
  localStorage: {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => { mockStorage[key] = String(val) },
    removeItem: (key) => { delete mockStorage[key] }
  },
  dispatchEvent: () => true
}
globalThis.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type
    this.detail = eventInitDict?.detail
  }
}

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) {
    delete mockStorage[k]
  }
})

test('PLANT_STAGES defines five distinct gamified growth stages', () => {
  assert.equal(PLANT_STAGES.length, 5)
  assert.equal(PLANT_STAGES[0].name, 'Sprouting Seed')
  assert.equal(PLANT_STAGES[0].level, 1)
  assert.equal(PLANT_STAGES[0].emoji, '🌱')
  assert.equal(PLANT_STAGES[4].name, 'Mighty Tree')
  assert.equal(PLANT_STAGES[4].level, 5)
  assert.equal(PLANT_STAGES[4].emoji, '🌳')
})

test('getDefaultPlantState returns level 1 initial state', () => {
  const initial = getDefaultPlantState()
  assert.equal(initial.stageIndex, 0)
  assert.equal(initial.tasksInCurrentStage, 0)
  assert.equal(initial.totalTasksCompleted, 0)
  assert.equal(initial.waterDrops, 0)
  assert.equal(initial.treesGrown, 0)
})

test('recordTaskCompletion advances plant progress and levels up to seedling', () => {
  const username = 'testuser'

  // Task 1: 1/2 tasks in stage 0
  const step1 = recordTaskCompletion(username)
  assert.equal(step1.state.totalTasksCompleted, 1)
  assert.equal(step1.state.tasksInCurrentStage, 1)
  assert.equal(step1.state.stageIndex, 0)
  assert.equal(step1.leveledUp, false)

  // Task 2: Reaches threshold of 2 tasks for Stage 0 -> Levels up to Stage 1
  const step2 = recordTaskCompletion(username)
  assert.equal(step2.state.totalTasksCompleted, 2)
  assert.equal(step2.state.stageIndex, 1)
  assert.equal(step2.state.tasksInCurrentStage, 0)
  assert.equal(step2.leveledUp, true)
  assert.equal(step2.currentStage.name, 'Baby Seedling')
})

test('recordTaskCompletion progresses through multiple stages', () => {
  const username = 'grower'

  // Stage 0 requires 2 tasks
  recordTaskCompletion(username)
  recordTaskCompletion(username)
  let state = getPlantState(username)
  assert.equal(state.stageIndex, 1) // Baby Seedling

  // Stage 1 requires 3 tasks
  recordTaskCompletion(username)
  recordTaskCompletion(username)
  recordTaskCompletion(username)
  state = getPlantState(username)
  assert.equal(state.stageIndex, 2) // Thriving Foliage

  // Stage 2 requires 4 tasks
  for (let i = 0; i < 4; i++) {
    recordTaskCompletion(username)
  }
  state = getPlantState(username)
  assert.equal(state.stageIndex, 3) // Blossoming Shrub

  // Stage 3 requires 5 tasks
  for (let i = 0; i < 5; i++) {
    recordTaskCompletion(username)
  }
  state = getPlantState(username)
  assert.equal(state.stageIndex, 4) // Mighty Tree (Max Level)
})

test('waterPlant increases water drops counter', () => {
  const username = 'waterer'
  const state = waterPlant(username)
  assert.equal(state.waterDrops, 1)
  const state2 = waterPlant(username)
  assert.equal(state2.waterDrops, 2)
})

test('plantNewSeed increments trees grown and resets to seed stage', () => {
  const username = 'forester'
  // Artificially set to max stage
  savePlantState({
    stageIndex: 4,
    tasksInCurrentStage: 0,
    totalTasksCompleted: 14,
    waterDrops: 14,
    treesGrown: 0
  }, username)

  const updated = plantNewSeed(username)
  assert.equal(updated.treesGrown, 1)
  assert.equal(updated.stageIndex, 0)
  assert.equal(updated.tasksInCurrentStage, 0)
  assert.equal(updated.totalTasksCompleted, 14)
})

test('api client includes toggleHabitTask method', () => {
  assert.equal(typeof api.toggleHabitTask, 'function')
})
