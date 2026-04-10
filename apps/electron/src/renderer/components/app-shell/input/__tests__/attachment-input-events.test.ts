import { beforeEach, describe, expect, it } from 'bun:test'
import {
  __resetPendingAttachmentsForTests,
  clearPendingAttachmentsForSession,
  consumePendingAttachmentsForSession,
  dispatchAttachFilePathsEvent,
  queuePendingAttachmentsForSession,
} from '../attachment-input-events'

describe('attachment-input-events pending queue', () => {
  beforeEach(() => {
    __resetPendingAttachmentsForTests()
    ;(globalThis as { window?: { dispatchEvent?: (event: Event) => boolean } }).window = {
      dispatchEvent: () => true,
    }
  })

  it('queues and consumes multiple files for the matching session', () => {
    queuePendingAttachmentsForSession('session-a', ['/tmp/a.ts', '/tmp/b.ts'])

    expect(consumePendingAttachmentsForSession('session-a')).toEqual(['/tmp/a.ts', '/tmp/b.ts'])
    expect(consumePendingAttachmentsForSession('session-a')).toEqual([])
  })

  it('keeps attachment queues isolated by session', () => {
    queuePendingAttachmentsForSession('session-a', ['/tmp/a.ts'])
    queuePendingAttachmentsForSession('session-b', ['/tmp/b.ts'])

    expect(consumePendingAttachmentsForSession('session-a')).toEqual(['/tmp/a.ts'])
    expect(consumePendingAttachmentsForSession('session-b')).toEqual(['/tmp/b.ts'])
  })

  it('clear removes only the targeted session queue', () => {
    queuePendingAttachmentsForSession('session-a', ['/tmp/a.ts'])
    queuePendingAttachmentsForSession('session-b', ['/tmp/b.ts'])

    clearPendingAttachmentsForSession('session-a')

    expect(consumePendingAttachmentsForSession('session-a')).toEqual([])
    expect(consumePendingAttachmentsForSession('session-b')).toEqual(['/tmp/b.ts'])
  })

  it('dispatchAttachFilePathsEvent queues paths before dispatching', () => {
    dispatchAttachFilePathsEvent({ sessionId: 'session-a', paths: ['/tmp/a.ts'] })

    expect(consumePendingAttachmentsForSession('session-a')).toEqual(['/tmp/a.ts'])
  })
})
