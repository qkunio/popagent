import { useState } from 'react'
import { Icon } from '../components/Icon'
import { api } from '../api'
import { CONVERSATION_SHARE_OPEN_TASK_KEY } from '../conversationShare'
import { ArrowSquareOut, DownloadSimple, FileText, Globe } from '@phosphor-icons/react'

const SHARED_MESSAGES = [
  { role: 'user', text: '做一个 demo.md' },
  { role: 'assistant', text: '已创建：artifacts/demo.md。\n\n这份文档包含项目简介、使用方式和一段完整的示例代码，打开后可以直接继续编辑。' },
  { role: 'user', text: '做一个网站' },
  { role: 'assistant', text: '已创建网站预览。\n\n页面包含首页展示和数据卡片，并针对桌面端与移动端做了响应式布局，可以直接打开查看效果。' },
  { role: 'user', text: '再生成一份项目说明文件' },
  { role: 'assistant', text: '项目说明文件已经整理完成，包含结构说明和使用建议。' },
  { role: 'user', text: '再做一个数据看板网站' },
  { role: 'assistant', text: '数据看板网站已经生成，预览中可以切换不同页面。' },
] as const

const DEMO_APPS = [
  { id: 'popagent', name: 'popagent 预览', type: '网站', accent: 'blue' },
  { id: 'insight', name: '作品数据洞察', type: '数据看板', accent: 'violet' },
  { id: 'assistant', name: '作者增长助手', type: 'Agent', accent: 'green' },
] as const
const FILE_APPS = [
  { id: 'demo-md', name: 'demo.md', type: '文件', accent: 'blue' },
  { id: 'project-readme', name: '项目说明.md', type: '文件', accent: 'violet' },
  { id: 'usage-notes', name: '使用指南.md', type: '文件', accent: 'green' },
] as const

export function ConversationShareView() {
  const [creatingChat, setCreatingChat] = useState(false)
  const [previewApp, setPreviewApp] = useState<string | null>(null)
  const [previewKind, setPreviewKind] = useState<'file' | 'website'>('website')
  const [appMenuOpen, setAppMenuOpen] = useState(false)

  const activeApps = previewKind === 'file' ? FILE_APPS : DEMO_APPS
  const selectedPreview = activeApps.find(app => app.id === previewApp) || activeApps[0]

  const downloadFile = () => {
    const blobUrl = URL.createObjectURL(new Blob(['# demo.md\n\n这是一个示例文件。'], { type: 'text/markdown' }))
    const link = document.createElement('a'); link.href = blobUrl; link.download = selectedPreview.name; link.click(); URL.revokeObjectURL(blobUrl)
  }

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
    <main className={'conversation-share-page' + (previewApp ? ' has-preview' : '')}>
      <section className="conversation-share-card">
        <header className="conversation-share-main-header">
          <div className="chat-title">作品表现分析与优化建议</div>
          <div className="conversation-share-meta"><span className="conversation-share-avatar">X</span><span>来自 <strong>XAgent</strong></span></div>
        </header>
        <div className="conversation-share-messages">
          {SHARED_MESSAGES.map((message, index) => (
            <div className="conversation-share-message-group" key={`${message.role}-${index}`}>
              <article className={`conversation-share-message ${message.role}`}>
                <div>
                  <div className="conversation-share-bubble">{message.text.includes('artifacts/demo.md') ? <><span>已创建：</span><a href="#" className="conversation-share-artifact-link" onClick={event => { event.preventDefault(); setPreviewKind('file'); setPreviewApp('demo-md') }}>artifacts/demo.md</a><span>。</span><br /><br /><span>这份文档包含项目简介、使用方式和一段完整的示例代码，打开后可以直接继续编辑。</span></> : message.text}</div>
                </div>
              </article>
              {index === 1 && <button type="button" className="conversation-share-preview-card" onClick={() => { setPreviewKind('file'); setPreviewApp(previewApp === 'demo-md' ? null : 'demo-md') }}>
                <span className="conversation-share-preview-icon" aria-hidden="true"><FileText size={25} weight="regular" /></span>
                <span className="conversation-share-preview-copy"><strong>demo.md</strong><small>文件</small></span>
                <Icon name="caret-right" cls="ic" />
              </button>}
              {index === 3 && <button type="button" className="conversation-share-preview-card" onClick={() => { setPreviewKind('website'); setPreviewApp(previewApp === 'popagent' ? null : 'popagent') }}>
                <span className="conversation-share-preview-icon website-icon" aria-hidden="true"><Globe size={25} weight="regular" /></span>
                <span className="conversation-share-preview-copy"><strong>popagent 预览</strong><small>网站</small></span>
                <Icon name="caret-right" cls="ic" />
              </button>}
              {index === 5 && <button type="button" className="conversation-share-preview-card" onClick={() => { setPreviewKind('file'); setPreviewApp('project-readme') }}>
                <span className="conversation-share-preview-icon" aria-hidden="true"><FileText size={25} weight="regular" /></span><span className="conversation-share-preview-copy"><strong>项目说明.md</strong><small>文件</small></span><Icon name="caret-right" cls="ic" />
              </button>}
              {index === 7 && <button type="button" className="conversation-share-preview-card" onClick={() => { setPreviewKind('website'); setPreviewApp('insight') }}>
                <span className="conversation-share-preview-icon website-icon" aria-hidden="true"><Globe size={25} weight="regular" /></span><span className="conversation-share-preview-copy"><strong>数据看板预览</strong><small>网站</small></span><Icon name="caret-right" cls="ic" />
              </button>}
            </div>
          ))}
        </div>
      </section>
      {previewApp && <>
        <aside className="conversation-share-preview-panel" aria-label="应用预览">
          <div className="conversation-share-app-switcher">
            <button type="button" className="conversation-share-app-switcher-btn" aria-label="切换应用" aria-expanded={appMenuOpen} onClick={() => setAppMenuOpen(open => !open)}><span>{selectedPreview.name}</span><Icon name="caret-down" cls="ic" /></button>
            {appMenuOpen && <div className="conversation-share-app-menu" role="listbox"><div className="conversation-share-app-caption">{previewKind === 'file' ? '文件' : '网站'}</div>{activeApps.map(app => <button type="button" role="option" aria-selected={app.id === selectedPreview.id} className={app.id === selectedPreview.id ? 'on' : ''} key={app.id} onClick={() => { setPreviewApp(app.id); setAppMenuOpen(false) }}>{app.name}</button>)}</div>}
            <div className="conversation-share-preview-actions">
              <button type="button" aria-label={previewKind === 'file' ? '下载文件' : '打开链接'} title={previewKind === 'file' ? '下载' : '打开链接'} onClick={previewKind === 'file' ? downloadFile : () => window.open(window.location.href, '_blank')}>
                {previewKind === 'file' ? <DownloadSimple size={18} weight="regular" /> : <ArrowSquareOut size={18} weight="regular" />}
              </button>
              <button type="button" aria-label="收起分栏" title="收起分栏" onClick={() => setPreviewApp(null)}><Icon name="columns" cls="ic" /></button>
            </div>
          </div>
          <div className={'conversation-share-demo-preview accent-' + selectedPreview.accent}>
            <div className="conversation-share-demo-hero"><small>{selectedPreview.type} · 只读预览</small><h2>{selectedPreview.name}</h2><p>把关键数据、趋势和下一步行动集中在一个清晰的工作台里。</p></div>
            <div className="conversation-share-demo-grid"><div><span>本周播放</span><strong>128.4 万</strong><em>+18.6%</em></div><div><span>互动率</span><strong>6.8%</strong><em>+1.2pct</em></div><div><span>5 秒留存</span><strong>42.3%</strong><em>+4.7pct</em></div></div>
            <div className="conversation-share-demo-section"><h3>内容表现概览</h3><div className="conversation-share-demo-bars"><i style={{ height: '48%' }} /><i style={{ height: '72%' }} /><i style={{ height: '58%' }} /><i style={{ height: '86%' }} /><i style={{ height: '66%' }} /><i style={{ height: '94%' }} /><i style={{ height: '78%' }} /></div></div>
          </div>
        </aside>
      </>}
      <button type="button" className="conversation-share-continue" onClick={continueInXAgent} disabled={creatingChat}>
        <Icon name="sparkles" cls="ic" />
        <span>{creatingChat ? '正在创建新会话…' : '在 XAgent 里继续聊'}</span>
        <Icon name="arrow-right" cls="ic arrow" />
      </button>
    </main>
  )
}
