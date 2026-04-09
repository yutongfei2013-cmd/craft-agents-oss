import { describe, expect, it } from 'bun:test'
import type { Session } from '../../../shared/types'
import { shouldPromptForNewSession } from '../topic-relatedness'

function createSession(overrides?: Partial<Session>): Session {
  return {
    id: 'session-1',
    workspaceId: 'workspace-1',
    workspaceName: 'Workspace',
    name: 'Auth token refresh bug',
    lastMessageAt: Date.now(),
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'Please help me debug a React auth token refresh race in our Electron app.',
        timestamp: Date.now() - 2_000,
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'I found the race around token refresh scheduling and request retries.',
        timestamp: Date.now() - 1_000,
      },
    ],
    isProcessing: false,
    ...overrides,
  }
}

describe('shouldPromptForNewSession', () => {
  it('returns true for the explicit test trigger command', () => {
    const session = createSession({
      messages: [],
    })

    expect(shouldPromptForNewSession(session, 'test-pop')).toBe(true)
  })

  it('returns true for a clearly unrelated new topic in an existing session', () => {
    const session = createSession()

    expect(shouldPromptForNewSession(
      session,
      'Recommend indoor playgrounds in Shanghai for kids near the subway.'
    )).toBe(true)
  })

  it('returns false for a direct continuation of the current topic', () => {
    const session = createSession()

    expect(shouldPromptForNewSession(
      session,
      '继续上面这个 token refresh race，顺便给我一个修复方案。'
    )).toBe(false)
  })
})
