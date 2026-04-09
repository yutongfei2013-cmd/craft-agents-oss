import { describe, expect, it } from 'bun:test'
import {
  filterConnectionsForWorkspace,
  isConnectionAllowedInWorkspace,
  sanitizeAllowedConnectionSlugs,
} from '../llm-connections.ts'

describe('workspace connection allowlist helpers', () => {
  const connections = [
    { slug: 'claude-max' },
    { slug: 'chatgpt-plus' },
    { slug: 'copilot' },
  ]

  it('sanitizeAllowedConnectionSlugs removes missing and duplicate slugs', () => {
    expect(
      sanitizeAllowedConnectionSlugs(
        ['chatgpt-plus', 'missing', 'claude-max', 'chatgpt-plus'],
        connections,
      ),
    ).toEqual(['chatgpt-plus', 'claude-max'])
  })

  it('filterConnectionsForWorkspace returns all connections when allowlist is undefined', () => {
    expect(filterConnectionsForWorkspace(connections, undefined)).toEqual(connections)
  })

  it('filterConnectionsForWorkspace keeps only allowed connections', () => {
    expect(
      filterConnectionsForWorkspace(connections, ['copilot', 'claude-max']).map((connection) => connection.slug),
    ).toEqual(['claude-max', 'copilot'])
  })

  it('isConnectionAllowedInWorkspace treats undefined as unrestricted', () => {
    expect(isConnectionAllowedInWorkspace('claude-max', undefined)).toBe(true)
    expect(isConnectionAllowedInWorkspace('claude-max', ['chatgpt-plus'])).toBe(false)
    expect(isConnectionAllowedInWorkspace('claude-max', ['claude-max'])).toBe(true)
  })
})
