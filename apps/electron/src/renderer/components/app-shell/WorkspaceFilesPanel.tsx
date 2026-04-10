import * as React from 'react'
import { ChevronRight, Copy, ExternalLink, File, FileCode2, FileText, Folder, FolderOpen, Image as ImageIcon, Paperclip, RefreshCw } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuTrigger,
  StyledContextMenuContent,
  StyledContextMenuItem,
} from '@/components/ui/styled-context-menu'
import { cn } from '@/lib/utils'
import type { FileSystemEntriesResult } from '../../../shared/types'
import { getFileManagerName } from '@/lib/platform'
import { insertPathsToSession } from './input/insert-paths-to-session'
import { navigate, routes } from '@/lib/navigate'

interface WorkspaceFilesPanelProps {
  rootPath?: string
  selectedFilePath?: string | null
  targetSessionId?: string | null
  onFileSelect: (filePath: string) => void
}

type DirectoryState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; result: FileSystemEntriesResult }
  | { status: 'error'; error: string }

function getBaseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean)
  return parts[parts.length - 1] || path
}

function formatDisplayPath(path: string): string {
  const homeMatch = path.match(/^\/Users\/[^/]+\/(.+)$/)
  if (homeMatch) return `~/${homeMatch[1]}`
  return path
}

function getEntryIcon(entry: FileSystemEntriesResult['entries'][number], isExpanded = false) {
  const iconClass = 'h-3.5 w-3.5 shrink-0 text-muted-foreground'
  if (entry.type === 'directory') {
    return isExpanded ? <FolderOpen className={iconClass} /> : <Folder className={iconClass} />
  }

  const ext = entry.name.split('.').pop()?.toLowerCase()
  if (ext === 'md' || ext === 'mdx') return <FileText className={iconClass} />
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'avif', 'bmp'].includes(ext || '')) {
    return <ImageIcon className={iconClass} />
  }
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'rb', 'go', 'rs', 'sh', 'css', 'html', 'yml', 'yaml', 'toml'].includes(ext || '')) {
    return <FileCode2 className={iconClass} />
  }
  return <File className={iconClass} />
}

export function WorkspaceFilesPanel({
  rootPath,
  selectedFilePath,
  targetSessionId,
  onFileSelect,
}: WorkspaceFilesPanelProps) {
  const [directoryStates, setDirectoryStates] = React.useState<Record<string, DirectoryState>>({})
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(new Set())
  const fileManagerName = getFileManagerName()

  const loadDirectory = React.useCallback(async (dirPath: string, force = false) => {
    if (!dirPath) return

    let shouldLoad = true
    setDirectoryStates((prev) => {
      const current = prev[dirPath]
      if (!force && (current?.status === 'loading' || current?.status === 'ready')) {
        shouldLoad = false
        return prev
      }
      return { ...prev, [dirPath]: { status: 'loading' } }
    })

    if (!shouldLoad) return

    try {
      const result = await window.electronAPI.listFileSystemEntries(dirPath)
      setDirectoryStates((prev) => ({ ...prev, [dirPath]: { status: 'ready', result } }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load files'
      setDirectoryStates((prev) => ({ ...prev, [dirPath]: { status: 'error', error: message } }))
    }
  }, [])

  React.useEffect(() => {
    if (!rootPath) {
      setDirectoryStates({})
      setExpandedPaths(new Set())
      return
    }

    setDirectoryStates({})
    setExpandedPaths(new Set([rootPath]))
    void loadDirectory(rootPath, true)
  }, [rootPath, loadDirectory])

  const toggleDirectory = React.useCallback((dirPath: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(dirPath)) {
        next.delete(dirPath)
      } else {
        next.add(dirPath)
        void loadDirectory(dirPath)
      }
      return next
    })
  }, [loadDirectory])

  const renderEntries = React.useCallback((dirPath: string, depth = 0): React.ReactNode => {
    const state = directoryStates[dirPath]
    if (!state || state.status === 'idle' || state.status === 'loading') {
      return (
        <div className="px-3 py-2 text-xs text-muted-foreground" style={{ paddingLeft: `${depth * 14 + 12}px` }}>
          Loading...
        </div>
      )
    }

    if (state.status === 'error') {
      return (
        <div className="px-3 py-2 text-xs text-destructive" style={{ paddingLeft: `${depth * 14 + 12}px` }}>
          {state.error}
        </div>
      )
    }

    if (state.status !== 'ready') {
      return null
    }

    const result = state.result

    if (result.entries.length === 0) {
      return (
        <div className="px-3 py-2 text-xs text-muted-foreground" style={{ paddingLeft: `${depth * 14 + 12}px` }}>
          Empty folder
        </div>
      )
    }

    return result.entries.map((entry: FileSystemEntriesResult['entries'][number]) => {
      const isExpanded = entry.type === 'directory' && expandedPaths.has(entry.path)
      const isSelected = selectedFilePath === entry.path

      const handleInsertPathToSession = () => {
        if (entry.type !== 'file') return
        insertPathsToSession({
          sessionId: targetSessionId,
          paths: [entry.path],
          navigateToSession: (sessionId) => navigate(routes.view.allSessions(sessionId)),
        })
      }

      return (
        <div key={entry.path}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <button
                type="button"
                onClick={() => entry.type === 'directory' ? toggleDirectory(entry.path) : onFileSelect(entry.path)}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-left text-[13px] transition-colors',
                  isSelected ? 'bg-foreground/6 text-foreground' : 'text-muted-foreground hover:bg-foreground/4 hover:text-foreground'
                )}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                {entry.type === 'directory' ? (
                  <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                {getEntryIcon(entry, isExpanded)}
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              </button>
            </ContextMenuTrigger>
            <StyledContextMenuContent>
              {entry.type === 'file' && (
                <StyledContextMenuItem onSelect={handleInsertPathToSession} disabled={!targetSessionId}>
                  <Paperclip className="h-3.5 w-3.5" />
                  Insert path into current session
                </StyledContextMenuItem>
              )}
              {entry.type !== 'directory' && (
                <StyledContextMenuItem onSelect={() => onFileSelect(entry.path)}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </StyledContextMenuItem>
              )}
              <StyledContextMenuItem onSelect={() => void window.electronAPI.showInFolder(entry.path)}>
                <FolderOpen className="h-3.5 w-3.5" />
                {`Show in ${fileManagerName}`}
              </StyledContextMenuItem>
              <StyledContextMenuItem onSelect={() => navigator.clipboard.writeText(entry.path)}>
                <Copy className="h-3.5 w-3.5" />
                Copy path
              </StyledContextMenuItem>
            </StyledContextMenuContent>
          </ContextMenu>

          {entry.type === 'directory' && isExpanded && renderEntries(entry.path, depth + 1)}
        </div>
      )
    })
  }, [directoryStates, expandedPaths, fileManagerName, onFileSelect, selectedFilePath, targetSessionId, toggleDirectory])

  if (!rootPath) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No working directory or workspace root available.
      </div>
    )
  }

  const rootState = directoryStates[rootPath]
  const isRefreshing = rootState?.status === 'loading'
  const rootResult = rootState?.status === 'ready' ? rootState.result : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-2 border-b border-border/30 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Root</div>
          <div className="truncate text-xs text-foreground" title={rootPath}>
            {formatDisplayPath(rootPath)}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => void loadDirectory(rootPath, true)}
          title="Refresh file tree"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 py-2">
          {renderEntries(rootPath)}
          {rootResult?.truncated && (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              Showing the first {rootResult.entries.length} of {rootResult.totalEntries} entries.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/30 px-3 py-2 text-[11px] text-muted-foreground">
        {getBaseName(rootPath)} project files
      </div>
    </div>
  )
}
