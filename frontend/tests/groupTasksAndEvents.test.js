import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateEvent } from '../src/utils/validateEvent.js'
import { api } from '../src/api/client.js'

test('api client has all group task and event methods defined', () => {
  assert.equal(typeof api.getGroupTasks, 'function')
  assert.equal(typeof api.createGroupTask, 'function')
  assert.equal(typeof api.toggleGroupTask, 'function')
  assert.equal(typeof api.getGroupEvents, 'function')
  assert.equal(typeof api.createGroupEvent, 'function')
})

test('valid group event validates successfully', () => {
  const goodEvent = {
    title: 'Sprint Retrospective',
    priority: 'high',
    startTime: '2026-11-25T14:00',
    endTime: '2026-11-25T15:00'
  }
  assert.equal(validateEvent(goodEvent), null)
})

test('group event with invalid times fails validation', () => {
  const badEvent = {
    title: 'Sprint Retrospective',
    priority: 'high',
    startTime: '2026-11-25T16:00',
    endTime: '2026-11-25T15:00'
  }
  assert.equal(validateEvent(badEvent), 'End time must be after start time')
})
