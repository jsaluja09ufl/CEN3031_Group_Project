// https://nodejs.org/api/test.html
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateEvent } from '../src/utils/validateEvent.js'

const goodEvent = {
  title: 'Study for exam',
  priority: 'high',
  startTime: '2026-10-21T14:00',
  endTime: '2026-10-21T16:00'
}

test('valid event has no error', () => {
  assert.equal(validateEvent(goodEvent), null)
})

test('title is required', () => {
  assert.equal(validateEvent({ ...goodEvent, title: '   ' }), 'Title is required')
})

test('start and end time are required', () => {
  assert.equal(validateEvent({ ...goodEvent, endTime: '' }), 'Start and end time are required')
})

test('end time has to be after start time', () => {
  assert.equal(validateEvent({ ...goodEvent, endTime: '2026-10-21T13:00' }), 'End time must be after start time')
  assert.equal(validateEvent({ ...goodEvent, endTime: goodEvent.startTime }), 'End time must be after start time')
})
