import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  __resetPendingInsertTextForTests,
  consumePendingInsertTextForSession,
} from '../insert-text-events'
import { insertPathsToSession } from '../insert-paths-to-session'

describe('insert-paths-to-session', () => {
  beforeEach(() => {
    __resetPendingInsertTextForTests()
    ;(globalThis as { window?: { dispatchEvent?: (event: Event) => boolean } }).window = {
      dispatchEvent: () => true,
    }
  })

  it('returns false when sessionId is missing', () => {
    const navigateToSession = mock(() => {})
    const onNoSession = mock(() => {})

    const result = insertPathsToSession({
      sessionId: null,
      paths: ['/tmp/a.ts'],
      navigateToSession,
      onNoSession,
    })

    expect(result).toBe(false)
    expect(onNoSession).toHaveBeenCalledTimes(1)
    expect(navigateToSession).not.toHaveBeenCalled()
  })

  it('returns false when no paths are provided', () => {
    const navigateToSession = mock(() => {})

    const result = insertPathsToSession({
      sessionId: 'session-a',
      paths: [],
      navigateToSession,
    })

    expect(result).toBe(false)
    expect(navigateToSession).not.toHaveBeenCalled()
  })

  it('queues path text and navigates to the target session', () => {
    const navigateToSession = mock(() => {})

    const result = insertPathsToSession({
      sessionId: 'session-a',
      paths: ['/tmp/a.ts', '/tmp/b.ts'],
      navigateToSession,
    })

    expect(result).toBe(true)
    expect(navigateToSession).toHaveBeenCalledWith('session-a')
    expect(consumePendingInsertTextForSession('session-a')).toEqual([
      {
        sessionId: 'session-a',
        text: '/tmp/a.ts\n/tmp/b.ts',
        mode: 'append',
      },
    ])
  })

  it('dedupes repeated paths before queueing', () => {
    const navigateToSession = mock(() => {})

    insertPathsToSession({
      sessionId: 'session-a',
      paths: ['/tmp/a.ts', '/tmp/a.ts'],
      navigateToSession,
    })

    expect(consumePendingInsertTextForSession('session-a')).toEqual([
      {
        sessionId: 'session-a',
        text: '/tmp/a.ts',
        mode: 'append',
      },
    ])
  })
})
