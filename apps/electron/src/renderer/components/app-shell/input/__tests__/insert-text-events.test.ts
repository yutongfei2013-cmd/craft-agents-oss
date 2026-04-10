import { beforeEach, describe, expect, it } from 'bun:test'
import {
  __resetPendingInsertTextForTests,
  clearPendingInsertTextForSession,
  consumePendingInsertTextForSession,
  dispatchInsertTextEvent,
  queuePendingInsertTextForSession,
} from '../insert-text-events'

describe('insert-text-events pending queue', () => {
  beforeEach(() => {
    __resetPendingInsertTextForTests()
    ;(globalThis as { window?: { dispatchEvent?: (event: Event) => boolean } }).window = {
      dispatchEvent: () => true,
    }
  })

  it('queues and consumes pending text for the matching session', () => {
    queuePendingInsertTextForSession({ sessionId: 'session-a', text: '/tmp/a.ts', mode: 'append' })

    expect(consumePendingInsertTextForSession('session-a')).toEqual([
      { sessionId: 'session-a', text: '/tmp/a.ts', mode: 'append' },
    ])
    expect(consumePendingInsertTextForSession('session-a')).toEqual([])
  })

  it('keeps text queues isolated by session', () => {
    queuePendingInsertTextForSession({ sessionId: 'session-a', text: '/tmp/a.ts', mode: 'append' })
    queuePendingInsertTextForSession({ sessionId: 'session-b', text: '/tmp/b.ts', mode: 'append' })

    expect(consumePendingInsertTextForSession('session-a')).toEqual([
      { sessionId: 'session-a', text: '/tmp/a.ts', mode: 'append' },
    ])
    expect(consumePendingInsertTextForSession('session-b')).toEqual([
      { sessionId: 'session-b', text: '/tmp/b.ts', mode: 'append' },
    ])
  })

  it('clear removes only the targeted session queue', () => {
    queuePendingInsertTextForSession({ sessionId: 'session-a', text: '/tmp/a.ts', mode: 'append' })
    queuePendingInsertTextForSession({ sessionId: 'session-b', text: '/tmp/b.ts', mode: 'append' })

    clearPendingInsertTextForSession('session-a')

    expect(consumePendingInsertTextForSession('session-a')).toEqual([])
    expect(consumePendingInsertTextForSession('session-b')).toEqual([
      { sessionId: 'session-b', text: '/tmp/b.ts', mode: 'append' },
    ])
  })

  it('dispatchInsertTextEvent queues text before dispatching', () => {
    dispatchInsertTextEvent({ sessionId: 'session-a', text: '/tmp/a.ts', mode: 'append' })

    expect(consumePendingInsertTextForSession('session-a')).toEqual([
      { sessionId: 'session-a', text: '/tmp/a.ts', mode: 'append' },
    ])
  })
})
