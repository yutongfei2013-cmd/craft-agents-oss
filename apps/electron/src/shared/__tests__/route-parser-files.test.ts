import { describe, it, expect } from 'bun:test'
import { buildCompoundRoute, parseCompoundRoute, parseRouteToNavigationState } from '../route-parser'

describe('route-parser: files routes', () => {
  it('parses "files" as files navigator with no details', () => {
    const result = parseCompoundRoute('files')
    expect(result).not.toBeNull()
    expect(result!.navigator).toBe('files')
    expect(result!.details).toBeNull()
  })

  it('parses "files/file/<encoded path>" as files detail route', () => {
    const encodedPath = encodeURIComponent('/tmp/project/src/main file.ts')
    const result = parseCompoundRoute(`files/file/${encodedPath}`)
    expect(result).not.toBeNull()
    expect(result!.navigator).toBe('files')
    expect(result!.details).toEqual({ type: 'file', id: '/tmp/project/src/main file.ts' })
  })

  it('roundtrips files detail routes', () => {
    const parsed = parseCompoundRoute(`files/file/${encodeURIComponent('/tmp/project/src/main file.ts')}`)!
    const built = buildCompoundRoute(parsed)
    expect(built).toBe(`files/file/${encodeURIComponent('/tmp/project/src/main file.ts')}`)
  })

  it('converts files routes into navigation state', () => {
    const state = parseRouteToNavigationState(`files/file/${encodeURIComponent('/tmp/project/README.md')}`)
    expect(state).toEqual({
      navigator: 'files',
      details: { type: 'file', filePath: '/tmp/project/README.md' },
    })
  })
})
