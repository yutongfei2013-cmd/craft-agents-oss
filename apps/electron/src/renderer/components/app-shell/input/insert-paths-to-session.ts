import { toast } from 'sonner'
import { dispatchFocusInputEvent } from './focus-input-events'
import { dispatchInsertTextEvent } from './insert-text-events'

interface InsertPathsToSessionParams {
  sessionId: string | null | undefined
  paths: string[]
  navigateToSession: (sessionId: string) => void
  onNoSession?: () => void
}

function getBaseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean)
  return parts[parts.length - 1] || path
}

export function insertPathsToSession({
  sessionId,
  paths,
  navigateToSession,
  onNoSession,
}: InsertPathsToSessionParams): boolean {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (uniquePaths.length === 0) return false

  if (!sessionId) {
    onNoSession?.()
    toast.error('No active session selected')
    return false
  }

  dispatchInsertTextEvent({
    sessionId,
    text: uniquePaths.join('\n'),
    mode: 'append',
  })
  navigateToSession(sessionId)
  dispatchFocusInputEvent({ sessionId })

  toast.success(
    uniquePaths.length === 1 ? 'Inserted file path into session' : 'Inserted file paths into session',
    {
      description: uniquePaths.length === 1
        ? getBaseName(uniquePaths[0]!)
        : `${uniquePaths.length} files`,
    }
  )
  return true
}
