import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateRealmIntegrity } from '../src/lib/realm-integrity.ts'

const glitch = (status) => ({ glitchId: `GL-${status}`, status, description: '', timestamp: '2026-11-24T10:00:00Z' })

test('a realm without open glitches is fully stable', () => {
  assert.deepEqual(calculateRealmIntegrity([]).integrity, 100)
  const result = calculateRealmIntegrity([glitch('FIXED'), glitch('FIXED')])
  assert.equal(result.integrity, 100)
  assert.equal(result.level, 'STABLE')
  assert.equal(result.openCount, 0)
})

test('open glitches cost more the earlier they are in their lifecycle', () => {
  assert.equal(calculateRealmIntegrity([glitch('LEAKED')]).integrity, 85)
  assert.equal(calculateRealmIntegrity([glitch('ASSESSING')]).integrity, 90)
  assert.equal(calculateRealmIntegrity([glitch('CONTAINING')]).integrity, 95)
})

test('the seed data lands in the wavering band', () => {
  const result = calculateRealmIntegrity(['LEAKED', 'ASSESSING', 'CONTAINING', 'FIXED'].map(glitch))
  assert.equal(result.integrity, 70)
  assert.equal(result.level, 'WAVERING')
  assert.equal(result.openCount, 3)
  assert.deepEqual(result.counts, { LEAKED: 1, ASSESSING: 1, CONTAINING: 1, FIXED: 1 })
})

test('integrity never drops below zero and maps to the desync level', () => {
  const result = calculateRealmIntegrity(Array.from({ length: 10 }, () => glitch('LEAKED')))
  assert.equal(result.integrity, 0)
  assert.equal(result.level, 'DESYNC')
})

test('levels switch at 80, 50 and 25', () => {
  const level = (n) => calculateRealmIntegrity(Array.from({ length: n }, () => glitch('CONTAINING'))).level
  assert.equal(level(4), 'STABLE') // 80
  assert.equal(level(5), 'WAVERING') // 75
  assert.equal(level(10), 'WAVERING') // 50
  assert.equal(level(11), 'CRITICAL') // 45
  assert.equal(level(15), 'CRITICAL') // 25
  assert.equal(level(16), 'DESYNC') // 20
})
