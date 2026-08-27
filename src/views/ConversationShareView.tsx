import { useState } from 'react'
import { Icon } from '../components/Icon'
import { api } from '../api'
import { CONVERSATION_SHARE_OPEN_TASK_KEY } from '../conversationShare'

const SHARED_MESSAGES = [
  { role: 'user', text: '帮我分析一下最近作品的表现，重点看看播放和互动为什么下降。', time: '8月26日 10:18' },
  { role: 'assistant', text: '我看了最近一周的作品数据。播放下降主要集中在前 3 秒流失，封面点击率也比上周低 8%。互动率相对稳定，说明内容本身仍有吸引力，当前更需要优化封面与开头。', time: '8月26日 10:19' },
  { role: 'user', text: '给我一个可以直接执行的优化方案。', time: '8月26日 10:20' },
  { role: 'assistant', text: '建议先执行三项调整：第一，封面只保留一个核心利益点；第二，开头 3 秒直接展示结果；第三，把评论区高频问题放进下一条作品。连续测试 3 条后，再比较点击率、5 秒留存和互动率。', time: '8月26日 10:21' },
] as const

export function ConversationShareView() {
  const [creatingChat, setCreatingChat] = useState(false)

  const continueInXAgent = async () => {
    if (creatingChat) return
    setCreatingChat(true)
    try {
      const { id } = await api.createTaskWithMessages(
        '作品表现分析与优化建议',
        SHARED_MESSAGES.map(message => ({ role: message.role, content: message.text })),
      )
      sessionStorage.setItem(CONVERSATION_SHARE_OPEN_TASK_KEY, id)
      const homeUrl = new URL('./', window.location.href)
      homeUrl.hash = ''
      homeUrl.search = ''
      window.location.assign(homeUrl.href)
    } catch {
      setCreatingChat(false)
    }
  }

  return (
    <main className="conversation-share-page">
      <header className="conversation-share-header">
        <div className="conversation-share-brand"><span>X</span><strong>XAgent</strong></div>
      </header>
      <section className="conversation-share-card">
        <div className="conversation-share-title">
          <h1>作品表现分析与优化建议</h1>
          <p className="conversation-share-summary">围绕近期作品播放与互动变化，定位下降原因，并整理可以直接执行的优化方案。</p>
          <div className="conversation-share-meta">
            <span className="conversation-share-avatar">X</span>
            <span>来自 <strong>XAgent</strong></span>
          </div>
        </div>
        <div className="conversation-share-messages">
          {SHARED_MESSAGES.map((message, index) => (
            <article className={`conversation-share-message ${message.role}`} key={`${message.role}-${index}`}>
              {message.role === 'assistant' && <span className="conversation-share-agent"><Icon name="sparkles" cls="ic" /></span>}
              <div>
                <div className="conversation-share-bubble">{message.text}</div>
                <time>{message.time}</time>
              </div>
            </article>
          ))}
        </div>
      </section>
      <button type="button" className="conversation-share-continue" onClick={continueInXAgent} disabled={creatingChat}>
        <Icon name="sparkles" cls="ic" />
        <span>{creatingChat ? '正在创建新会话…' : '在 XAgent 里继续聊'}</span>
        <Icon name="arrow-right" cls="ic arrow" />
      </button>
    </main>
  )
}
