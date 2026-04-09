import { describe, expect, it } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { pathToFileURL } from 'url'

const STORAGE_MODULE_PATH = pathToFileURL(join(import.meta.dir, '..', 'storage.ts')).href

function setup() {
  const configDir = mkdtempSync(join(tmpdir(), 'craft-agent-config-'))
  const workspaceRoot = join(configDir, 'workspaces', 'my-workspace')
  mkdirSync(workspaceRoot, { recursive: true })

  writeFileSync(
    join(workspaceRoot, 'config.json'),
    JSON.stringify({
      id: 'ws-config-1',
      name: 'My Workspace',
      slug: 'my-workspace',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      defaults: {
        defaultLlmConnection: 'chatgpt-plus',
        allowedLlmConnectionSlugs: ['chatgpt-plus', 'claude-max'],
      },
    }, null, 2),
    'utf-8',
  )

  const configPath = join(configDir, 'config.json')
  writeFileSync(
    configPath,
    JSON.stringify({
      workspaces: [{ id: 'ws-1', name: 'My Workspace', rootPath: workspaceRoot, createdAt: Date.now() }],
      activeWorkspaceId: 'ws-1',
      activeSessionId: null,
      defaultLlmConnection: 'chatgpt-plus',
      llmConnections: [
        {
          slug: 'chatgpt-plus',
          name: 'ChatGPT Plus (via Pi)',
          providerType: 'pi',
          authType: 'oauth',
          piAuthProvider: 'openai',
          createdAt: Date.now(),
        },
        {
          slug: 'claude-max',
          name: 'Claude Max',
          providerType: 'anthropic',
          authType: 'oauth',
          createdAt: Date.now(),
        },
      ],
    }, null, 2),
    'utf-8',
  )

  return { configDir, configPath, workspaceConfigPath: join(workspaceRoot, 'config.json') }
}

function runDelete(configDir: string, slug: string): boolean {
  const run = Bun.spawnSync([
    process.execPath,
    '--eval',
    `import { deleteLlmConnection } from '${STORAGE_MODULE_PATH}'; process.exit(deleteLlmConnection(${JSON.stringify(slug)}) ? 0 : 1);`,
  ], {
    env: { ...process.env, CRAFT_CONFIG_DIR: configDir },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (run.exitCode !== 0 && run.stderr.toString().trim()) {
    throw new Error(`delete subprocess failed:\n${run.stderr.toString()}`)
  }
  return run.exitCode === 0
}

describe('deleteLlmConnection', () => {
  it('heals workspace defaults and allowlist when a connection is removed', () => {
    const { configDir, configPath, workspaceConfigPath } = setup()

    expect(runDelete(configDir, 'chatgpt-plus')).toBe(true)

    const rootConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
    expect(rootConfig.defaultLlmConnection).toBe('claude-max')

    const workspaceConfig = JSON.parse(readFileSync(workspaceConfigPath, 'utf-8'))
    expect(workspaceConfig.defaults.defaultLlmConnection).toBe('claude-max')
    expect(workspaceConfig.defaults.allowedLlmConnectionSlugs).toEqual(['claude-max'])
  })
})
