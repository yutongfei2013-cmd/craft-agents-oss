import * as React from 'react'

export interface UseAnnotationIslandPresentationOptions {
  anchor: { x: number; y: number } | null
  sourceKey: string
  closeGraceMs?: number
}

export interface AnnotationIslandPresentationState {
  renderAnchor: { x: number; y: number } | null
  renderSourceKey: string
  isVisible: boolean
  openedAtRef: React.MutableRefObject<number>
  handleExitComplete: () => void
  resetPresentation: () => void
}

export function getAnnotationIslandCloseDelay(options: {
  anchor: { x: number; y: number } | null
  renderAnchor: { x: number; y: number } | null
  openedAt: number
  now: number
  closeGraceMs: number
}): number | null {
  const { anchor, renderAnchor, openedAt, now, closeGraceMs } = options

  if (anchor) return null
  if (!renderAnchor) return 0

  const remaining = openedAt + closeGraceMs - now
  return remaining > 0 ? remaining : 0
}

export function useAnnotationIslandPresentation({
  anchor,
  sourceKey,
  closeGraceMs = 220,
}: UseAnnotationIslandPresentationOptions): AnnotationIslandPresentationState {
  const [renderAnchor, setRenderAnchor] = React.useState<{ x: number; y: number } | null>(null)
  const [renderSourceKey, setRenderSourceKey] = React.useState('none')
  const [isVisible, setIsVisible] = React.useState(false)
  const openedAtRef = React.useRef(0)
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (anchor) {
      openedAtRef.current = Date.now()
      setRenderAnchor(anchor)
      setRenderSourceKey(sourceKey)
      setIsVisible(true)
      return
    }

    const closeDelay = getAnnotationIslandCloseDelay({
      anchor,
      renderAnchor,
      openedAt: openedAtRef.current,
      now: Date.now(),
      closeGraceMs,
    })

    if (closeDelay == null) {
      return
    }

    if (closeDelay > 0) {
      closeTimerRef.current = setTimeout(() => {
        setIsVisible(false)
        closeTimerRef.current = null
      }, closeDelay)
      return
    }

    setIsVisible(false)

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [anchor, sourceKey, closeGraceMs, renderAnchor])

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [])

  const handleExitComplete = React.useCallback(() => {
    if (anchor) return
    setRenderAnchor(null)
    setRenderSourceKey('none')
  }, [anchor])

  const resetPresentation = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setRenderAnchor(null)
    setRenderSourceKey('none')
    setIsVisible(false)
    openedAtRef.current = 0
  }, [])

  return {
    renderAnchor,
    renderSourceKey,
    isVisible,
    openedAtRef,
    handleExitComplete,
    resetPresentation,
  }
}
