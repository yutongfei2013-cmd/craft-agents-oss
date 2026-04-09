import * as React from 'react'
import { cn } from '@/lib/utils'
import { CHAT_LAYOUT } from '@/config/layout'
import { flattenLabels, type LabelConfig } from '@craft-agent/shared/labels'
import type { PermissionMode } from '@craft-agent/shared/agent/modes'
import type { SessionStatus } from '@/config/session-status-config'
import { Button } from '@/components/ui/button'
import type { BackgroundTask } from '../ActiveTasksBar'
import { ActiveOptionBadges } from '../ActiveOptionBadges'
import { InputContainer } from './InputContainer'
import { useOptionalAppShellContext } from '@/context/AppShellContext'

interface ChatInputZoneProps {
  compactMode?: boolean
  showOptionBadges?: boolean
  permissionMode?: PermissionMode
  onPermissionModeChange?: (mode: PermissionMode) => void
  tasks?: BackgroundTask[]
  sessionId: string
  sessionFolderPath?: string
  onKillTask?: (taskId: string) => void
  onInsertMessage?: (text: string) => void
  sessionLabels?: string[]
  labels?: LabelConfig[]
  onLabelsChange?: (labels: string[]) => void
  sessionStatuses?: SessionStatus[]
  currentSessionStatus?: string
  onSessionStatusChange?: (stateId: string) => void
  className?: string
  inputProps: React.ComponentProps<typeof InputContainer>
}

export function ChatInputZone({
  compactMode = false,
  showOptionBadges,
  permissionMode = 'ask',
  onPermissionModeChange,
  tasks = [],
  sessionId,
  sessionFolderPath,
  onKillTask,
  onInsertMessage,
  sessionLabels = [],
  labels = [],
  onLabelsChange,
  sessionStatuses = [],
  currentSessionStatus = 'todo',
  onSessionStatusChange,
  className,
  inputProps,
}: ChatInputZoneProps) {
  const appShellContext = useOptionalAppShellContext()
  const [autoOpenLabelId, setAutoOpenLabelId] = React.useState<string | null>(null)
  const shouldShowOptionBadges = showOptionBadges ?? !compactMode
  const topicSwitchPrompt = appShellContext?.pendingTopicSwitchPrompt?.sessionId === sessionId
    ? appShellContext.pendingTopicSwitchPrompt
    : null

  const handleLabelAdd = React.useCallback((labelId: string) => {
    const current = sessionLabels || []
    if (current.includes(labelId)) return

    onLabelsChange?.([...current, labelId])

    const config = flattenLabels(labels || []).find(label => label.id === labelId)
    if (config?.valueType) {
      setAutoOpenLabelId(labelId)
    }
  }, [labels, onLabelsChange, sessionLabels])

  return (
    <div className={cn(
      CHAT_LAYOUT.maxWidth,
      'mx-auto w-full mt-1',
      compactMode ? 'px-2 pb-3' : 'px-3 @xs/panel:px-4 pb-4',
      className,
    )}>
      {shouldShowOptionBadges && (
        <ActiveOptionBadges
          permissionMode={permissionMode}
          onPermissionModeChange={onPermissionModeChange}
          tasks={tasks}
          sessionId={sessionId}
          sessionFolderPath={sessionFolderPath}
          onKillTask={onKillTask}
          onInsertMessage={onInsertMessage ?? inputProps.onInputChange}
          sessionLabels={sessionLabels}
          labels={labels}
          onLabelsChange={onLabelsChange}
          onRemoveLabel={(labelId) => {
            const next = (sessionLabels || []).filter(entry => entry !== labelId && !entry.startsWith(`${labelId}::`))
            onLabelsChange?.(next)
          }}
          autoOpenLabelId={autoOpenLabelId}
          onAutoOpenConsumed={() => setAutoOpenLabelId(null)}
          sessionStatuses={sessionStatuses}
          currentSessionStatus={currentSessionStatus}
          onSessionStatusChange={onSessionStatusChange}
        />
      )}

      {topicSwitchPrompt && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="text-xs text-muted-foreground">
            This looks unrelated to the current session. Choose where to send it:
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => appShellContext?.onCreateSessionFromPrompt?.(sessionId)}
          >
            Create New Session
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => appShellContext?.onContinueCurrentSession?.(sessionId)}
          >
            Continue Current Session
          </Button>
        </div>
      )}

      <InputContainer
        {...inputProps}
        compactMode={compactMode}
        permissionMode={permissionMode}
        onPermissionModeChange={onPermissionModeChange}
        labels={labels}
        sessionLabels={sessionLabels}
        onLabelAdd={handleLabelAdd}
        sessionFolderPath={sessionFolderPath}
        sessionId={sessionId}
        currentSessionStatus={currentSessionStatus}
      />
    </div>
  )
}
