import { useState } from 'react'
import { Globe, Sparkle } from '@phosphor-icons/react'
import { api } from '../api'
import { CONVERSATION_SHARE_OPEN_TASK_KEY } from '../conversationShare'

export function ArtifactShareView() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
  const name = params.get('name') || 'popagent 预览'
  const remixEnabled = params.get('remix') === '1'
  const [creatingRemix, setCreatingRemix] = useState(false)

  const makeRemix = async () => {
    if (creatingRemix) return
    setCreatingRemix(true)
    try {
      const prompt = `参考「${name}」做一个同款`
      const { id } = await api.createTask(`做同款：${name}`)
      sessionStorage.setItem('pendingMessage:' + id, JSON.stringify({ text: prompt }))
      sessionStorage.setItem(CONVERSATION_SHARE_OPEN_TASK_KEY, id)
      window.location.assign(new URL('./', window.location.href).href)
    } catch { setCreatingRemix(false) }
  }

  return (
    <main className="artifact-share-page">
      {remixEnabled && (
        <div className="conversation-share-card">
          <header className="conversation-share-main-header">
            <div className="chat-title">{name}</div>
            <div className="conversation-share-meta">
              <span className="conversation-share-avatar">X</span>
              <span>来自 <strong>XAgent</strong></span>
              <button type="button" className="artifact-share-remix-btn" onClick={makeRemix} disabled={creatingRemix}>
                <Sparkle size={14} weight="fill" />
                <span>{creatingRemix ? '正在创建…' : '做同款'}</span>
              </button>
            </div>
          </header>
        </div>
      )}
      <section className="artifact-share-canvas">
        <div className="artifact-share-hero"><small>WEBSITE PREVIEW</small><h1>{name}</h1><p>这是一个可直接访问的产物分享页面，内容与右侧预览保持一致。</p><div className="artifact-share-tags"><span><Globe size={15} />网站</span><span>示例页面</span></div></div>
        <div className="artifact-share-grid"><div><span>本周播放</span><strong>128.4 万</strong><em>+18.6%</em></div><div><span>互动率</span><strong>6.8%</strong><em>+1.2pct</em></div><div><span>5 秒留存</span><strong>42.3%</strong><em>+4.7pct</em></div></div>
        <div className="artifact-share-section"><h2>内容表现概览</h2><p>这里展示分享产物中的核心信息和可视化结果。</p><div className="artifact-share-bars">{[48,72,58,86,66,94,78].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div>
      </section>
    </main>
  )
}
