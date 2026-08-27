export const CONVERSATION_SHARE_OPEN_TASK_KEY = 'conversationShare:openTask'

export function getConversationShareUrl() {
  if (typeof window === 'undefined') return '#/share/conversation'
  const base = new URL('./', window.location.href)
  base.hash = ''
  base.search = ''
  return `${base.href}#/share/conversation`
}
