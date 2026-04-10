import { toast } from 'sonner'
import { dispatchFocusInputEvent } from './focus-input-events'
import { dispatchAttachFilePathsEvent } from './attachment-input-events'

interface AttachFilesToSessionParams {
  sessionId: string | null | undefined
  paths: string[]
  navigateToSession: (sessionId: string) => void
  onNoSession?: () => void
}

function getBaseName(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean)
  return parts[parts.length - 1] || path
}

export function attachFilesToSession({
  sessionId,
  paths,
  navigateToSession,
  onNoSession,
}: AttachFilesToSessionParams): boolean {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (uniquePaths.length === 0) return false

  if (!sessionId) {
    onNoSession?.()
    toast.error('No active session selected')
    return false
  }

  dispatchAttachFilePathsEvent({
    sessionId,
    paths: uniquePaths,
  })
  navigateToSession(sessionId)
  dispatchFocusInputEvent({ sessionId })

  toast.success(
    uniquePaths.length === 1 ? 'Queued file for session' : 'Queued files for session',
    {
      description: uniquePaths.length === 1
        ? getBaseName(uniquePaths[0]!)
        : `${uniquePaths.length} files`,
    }
  )
  return true
}
