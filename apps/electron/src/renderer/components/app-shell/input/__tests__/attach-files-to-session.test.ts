import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  __resetPendingAttachmentsForTests,
  consumePendingAttachmentsForSession,
} from '../attachment-input-events'
import { attachFilesToSession } from '../attach-files-to-session'

describe('attach-files-to-session', () => {
  beforeEach(() => {
    __resetPendingAttachmentsForTests()
    ;(globalThis as { window?: { dispatchEvent?: (event: Event) => boolean } }).window = {
      dispatchEvent: () => true,
    }
  })

  it('returns false when sessionId is missing', () => {
    const navigateToSession = mock(() => {})
    const onNoSession = mock(() => {})

    const result = attachFilesToSession({
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

    const result = attachFilesToSession({
      sessionId: 'session-a',
      paths: [],
      navigateToSession,
    })

    expect(result).toBe(false)
    expect(navigateToSession).not.toHaveBeenCalled()
  })

  it('queues paths and navigates to the target session', () => {
    const navigateToSession = mock(() => {})

    const result = attachFilesToSession({
      sessionId: 'session-a',
      paths: ['/tmp/a.ts', '/tmp/b.ts'],
      navigateToSession,
    })

    expect(result).toBe(true)
    expect(navigateToSession).toHaveBeenCalledWith('session-a')
    expect(consumePendingAttachmentsForSession('session-a')).toEqual(['/tmp/a.ts', '/tmp/b.ts'])
  })

  it('dedupes repeated paths before queueing', () => {
    const navigateToSession = mock(() => {})

    attachFilesToSession({
      sessionId: 'session-a',
      paths: ['/tmp/a.ts', '/tmp/a.ts'],
      navigateToSession,
    })

    expect(consumePendingAttachmentsForSession('session-a')).toEqual(['/tmp/a.ts'])
  })
})
