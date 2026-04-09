# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Craft Agents is an open-source AI agent desktop app built by Craft Docs Ltd. It provides a GUI-based multi-session agent experience powered by Claude Agent SDK and Pi SDK, supporting multiple LLM providers (Anthropic, Google AI Studio, ChatGPT/Codex, GitHub Copilot, OpenRouter, Ollama, etc.).

Runtime: **Bun** | License: Apache 2.0

## Common Commands

```bash
# Install dependencies
bun install

# Development (hot reload)
bun run electron:dev

# Build and run
bun run electron:start

# Type checking
bun run typecheck:all          # All packages + apps
bun run typecheck              # packages/shared only (quick check)

# Tests
bun test                       # All tests
cd packages/shared && bun test # Shared package tests
bun run test:shared:all        # Shared test suites (LLM connections, models, config)
bun run test:doc-tools         # Python doc-tool smoke tests (pdf, xlsx, docx, pptx, img, ical)
cd apps/cli && bun test src/   # CLI tests

# Linting
bun run lint                   # All linters (ipc-sends + electron + shared + ui)
bun run lint:electron          # Electron app only (cd apps/electron && bun run lint)

# Full validation (CI pipeline)
bun run validate:ci            # typecheck:all + test:shared:all + test:doc-tools

# Server (headless)
bun run server:dev             # Dev mode with debug logging
bun run server:start           # Production
bun run server:prod            # With WebUI build

# CLI client
bun run apps/cli/src/index.ts --help
bun run apps/cli/src/index.ts --validate-server   # 21-step integration test
```

## Architecture

Bun monorepo with `apps/` and `packages/` workspaces.

### Dependency Graph

```
apps/electron ─────┬──> packages/shared ──> packages/core
apps/cli ──────────┤                    ──> packages/session-tools-core
apps/webui ────────┤
apps/viewer ───────┘
                   ├──> packages/server-core ──> packages/shared
                   ├──> packages/ui ──> packages/core
                   └──> packages/server ──> packages/server-core

packages/session-mcp-server ──> packages/session-tools-core + shared
packages/pi-agent-server    ──> Pi SDK (out-of-process, JSONL stdio)
```

### Packages

| Package | npm name | Purpose |
|---------|----------|---------|
| `core` | @craft-agent/core | Shared type layer (types, lightweight utils). Keep stable and dependency-light. |
| `shared` | @craft-agent/shared | Core business logic: agent backends, sources, credentials, sessions, config, permissions, automations |
| `server-core` | @craft-agent/server-core | Reusable headless server infrastructure (transport, RPC handlers, WebUI serving) |
| `server` | @craft-agent/server | Standalone headless Craft Agent server entry point |
| `ui` | @craft-agent/ui | Shared React UI components (session viewer, chat display, markdown rendering) |
| `session-tools-core` | @craft-agent/session-tools-core | Shared utilities for session-scoped tools (Claude and Codex) |
| `session-mcp-server` | @craft-agent/session-mcp-server | MCP server for session tools via stdio (CommonJS, built with `bun build`) |
| `pi-agent-server` | @craft-agent/pi-agent-server | Out-of-process Pi agent server (JSONL over stdio) |

### Apps

| App | Purpose |
|-----|---------|
| `electron` | Primary desktop GUI: Electron + React 18 + Vite + shadcn/ui + Tailwind CSS v4. Three-layer architecture: main (esbuild→CJS) / preload (context bridge) / renderer (Vite+React) |
| `cli` | Terminal client connecting to a running server over WebSocket |
| `webui` | Browser-based UI served by the headless server |
| `viewer` | Read-only session viewer |

### Dual Agent Backends

- **Claude backend** — `ClaudeAgent` class in `packages/shared/src/agent/claude-agent.ts`, powered by `@anthropic-ai/claude-agent-sdk`. Handles Anthropic API key, Claude Max/Pro OAuth, and all third-party endpoints (OpenRouter, Ollama, custom).
- **Pi backend** — `PiAgent` in `packages/shared/src/agent/pi-agent.ts`, powered by Pi SDK. Handles Google AI Studio, ChatGPT Plus (Codex OAuth), GitHub Copilot OAuth, OpenAI API key connections. Runs as an out-of-process subprocess (`packages/pi-agent-server`).
- `CraftAgent` is a backward-compatibility alias export.

### Key Design Patterns

- **Permission modes** are fixed: `safe` (read-only), `ask` (approval required, default), `allow-all` (auto-approve).
- **Source types** are fixed: `mcp`, `api`, `local`.
- **Credential storage**: AES-256-GCM encrypted file at `~/.craft-agent/credentials.enc`. All secret handling must go through `packages/shared/src/credentials/`.
- **Session lifecycle** distinguishes **hard aborts** (true cancellation: `UserStop`, redirect fallback) from **UI handoff interrupts** (pause points: `AuthRequest`, `PlanSubmitted`).
- **Automations matching** uses canonical matcher adapters in `packages/shared/src/automations/utils.ts` (`matcherMatches*`). Avoid direct primitive-only matcher checks in feature code.
- **Bundled assets** in `apps/electron/resources/` are synced to `~/.craft-agent/` on every launch (docs, themes, permissions, tool-icons, config-defaults.json). Edit them in-place; they are the source of truth.

## Architectural Boundaries (Enforced by ESLint)

The Electron app has custom ESLint rules that enforce strict boundaries:

- **Provider abstraction**: Main process code (`src/main/`) must NOT import provider backends directly (`claude-agent`, `codex-agent`, `copilot-agent`, `pi-agent`, `@github/copilot-sdk`). Use provider-agnostic APIs from `@craft-agent/shared/agent/backend`.
- **Model fetchers**: Must NOT call `fetch()` directly or import provider SDKs. Delegate to `fetchBackendModels()` from `@craft-agent/shared/agent/backend`.
- **Navigation state**: Use `navigate()` — no direct navigation state access (`craft-agent/no-direct-navigation-state`).
- **Platform checks**: Use the platform abstraction — no direct `process.platform` checks (`craft-platform/no-direct-platform-check`).
- **Path separators**: Avoid hardcoded `/` or `\\` path separators (`craft-paths/no-hardcoded-path-separator`).
- **File opening**: Use the in-app preview system — no direct `shell.openExternal` for files (`craft-links/no-direct-file-open`).
- **Source auth**: Use `isSourceUsable()` — no inline auth checks (`craft-sources/no-inline-source-auth-check`).
- **Z-index**: Use the token scale (shadow-xs through shadow-modal-small) — no hardcoded z-index values (`craft-styles/no-hardcoded-z-index`).
- **Shadow classes**: Only approved shadow tokens are allowed (shadow-none, shadow-xs, shadow-minimal, shadow-tinted, shadow-thin, shadow-middle, shadow-strong, shadow-panel-focused, shadow-modal-small, shadow-bottom-border, shadow-bottom-border-thin).
- **Keyboard shortcuts**: Use `useAction` from `@/actions` — no direct `react-hotkeys-hook` imports.
- **No localStorage**: Warned against; use the config/preferences system instead.

## Configuration Storage

User data lives at `~/.craft-agent/`:
- `config.json` — main config (workspaces, LLM connections)
- `credentials.enc` — AES-256-GCM encrypted credentials
- `preferences.json` — user preferences
- `theme.json` — app-level theme
- `workspaces/{id}/` — per-workspace: config, sessions (JSONL), sources, skills, statuses, automations

## Build System

- **Electron main process**: esbuild → CJS (`dist/main.cjs`)
- **Electron preload**: esbuild → CJS
- **Electron renderer**: Vite + React
- **Pi agent server**: `bun build` → ESM (`dist/index.js`)
- **Session MCP server**: `bun build` → CJS (`dist/index.js`)
- **Server builds**: `scripts/build-server.ts` with platform/arch targeting

Before submitting subprocess builds, run: `bun run server:build:subprocess` (builds session-mcp-server + pi-agent-server).

## Environment Variables

Required for full functionality (see `.env.example`):
- `ANTHROPIC_API_KEY` — Anthropic API access
- `CRAFT_MCP_URL` / `CRAFT_MCP_TOKEN` — Craft MCP server
- `SLACK_OAUTH_CLIENT_ID` / `SLACK_OAUTH_CLIENT_SECRET` — Slack integration (baked into build)
- `MICROSOFT_OAUTH_CLIENT_ID` — Microsoft integration (baked into build)
- Google OAuth credentials are NOT baked in; users provide their own via source config.

Server-specific:
- `CRAFT_SERVER_TOKEN` — bearer token for client auth (required)
- `CRAFT_RPC_HOST` / `CRAFT_RPC_PORT` — bind address/port (default: 127.0.0.1:9100)
- `CRAFT_RPC_TLS_CERT` / `CRAFT_RPC_TLS_KEY` — TLS for wss://
- `CRAFT_DEBUG` — enable debug logging

## CI

GitHub Actions (`validate.yml`): `bun install --frozen-lockfile` → `bun run validate:ci` on ubuntu-latest with Bun 1.3.10.

Server integration tests (`validate-server.yml`): Manual dispatch, runs `--validate-server` across ubuntu/macOS/Windows matrix.

## TypeScript

- Strict mode enabled with `noUncheckedIndexedAccess`
- Module: ESNext, moduleResolution: bundler
- Path alias: `@/*` → `src/*`
- JSX: react-jsx
