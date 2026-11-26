import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eventsOverlap, eventKey, findConflicts, getConflictKeys } from '../src/utils/eventConflicts.js'

const studySession = { event_id: 1, title: 'Study', start_time: '2026-12-01T14:00', end_time: '2026-12-01T16:00' }
const groupMeeting = { event_id: 1, group_id: 3, title: 'Meeting', start_time: '2026-12-01T15:00', end_time: '2026-12-01T17:00' }
const dinner = { event_id: 2, title: 'Dinner', start_time: '2026-12-01T18:00', end_time: '2026-12-01T19:00' }

test('events that overlap are detected', () => {
  assert.equal(eventsOverlap(studySession, groupMeeting), true)
})

test('events at different times do not overlap', () => {
  assert.equal(eventsOverlap(studySession, dinner), false)
})

test('event ending when another starts is not an overlap', () => {
  const afterStudy = { event_id: 5, start_time: '2026-12-01T16:00', end_time: '2026-12-01T17:00' }
  assert.equal(eventsOverlap(studySession, afterStudy), false)
})

test('personal and group events with the same id get different keys', () => {
  assert.equal(eventKey(studySession), 'personal-1')
  assert.equal(eventKey(groupMeeting), 'group-1')
})

test('findConflicts returns only the overlapping events', () => {
  const newEvent = { start_time: '2026-12-01T15:30', end_time: '2026-12-01T18:30' }
  const conflicts = findConflicts(newEvent, [studySession, groupMeeting, dinner])
  assert.equal(conflicts.length, 3)

  const lateEvent = { start_time: '2026-12-01T20:00', end_time: '2026-12-01T21:00' }
  assert.equal(findConflicts(lateEvent, [studySession, groupMeeting, dinner]).length, 0)
})

test('getConflictKeys marks both events in a collision', () => {
  const keys = getConflictKeys([studySession, groupMeeting, dinner])
  assert.equal(keys.has('personal-1'), true)
  assert.equal(keys.has('group-1'), true)
  assert.equal(keys.has('personal-2'), false)
})
