export interface AttachFilePathsEventDetail {
  paths: string[]
  sessionId?: string
}

const pendingAttachmentPathsBySession = new Map<string, string[]>()

export function queuePendingAttachmentsForSession(sessionId: string | undefined, paths: string[]): void {
  if (!sessionId || paths.length === 0) return
  const existing = pendingAttachmentPathsBySession.get(sessionId) ?? []
  pendingAttachmentPathsBySession.set(sessionId, [...existing, ...paths])
}

export function clearPendingAttachmentsForSession(sessionId?: string | null): void {
  if (!sessionId) return
  pendingAttachmentPathsBySession.delete(sessionId)
}

export function consumePendingAttachmentsForSession(sessionId?: string | null): string[] {
  if (!sessionId) return []
  const pending = pendingAttachmentPathsBySession.get(sessionId) ?? []
  pendingAttachmentPathsBySession.delete(sessionId)
  return pending
}

export function dispatchAttachFilePathsEvent(detail: AttachFilePathsEventDetail): void {
  queuePendingAttachmentsForSession(detail.sessionId, detail.paths)
  window.dispatchEvent(new CustomEvent<AttachFilePathsEventDetail>('craft:attach-file-paths', { detail }))
}

export function __resetPendingAttachmentsForTests(): void {
  pendingAttachmentPathsBySession.clear()
}
