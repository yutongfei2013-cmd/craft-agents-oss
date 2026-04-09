import { describe, expect, it } from 'bun:test'
import { getAnnotationIslandCloseDelay } from '../use-annotation-island-presentation'

describe('getAnnotationIslandCloseDelay', () => {
  it('returns null while the island still has an active anchor', () => {
    expect(getAnnotationIslandCloseDelay({
      anchor: { x: 100, y: 100 },
      renderAnchor: { x: 100, y: 100 },
      openedAt: 1000,
      now: 1050,
      closeGraceMs: 220,
    })).toBeNull()
  })

  it('returns remaining grace time when close is requested shortly after open', () => {
    expect(getAnnotationIslandCloseDelay({
      anchor: null,
      renderAnchor: { x: 100, y: 100 },
      openedAt: 1000,
      now: 1100,
      closeGraceMs: 220,
    })).toBe(120)
  })

  it('returns 0 when grace time has already elapsed', () => {
    expect(getAnnotationIslandCloseDelay({
      anchor: null,
      renderAnchor: { x: 100, y: 100 },
      openedAt: 1000,
      now: 1300,
      closeGraceMs: 220,
    })).toBe(0)
  })

  it('returns 0 when there is nothing left rendered to keep alive', () => {
    expect(getAnnotationIslandCloseDelay({
      anchor: null,
      renderAnchor: null,
      openedAt: 1000,
      now: 1010,
      closeGraceMs: 220,
    })).toBe(0)
  })
})
