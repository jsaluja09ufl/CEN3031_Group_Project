import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateGroupSpace } from '../src/utils/validateGroupSpace.js'

test('valid group space has no error', () => {
  assert.equal(validateGroupSpace({ group_name: 'Study Group', group_type: 0 }), null)
})

test('group name is required', () => {
  assert.equal(validateGroupSpace({ group_name: '', group_type: 0 }), 'Group name is required')
  assert.equal(validateGroupSpace({ group_name: '   ', group_type: 0 }), 'Group name is required')
})

test('group name exceeding max length is rejected', () => {
  assert.equal(validateGroupSpace({ group_name: 'a'.repeat(101), group_type: 0 }), 'Group name must be 100 characters or less')
})

