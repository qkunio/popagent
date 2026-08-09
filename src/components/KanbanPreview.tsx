import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { SharePagePreview } from './SharePagePreview'
import { SharePopover } from './SharePopover'
import { SkillDetailDialog } from './SkillDetailDialog'
import type { AgentPreview, AppPreview, KanbanPreview as KanbanPreviewData, WebpagePreview } from '../types'
import type { AppPreviewItem } from '../views/TaskView'
import { ensureAgentDefaultSkills, readSkillLibrary, toggleLibrarySkillInstalled, useSkillLibrary } from '../skillLibraryStore'

interface Props {
  data: AppPreview | null
  empty?: string
  apps: AppPreviewItem[]
  currentAppId: string | null
  onSelectApp: (id: string) => void
  onClose?: () => void
  onInternetShare?: () => void
}

type WorkspaceTabId = 'preview' | 'code' | 'config' | 'evolution' | 'service' | 'history'

const WORKSPACE_TAB_DEFS: Array<{ id: WorkspaceTabId; label: string; icon: string }> = [
  { id: 'preview', label: '预览', icon: 'columns' },
  { id: 'code', label: '代码', icon: 'code' },
  { id: 'config', label: '配置', icon: 'gauge' },
  { id: 'evolution', label: '进化', icon: 'arrow-clockwise' },
  { id: 'service', label: '服务', icon: 'cloud' },
  { id: 'history', label: '版本历史', icon: 'clock-clockwise' },
]

function previewTitle(p: AppPreview | null | undefined): string {
  if (!p) return '未命名应用'
  if (p.type === 'sharepage') return p.cover.title || '分享页面'
  if (p.type === 'agent') return p.name || 'Agent 应用'
  return p.title || '未命名 WebApp'
}

function AgentTestPreview({ data, agentKey }: { data: AgentPreview; agentKey: string }) {
  const librarySkills = useSkillLibrary()
  const initialSystemPrompt = `你是「${data.name}」。${data.description}\n\n请理解用户的目标，优先调用已配置的技能，并给出清晰、可执行的回答。`
  const [view, setView] = useState<'profile' | 'chat'>('profile')
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt)
  const [promptDraft, setPromptDraft] = useState(initialSystemPrompt)
  const [promptSaved, setPromptSaved] = useState(false)
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null)
  const [skillScroll, setSkillScroll] = useState({ size: 28, top: 0 })
  const [skillScrollVisible, setSkillScrollVisible] = useState(false)
  const [skillFilter, setSkillFilter] = useState<'all' | 'installed' | 'uninstalled'>('installed')
  const [skillFilterOpen, setSkillFilterOpen] = useState(false)
  const [skillSearchOpen, setSkillSearchOpen] = useState(false)
  const [skillQuery, setSkillQuery] = useState('')
  const [testedSystemPrompt, setTestedSystemPrompt] = useState(initialSystemPrompt)
  const [testedSkillSignature, setTestedSkillSignature] = useState('')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Array<{ id: number; role: 'user' | 'agent'; text: string; streaming?: boolean }>>([])
  const [streaming, setStreaming] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const nextId = useRef(0)
  const streamTimerRef = useRef<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const clearAnchorRef = useRef<HTMLDivElement>(null)
  const skillScrollRef = useRef<HTMLDivElement>(null)
  const skillScrollTimerRef = useRef<number | null>(null)
  const skillFilterRef = useRef<HTMLDivElement>(null)
  const skillSearchInputRef = useRef<HTMLInputElement>(null)

  const stopStreaming = () => {
    if (streamTimerRef.current !== null) {
      window.clearTimeout(streamTimerRef.current)
      streamTimerRef.current = null
    }
    setStreaming(false)
  }

  useEffect(() => () => {
    if (streamTimerRef.current !== null) window.clearTimeout(streamTimerRef.current)
    if (skillScrollTimerRef.current !== null) window.clearTimeout(skillScrollTimerRef.current)
  }, [])

  useEffect(() => {
    const body = bodyRef.current
    if (body) body.scrollTop = body.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!clearConfirmOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!clearAnchorRef.current?.contains(event.target as Node)) setClearConfirmOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [clearConfirmOpen])

  useEffect(() => {
    if (!skillFilterOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!skillFilterRef.current?.contains(event.target as Node)) setSkillFilterOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [skillFilterOpen])

  useEffect(() => {
    if (skillSearchOpen) skillSearchInputRef.current?.focus()
  }, [skillSearchOpen])

  useEffect(() => {
    const context = `${data.name} ${data.description}`
    const recommendedSkillIds = /热点|热榜|趋势/.test(context)
      ? ['hotspot', 'trend', 'creator-info']
      : ['creator-info', 'rules', 'trend']
    ensureAgentDefaultSkills(agentKey, recommendedSkillIds)
    setTestedSystemPrompt(initialSystemPrompt)
    setTestedSkillSignature(readSkillLibrary().filter(skill => skill.installed).map(skill => skill.id).sort().join('|'))
  }, [agentKey, data.name, data.description])

  useEffect(() => {
    const element = skillScrollRef.current
    if (!element || view !== 'profile') return
    const update = () => {
      const size = Math.max(18, Math.min(100, element.clientHeight / Math.max(element.scrollHeight, 1) * 100))
      const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 1)
      setSkillScroll({ size, top: element.scrollTop / maxScroll * (100 - size) })
    }
    const frame = window.requestAnimationFrame(update)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => { window.cancelAnimationFrame(frame); observer.disconnect() }
  }, [librarySkills, view, skillFilter, skillQuery])

  const send = () => {
    const text = draft.trim()
    if (!text || streaming) return
    const userId = ++nextId.current
    const agentId = ++nextId.current
    const reply = Array.from(`收到：「${text}」\n\n这是 Agent 应用的测试回复。你可以继续描述希望它具备的能力。`)
    let cursor = 0
    setMessages(prev => [
      ...prev,
      { id: userId, role: 'user', text },
      { id: agentId, role: 'agent', text: '', streaming: true },
    ])
    setDraft('')
    setStreaming(true)

    const pushNextChunk = () => {
      const chunkSize = cursor < 8 ? 1 : 2
      const chunk = reply.slice(cursor, cursor + chunkSize).join('')
      cursor += chunkSize
      const done = cursor >= reply.length
      setMessages(prev => prev.map(message => (
        message.id === agentId
          ? { ...message, text: message.text + chunk, streaming: !done }
          : message
      )))
      if (done) {
        streamTimerRef.current = null
        setStreaming(false)
        return
      }
      streamTimerRef.current = window.setTimeout(pushNextChunk, 34)
    }

    streamTimerRef.current = window.setTimeout(pushNextChunk, 180)
  }

  const clearMessages = () => {
    stopStreaming()
    setMessages([])
  }

  const requestClearMessages = () => {
    setClearConfirmOpen(true)
  }

  const confirmClearMessages = () => {
    setClearConfirmOpen(false)
    clearMessages()
  }

  const saveSystemPrompt = () => {
    const nextPrompt = promptDraft.trim()
    if (!nextPrompt) return
    setSystemPrompt(nextPrompt)
    setEditingPrompt(false)
    setPromptSaved(true)
    window.setTimeout(() => setPromptSaved(false), 1600)
  }

  const toggleSkill = (skillId: string) => {
    toggleLibrarySkillInstalled(skillId)
  }

  const installedSkillSignature = librarySkills.filter(skill => skill.installed).map(skill => skill.id).sort().join('|')
  const agentConfigChanged = systemPrompt !== testedSystemPrompt || installedSkillSignature !== testedSkillSignature

  const clearHistoryForCurrentConfig = () => {
    clearMessages()
    setTestedSystemPrompt(systemPrompt)
    setTestedSkillSignature(installedSkillSignature)
  }

  const normalizedSkillQuery = skillQuery.trim().toLowerCase()
  const visibleAgentSkills = librarySkills.filter(skill => {
    const matchesStatus = skillFilter === 'all' || (skillFilter === 'installed' ? skill.installed : !skill.installed)
    const matchesQuery = !normalizedSkillQuery || skill.name.toLowerCase().includes(normalizedSkillQuery) || skill.description.toLowerCase().includes(normalizedSkillQuery)
    return matchesStatus && matchesQuery
  })

  if (view === 'profile') {
    return (
      <section className="agent-profile" aria-label={`${data.name} 配置卡片`}>
        <div className="agent-profile-scroll">
          <article className="agent-business-card">
            <header className="agent-business-head">
              <span className="agent-business-icon-ring" aria-hidden="true">
                <svg className="agent-bot-icon agent-business-bot-icon" viewBox="0 0 24 24">
                  <path d="M8 7h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z" />
                  <path d="M12 4v3M9 12h.01M15 12h.01M9 16h6M3 12h2M19 12h2" />
                </svg>
              </span>
              <h1>{data.name}</h1>
            </header>

            <section className="agent-business-section agent-prompt-card">
              <header>
                <h2>系统提示词</h2>
                {editingPrompt ? (
                  <div className="agent-prompt-head-actions">
                    <button type="button" className="agent-text-action agent-prompt-cancel" onClick={() => { setPromptDraft(systemPrompt); setEditingPrompt(false) }}>取消</button>
                    <button type="button" className="agent-text-action agent-prompt-save" disabled={!promptDraft.trim()} onClick={saveSystemPrompt}>保存</button>
                  </div>
                ) : (
                  <button type="button" className="agent-text-action" onClick={() => { setPromptDraft(systemPrompt); setEditingPrompt(true) }}><Icon name="pencil-simple" cls="ic" />编辑</button>
                )}
              </header>
              {editingPrompt ? (
                <div className="agent-prompt-editor">
                  <textarea value={promptDraft} onChange={event => setPromptDraft(event.target.value)} aria-label="系统提示词" autoFocus />
                </div>
              ) : <div className="agent-prompt-view">{systemPrompt}</div>}
              {promptSaved && <span className="agent-saved-note"><Icon name="check-circle" cls="ic" />已保存</span>}
            </section>

            <section className="agent-business-section agent-skills-card">
              <header>
                <h2>技能</h2>
                <div className="agent-skill-tools">
                  <div className={'agent-skill-search' + (skillSearchOpen ? ' open' : '')}>
                    <button type="button" className="agent-skill-search-trigger" aria-label="搜索技能" onClick={() => setSkillSearchOpen(true)}><Icon name="magnifying-glass" cls="ic" /></button>
                    <input ref={skillSearchInputRef} value={skillQuery} onChange={event => setSkillQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setSkillQuery(''); setSkillSearchOpen(false) } }} placeholder="搜索技能" aria-label="搜索 Agent 技能" />
                    {skillSearchOpen && <button type="button" className="agent-skill-search-close" aria-label="收起搜索" onClick={() => { setSkillQuery(''); setSkillSearchOpen(false) }}><Icon name="x" cls="ic" /></button>}
                  </div>
                  <div className="agent-skill-filter-anchor" ref={skillFilterRef}>
                    <button type="button" className="agent-skill-filter-button" aria-haspopup="menu" aria-expanded={skillFilterOpen} onClick={() => setSkillFilterOpen(value => !value)}>
                      <Icon name="funnel" cls="ic" />{skillFilter === 'installed' ? '已添加' : skillFilter === 'uninstalled' ? '未添加' : '全部'}
                    </button>
                    {skillFilterOpen && (
                      <div className="agent-skill-filter-menu" role="menu">
                        {([
                          ['all', '全部'],
                          ['installed', '已添加'],
                          ['uninstalled', '未添加'],
                        ] as const).map(([value, label]) => (
                          <button type="button" role="menuitemradio" aria-checked={skillFilter === value} key={value} onClick={() => { setSkillFilter(value); setSkillFilterOpen(false) }}>
                            <span>{label}</span>{skillFilter === value && <Icon name="check" cls="ic" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </header>
              <div className="agent-skill-scroll-shell">
                <div className="agent-skill-grid" ref={skillScrollRef} onScroll={event => {
                  const element = event.currentTarget
                  const size = Math.max(18, Math.min(100, element.clientHeight / Math.max(element.scrollHeight, 1) * 100))
                  const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 1)
                  setSkillScroll({ size, top: element.scrollTop / maxScroll * (100 - size) })
                  setSkillScrollVisible(true)
                  if (skillScrollTimerRef.current !== null) window.clearTimeout(skillScrollTimerRef.current)
                  skillScrollTimerRef.current = window.setTimeout(() => {
                    setSkillScrollVisible(false)
                    skillScrollTimerRef.current = null
                  }, 700)
                }}>
                  {visibleAgentSkills.map(skill => {
                    const selected = Boolean(skill.installed)
                    return (
                      <article className="skill-library-card agent-library-skill-card clickable" key={skill.id} role="button" tabIndex={0} onClick={() => setDetailSkillId(skill.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setDetailSkillId(skill.id) }}>
                        <div className="agent-skill-copy">
                          <h3 title={skill.name}>{skill.name}</h3>
                          <span className="agent-skill-inline-action">
                            <button type="button" className={'skill-install agent-skill-toggle' + (selected ? ' installed' : '')} title={selected ? '已添加' : '添加'} aria-label={selected ? `移除${skill.name}` : `添加${skill.name}`} onClick={event => { event.stopPropagation(); toggleSkill(skill.id) }} aria-pressed={selected}>
                              <Icon name={selected ? 'check' : 'plus'} cls="ic" />
                            </button>
                          </span>
                          <p>{skill.description}</p>
                        </div>
                      </article>
                    )
                  })}
                  {visibleAgentSkills.length === 0 && <div className="agent-skill-filter-empty">暂无符合条件的技能</div>}
                </div>
                <div className={'agent-skill-scrollbar' + (skillScrollVisible ? ' visible' : '')} aria-hidden="true"><span style={{ height: `${skillScroll.size}%`, top: `${skillScroll.top}%` }} /></div>
              </div>
            </section>

            <button type="button" className="agent-chat-launch" onClick={() => setView('chat')}>
              <Icon name="chat-circle-text" cls="ic" /><strong>和「{data.name}」对话</strong><Icon name="arrow-right" cls="ic arrow" />
            </button>
          </article>
        </div>
        <SkillDetailDialog skill={librarySkills.find(skill => skill.id === detailSkillId) || null} onClose={() => setDetailSkillId(null)} />
      </section>
    )
  }

  return (
    <section className="agent-test" aria-label={data.name}>
      <header className="agent-test-head">
        <div className="agent-test-title">
          <button type="button" className="agent-back-card" aria-label="返回 Agent 卡片" onClick={() => setView('profile')}><Icon name="arrow-right" cls="ic" /></button>
          <svg className="agent-bot-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 7h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z" />
            <path d="M12 4v3M9 12h.01M15 12h.01M9 16h6M3 12h2M19 12h2" />
          </svg>
          <span>{data.name}</span>
        </div>
        <div className="agent-clear-anchor" ref={clearAnchorRef}>
          <button
            type="button"
            className="agent-clear"
            aria-label="清空测试消息"
            title="清空测试消息"
            aria-expanded={clearConfirmOpen}
            onClick={requestClearMessages}
          >
            <svg className="agent-plus-circle" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a8,8,0,0,1-8,8H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32A8,8,0,0,1,176,128Z" />
            </svg>
          </button>
          {clearConfirmOpen && (
            <section className="agent-clear-popover" role="dialog" aria-labelledby="agent-clear-title">
              <h3 id="agent-clear-title">清空所有测试消息？</h3>
              <div className="agent-clear-dialog-actions">
                <button type="button" className="confirm" onClick={confirmClearMessages}>确认</button>
              </div>
            </section>
          )}
        </div>
      </header>

      <div ref={bodyRef} className={'agent-test-body' + (messages.length ? ' has-messages' : '')}>
        {messages.length === 0 ? (
          <div className="agent-empty">
            <Icon name="chat-circle-text" cls="agent-empty-icon" />
            <span>{data.welcome}</span>
          </div>
        ) : (
          <div className="agent-messages" aria-live="polite">
            {messages.map(message => (
              <div key={message.id} className={'agent-message ' + message.role}>
                <div className="agent-message-bubble">
                  {message.text}
                  {message.streaming && <span className="agent-stream-caret" aria-label="正在生成" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="agent-composer">
        {agentConfigChanged ? (
          <div className="agent-config-change-notice">
            <div className="agent-config-change-copy">
              <Icon name="info" cls="ic" />
              <span>Agent的系统提示词/Skill发生了变化，如需测试请清空历史记录</span>
            </div>
            <button type="button" className="agent-config-clear-button" onClick={clearHistoryForCurrentConfig}>清空</button>
          </div>
        ) : (
          <>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder={streaming ? 'Agent 正在回复…' : data.placeholder}
              aria-label={data.placeholder}
              disabled={streaming}
            />
            <button type="button" onClick={send} disabled={!draft.trim() || streaming} aria-label="发送消息">
              <Icon name="paper-plane-tilt" cls="ic" />
            </button>
          </>
        )}
      </div>

    </section>
  )
}

export function KanbanPreview({ data, empty, apps, currentAppId, onSelectApp, onClose, onInternetShare }: Props) {
  type WebApprovalStatus = 'idle' | 'reviewing' | 'approved'
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [webApprovalOpen, setWebApprovalOpen] = useState(false)
  const [webApprovalReason, setWebApprovalReason] = useState('')
  const [webApprovalStatus, setWebApprovalStatus] = useState<WebApprovalStatus>('idle')
  const [webLinkCopied, setWebLinkCopied] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [tabsByApp, setTabsByApp] = useState<Record<string, WorkspaceTabId[]>>({})
  const [activeTabByApp, setActiveTabByApp] = useState<Record<string, WorkspaceTabId | null>>({})
  const menuRef = useRef<HTMLDivElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const shareAnchorRef = useRef<HTMLDivElement>(null)
  const copyTimerRef = useRef<number | null>(null)
  const approvalTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!menuOpen && !addMenuOpen) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (!menuRef.current?.contains(target)) setMenuOpen(false)
      if (!addMenuRef.current?.contains(target)) setAddMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen, addMenuOpen])

  useEffect(() => {
    setWebApprovalOpen(false)
    setWebApprovalReason('')
    setWebApprovalStatus('idle')
    if (approvalTimerRef.current !== null) {
      window.clearTimeout(approvalTimerRef.current)
      approvalTimerRef.current = null
    }
  }, [data])

  useEffect(() => () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    if (approvalTimerRef.current !== null) window.clearTimeout(approvalTimerRef.current)
  }, [])

  const currentApp = apps.find(a => a.id === currentAppId) || apps[apps.length - 1] || null
  const appKey = currentApp?.id || '__empty__'
  const workspaceTabs = tabsByApp[appKey] || ['preview']
  const requestedActiveTab = activeTabByApp[appKey]
  const activeWorkspaceTab = requestedActiveTab !== undefined && requestedActiveTab !== null && workspaceTabs.includes(requestedActiveTab)
    ? requestedActiveTab
    : workspaceTabs[0] || null

  const openWorkspaceTab = (tabId: WorkspaceTabId) => {
    setTabsByApp(previous => {
      const current = previous[appKey] || ['preview']
      return current.includes(tabId) ? previous : { ...previous, [appKey]: [...current, tabId] }
    })
    setActiveTabByApp(previous => ({ ...previous, [appKey]: tabId }))
    setAddMenuOpen(false)
  }

  const closeWorkspaceTab = (tabId: WorkspaceTabId) => {
    const current = tabsByApp[appKey] || ['preview']
    const closingIndex = current.indexOf(tabId)
    const next = current.filter(id => id !== tabId)
    setTabsByApp(previous => ({ ...previous, [appKey]: next }))
    setActiveTabByApp(previous => {
      if (previous[appKey] !== tabId && activeWorkspaceTab !== tabId) return previous
      const fallback = next[Math.min(closingIndex, next.length - 1)] || null
      return { ...previous, [appKey]: fallback }
    })
  }

  const renderAppSwitcher = () => (
    <div className="kb-app-switcher" ref={menuRef}>
      <button
        type="button"
        className={'kb-app-switcher-btn' + (currentApp ? '' : ' empty')}
        onClick={() => apps.length > 0 && setMenuOpen(v => !v)}
        aria-label="切换应用"
        aria-expanded={menuOpen}
        disabled={apps.length === 0}
      >
        <span>{currentApp ? previewTitle(currentApp.preview) : '未命名应用'}</span>
        <Icon name="caret-down" cls={'kb-caret ' + (menuOpen ? 'open' : '')} />
      </button>
      {menuOpen && apps.length > 0 && (
        <div className="kb-apps-menu kb-app-switcher-menu" role="listbox">
          <div className="kb-app-switcher-caption">应用</div>
          {apps.map((app, i) => {
            const selected = app.id === currentAppId || (!currentAppId && i === apps.length - 1)
            const t = previewTitle(app.preview)
            return (
              <button
                type="button"
                key={app.id}
                role="option"
                aria-selected={selected}
                className={'kb-app-switcher-row ' + (selected ? 'on' : '')}
                onClick={() => { onSelectApp(app.id); setMenuOpen(false) }}
              >
                <span title={t}>{t}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  const shareUrl = data && data.type === 'sharepage' ? data.footer.share_url : document.location.href

  const copyWebpageLink = () => {
    if (webApprovalStatus !== 'approved') return
    try {
      const el = document.createElement('div')
      el.textContent = shareUrl
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      const range = document.createRange()
      range.selectNodeContents(el)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      document.execCommand('copy')
      selection?.removeAllRanges()
      document.body.removeChild(el)
    } catch {}
    setWebLinkCopied(true)
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => {
      setWebLinkCopied(false)
      copyTimerRef.current = null
    }, 1600)
  }

  const sendWebApproval = () => {
    if (webApprovalStatus !== 'idle') return
    setWebApprovalStatus('reviewing')
    setWebApprovalOpen(false)
    approvalTimerRef.current = window.setTimeout(() => {
      setWebApprovalStatus('approved')
      approvalTimerRef.current = null
    }, 5000)
  }

  const closeWebApproval = () => setWebApprovalOpen(false)

  const renderWebApprovalDialog = () => {
    if (!webApprovalOpen) return null
    const reviewing = webApprovalStatus === 'reviewing'
    const approved = webApprovalStatus === 'approved'
    return (
      <div className="web-approval-mask" role="presentation" onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeWebApproval()
      }}>
        <section className="web-approval-dlg" role="dialog" aria-modal="true" aria-labelledby="web-approval-title">
          <button type="button" className="web-approval-close" onClick={closeWebApproval} aria-label="关闭审批窗口">×</button>
          <div className={'web-approval-icon' + (approved ? ' approved' : '')} aria-hidden="true">
            <Icon name={approved ? 'check' : 'lock'} cls="ic" />
          </div>
          <h3 id="web-approval-title" className="web-approval-title">
            {approved ? '审批已通过' : '对外链接需要 +1 审批'}
          </h3>

          {!approved && (
            <label className="web-approval-field">
              <span>汇报理由 <em>选填</em></span>
              <textarea
                value={webApprovalReason}
                onChange={(e) => setWebApprovalReason(e.target.value)}
                placeholder="例如：用于向外部合作伙伴汇报项目进展"
                maxLength={200}
                disabled={reviewing}
              />
              <small>{webApprovalReason.length}/200</small>
            </label>
          )}

          {reviewing && (
            <div className="web-approval-progress" role="status" aria-live="polite">
              <span className="sh-internet-spinner" aria-hidden="true" />
              <span>预计 5 秒内完成审核</span>
            </div>
          )}

          <button
            type="button"
            className={'web-approval-action' + (approved ? ' approved' : '')}
            disabled={reviewing}
            onClick={approved ? copyWebpageLink : sendWebApproval}
          >
            {reviewing ? (
              <><span className="sh-internet-spinner light" aria-hidden="true" />审核中</>
            ) : approved ? (
              <><Icon name={webLinkCopied ? 'check' : 'copy'} cls="ic" />{webLinkCopied ? '已复制' : '复制链接'}</>
            ) : (
              '发送审批'
            )}
          </button>
        </section>
      </div>
    )
  }

  const shareBlock = (
    <div className="sh-anchor" ref={shareAnchorRef}>
      <button
        type="button"
        className="kb-share-btn"
        title="分享"
        aria-label="分享"
        aria-haspopup="dialog"
        aria-expanded={shareOpen}
        onClick={(e) => {
          e.stopPropagation()
          setShareOpen(v => !v)
        }}
      >
        <Icon name="share-fat" cls="ic kb-share-ic" />
      </button>
      <SharePopover
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        anchorRef={shareAnchorRef}
        shareUrl={shareUrl}
        webpageOnly={data?.type === 'sharepage'}
        onInternetShare={onInternetShare ? () => onInternetShare() : undefined}
      />
    </div>
  )

  const workspaceHeader = (
    <header className="kb-top kb-workspace-top">
      {renderAppSwitcher()}
      <nav className="kb-workspace-tabs" aria-label="应用标签页">
        {workspaceTabs.map(tabId => {
          const def = WORKSPACE_TAB_DEFS.find(item => item.id === tabId)!
          const active = activeWorkspaceTab === tabId
          return (
            <button
              type="button"
              key={tabId}
              className={'kb-workspace-tab' + (active ? ' on' : '')}
              onClick={() => setActiveTabByApp(previous => ({ ...previous, [appKey]: tabId }))}
            >
              <span className="kb-workspace-tab-leading">
                <span className="kb-workspace-tab-icon" aria-hidden="true">
                  {def.id === 'code' ? <span className="kb-code-glyph">&lt;/&gt;</span> : <Icon name={def.icon} cls="ic" />}
                </span>
                <span
                  className="kb-workspace-tab-close"
                  role="button"
                  aria-label={`关闭${def.label}`}
                  onClick={event => { event.stopPropagation(); closeWorkspaceTab(tabId) }}
                >
                  <Icon name="x" cls="ic" />
                </span>
              </span>
              <span>{def.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="kb-add-tab-anchor" ref={addMenuRef}>
        <button
          type="button"
          className="kb-add-tab-btn"
          aria-label="新建标签页"
          aria-expanded={addMenuOpen}
          onClick={() => setAddMenuOpen(value => !value)}
        >
          <Icon name="plus" cls="ic" />
        </button>
        {addMenuOpen && (
          <div className="kb-add-tab-menu" role="menu">
            {WORKSPACE_TAB_DEFS.filter(def => !workspaceTabs.includes(def.id)).map(def => (
              <button type="button" role="menuitem" key={def.id} onClick={() => openWorkspaceTab(def.id)}>
                {def.id === 'code' ? <span className="kb-code-glyph">&lt;/&gt;</span> : <Icon name={def.icon} cls="ic" />}
                <span>{def.label}</span>
              </button>
            ))}
            {WORKSPACE_TAB_DEFS.every(def => workspaceTabs.includes(def.id)) && (
              <div className="kb-add-tab-empty">所有标签页均已打开</div>
            )}
          </div>
        )}
      </div>
      <div className="kb-workspace-spacer" />
      <div className="kb-top-right">{shareBlock}</div>
    </header>
  )

  const renderWorkspaceTool = (tabId: WorkspaceTabId) => {
    const def = WORKSPACE_TAB_DEFS.find(item => item.id === tabId)!
    const descriptions: Record<Exclude<WorkspaceTabId, 'preview'>, string> = {
      code: '查看和编辑这个应用的核心逻辑与界面代码。',
      config: '管理应用名称、模型、权限和运行参数。',
      evolution: '根据使用反馈持续优化应用能力。',
      service: '查看应用依赖的工具、连接器和在线服务。',
      history: '浏览应用的版本记录，并可回到之前的版本。',
    }
    return (
      <div className={'kb-tool-pane tool-' + tabId}>
        <div className="kb-tool-pane-head">
          <div className="kb-tool-pane-icon">
            {tabId === 'code' ? <span className="kb-code-glyph">&lt;/&gt;</span> : <Icon name={def.icon} cls="ic" />}
          </div>
          <div><h2>{def.label}</h2><p>{descriptions[tabId as Exclude<WorkspaceTabId, 'preview'>]}</p></div>
        </div>
        {tabId === 'code' ? (
          <div className="kb-code-editor" aria-label="代码示意">
            <div className="kb-code-file">app.tsx</div>
            <pre><code>{`export default function App() {\n  return <AgentWorkspace />\n}`}</code></pre>
          </div>
        ) : tabId === 'config' ? (
          <div className="kb-config-sheet">
            <label><span>应用名称</span><input readOnly value={currentApp ? previewTitle(currentApp.preview) : '未命名应用'} /></label>
            <label><span>运行模式</span><input readOnly value="自动" /></label>
            <label><span>访问权限</span><input readOnly value="仅团队成员" /></label>
          </div>
        ) : (
          <div className="kb-tool-cards">
            <div><strong>当前状态</strong><span>运行正常</span></div>
            <div><strong>最近更新</strong><span>刚刚</span></div>
            <div><strong>下一步</strong><span>等待配置</span></div>
          </div>
        )}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="kb-wrap">
        {workspaceHeader}

        <div className="kb-empty">
          <div className="kb-empty-ic">📊</div>
          <div className="kb-empty-title">预览面板</div>
          <div className="kb-empty-sub">
            {empty || '输入「做一个webapp」「做一个agentapp」或「做一个对外链接」，完成后会在这里展示预览。'}
          </div>
        </div>
      </div>
    )
  }

  if (activeWorkspaceTab && activeWorkspaceTab !== 'preview') {
    return (
      <div className="kb-wrap kb-workspace-wrap">
        {workspaceHeader}
        {renderWorkspaceTool(activeWorkspaceTab)}
      </div>
    )
  }

  if (!activeWorkspaceTab) {
    return (
      <div className="kb-wrap kb-workspace-wrap">
        {workspaceHeader}
        <div className="kb-empty">
          <div className="kb-empty-title">还没有打开的标签页</div>
          <div className="kb-empty-sub">点击顶部的“+”重新打开预览，或添加其他标签页。</div>
        </div>
      </div>
    )
  }

  if (data.type === 'sharepage') {
    const w: WebpagePreview = data
    return (
      <div className="kb-wrap">
        {workspaceHeader}
        <div className="kb-web-share-bar">
          <span className="kb-web-share-notice">
            {webApprovalStatus === 'reviewing' ? '页面通过审核后，可以复制到外部。' : '对外分享需审批，请确认数据安全'}
          </span>
          <button
            type="button"
            className="sh-copy-btn kb-web-copy-btn"
            disabled={webApprovalStatus === 'reviewing'}
            onClick={webApprovalStatus === 'approved' ? copyWebpageLink : () => setWebApprovalOpen(true)}
          >
            {webApprovalStatus !== 'reviewing' && (
              <Icon name={webLinkCopied ? 'check' : 'copy'} cls="ic sh-copy-ic" />
            )}
            <span>
              {webApprovalStatus === 'reviewing' ? '审核中' : webLinkCopied ? '已复制' : '复制链接'}
            </span>
          </button>
        </div>
        <div className="kb-body kb-body-web">
          <SharePagePreview data={w} />
        </div>
        {renderWebApprovalDialog()}
      </div>
    )
  }

  if (data.type === 'agent') {
    return (
      <div className="kb-wrap kb-wrap-agent">
        {workspaceHeader}
        <div className="kb-agent-body">
          <AgentTestPreview key={data.name} data={data} agentKey={currentApp?.id || data.name} />
        </div>
      </div>
    )
  }

  const k: KanbanPreviewData = data
  const statusClass =
    k.status_tag.color === 'warn' ? 'warn' :
    k.status_tag.color === 'grn' ? 'grn' : 'ok'

  return (
    <div className="kb-wrap">
      {workspaceHeader}

      <div className="kb-body">
        <div className="kb-card">
          <div className="kb-subtitle">{k.subtitle}</div>
          <h2 className="kb-title">{k.title}</h2>
          <p className="kb-desc">{k.description}</p>

          <div className="kb-meta">
            {k.meta.map((m, i) => (
              <div className="kb-meta-row" key={i}>
                <span className="kb-meta-label">{m.label}</span>
                <span className={'kb-meta-value' + (i === 3 ? ' warn-text' : '')}>{m.value}</span>
              </div>
            ))}
          </div>

          <div className="kb-divider" />

          <div className="kb-concl">
            <span className={'kb-pill ' + statusClass} />
            <span className="kb-concl-label">{k.conclusion.label}</span>
          </div>
          <p className="kb-concl-summary">{k.conclusion.summary}</p>

          <h3 className="kb-sec-title">关键发现</h3>

          <div className="kb-insight-list">
            {k.insights.map(ins => (
              <div className="kb-insight" key={ins.idx}>
                <div className="kb-insight-head">
                  <span className="kb-insight-idx">{ins.idx}</span>
                  <div className="kb-insight-title">{ins.title}</div>
                </div>
                <div className="kb-insight-summary">{ins.summary}</div>
                <ul className="kb-insight-bullets">
                  {ins.bullets.map((b, i) => (
                    <li key={i}>
                      <span className="kb-dot-g" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
