import { Icon } from '../components/Icon'

const SHARED_MESSAGES = [
  { role: 'user', text: '帮我分析一下最近作品的表现，重点看看播放和互动为什么下降。', time: '8月26日 10:18' },
  { role: 'assistant', text: '我看了最近一周的作品数据。播放下降主要集中在前 3 秒流失，封面点击率也比上周低 8%。互动率相对稳定，说明内容本身仍有吸引力，当前更需要优化封面与开头。', time: '8月26日 10:19' },
  { role: 'user', text: '给我一个可以直接执行的优化方案。', time: '8月26日 10:20' },
  { role: 'assistant', text: '建议先执行三项调整：第一，封面只保留一个核心利益点；第二，开头 3 秒直接展示结果；第三，把评论区高频问题放进下一条作品。连续测试 3 条后，再比较点击率、5 秒留存和互动率。', time: '8月26日 10:21' },
] as const

export function ConversationShareView() {
  return (
    <main className="conversation-share-page">
      <header className="conversation-share-header">
        <div className="conversation-share-brand"><span>P</span><strong>Pop Agent</strong></div>
        <div className="conversation-share-readonly"><Icon name="lock" cls="ic" />只读分享</div>
      </header>
      <section className="conversation-share-card">
        <div className="conversation-share-title">
          <span>分享的对话</span>
          <h1>作品表现分析与优化建议</h1>
          <p>由 Pop Agent 生成 · 2026年8月26日</p>
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
        <footer className="conversation-share-footer">此页面为分享快照，内容不会随原对话更新</footer>
      </section>
    </main>
  )
}
