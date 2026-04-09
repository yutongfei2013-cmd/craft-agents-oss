import type { Session } from '../../shared/types'

const FORCE_PROMPT_COMMANDS = new Set([
  'test-pop',
])

const CONTINUATION_PATTERNS = [
  /^(继续|展开|细说|详细说说|接着|继续上面|按上面|基于上面|改一下上面|调整一下上面)/i,
  /^(continue|expand|elaborate|based on that|based on the above|revise that|tweak that)/i,
]

const STOPWORDS = new Set([
  '的', '了', '是', '我', '你', '他', '她', '它', '们', '和', '跟', '与', '及', '把', '将', '在', '对', '给', '用', '要', '想', '请', '帮', '帮我', '一个', '一下', '这个', '那个', '现在', '还有', '以及',
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'from', 'into', 'onto', 'that', 'this', 'these', 'those', 'please', 'help', 'about', 'what', 'how', 'why', 'can', 'could', 'would', 'should', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at', 'by', 'it', 'we', 'you', 'they',
])

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9._/-]{1,}|[\u4e00-\u9fff]{2,}/g) || [])
    .filter(token => !STOPWORDS.has(token))
}

function buildSessionContextText(session: Session): string {
  const title = session.name || ''
  const recentMessages = (session.messages || [])
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .slice(-6)
    .map(message => message.content)
    .join('\n')

  return [title, recentMessages].filter(Boolean).join('\n')
}

export function shouldPromptForNewSession(session: Session | null | undefined, message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return false
  if (FORCE_PROMPT_COMMANDS.has(trimmed.toLowerCase())) return true
  if (!session) return false

  const meaningfulMessages = (session.messages || []).filter(
    m => m.role === 'user' || m.role === 'assistant'
  )
  if (meaningfulMessages.length < 2) return false

  if (trimmed.length < 16) return false
  if (CONTINUATION_PATTERNS.some(pattern => pattern.test(trimmed))) return false

  const inputTokens = tokenize(trimmed)
  if (inputTokens.length < 3) return false

  const contextTokens = new Set(tokenize(buildSessionContextText(session)))
  if (contextTokens.size === 0) return false

  const overlap = inputTokens.filter(token => contextTokens.has(token))
  const overlapRatio = overlap.length / inputTokens.length

  return overlap.length === 0 || overlapRatio < 0.2
}
