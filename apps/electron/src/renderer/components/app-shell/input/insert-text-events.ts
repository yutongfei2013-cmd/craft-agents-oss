export interface InsertTextEventDetail {
  text: string
  sessionId?: string
  mode?: 'replace' | 'append'
}

const pendingInsertTextBySession = new Map<string, InsertTextEventDetail[]>()

export function queuePendingInsertTextForSession(detail: InsertTextEventDetail): void {
  if (!detail.sessionId || !detail.text) return
  const existing = pendingInsertTextBySession.get(detail.sessionId) ?? []
  pendingInsertTextBySession.set(detail.sessionId, [...existing, detail])
}

export function clearPendingInsertTextForSession(sessionId?: string | null): void {
  if (!sessionId) return
  pendingInsertTextBySession.delete(sessionId)
}

export function consumePendingInsertTextForSession(sessionId?: string | null): InsertTextEventDetail[] {
  if (!sessionId) return []
  const pending = pendingInsertTextBySession.get(sessionId) ?? []
  pendingInsertTextBySession.delete(sessionId)
  return pending
}

export function dispatchInsertTextEvent(detail: InsertTextEventDetail): void {
  queuePendingInsertTextForSession(detail)
  window.dispatchEvent(new CustomEvent<InsertTextEventDetail>('craft:insert-text', { detail }))
}

export function __resetPendingInsertTextForTests(): void {
  pendingInsertTextBySession.clear()
}
