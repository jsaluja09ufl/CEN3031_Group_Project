import { test } from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../src/api/client.js'

test('api client has goal progress methods defined', () => {
  assert.equal(typeof api.toggleGoalCompletion, 'function')
  assert.equal(typeof api.getGoalProgress, 'function')
})
