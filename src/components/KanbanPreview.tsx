import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, useToast } from './Icon'
import { SharePagePreview } from './SharePagePreview'
import { SharePopover } from './SharePopover'
import { SkillDetailDialog } from './SkillDetailDialog'
import { SkillAppPreview, type SkillAppPreviewHandle } from './SkillAppPreview'
import { ScriptAppPreview } from './ScriptAppPreview'
import type { AgentPreview, AppPreview, KanbanPreview as KanbanPreviewData, SkillAppFile, SkillAppPreview as SkillAppPreviewData, WebpagePreview, ScriptAppPreview as ScriptAppPreviewData } from '../types'
import type { AppPreviewItem } from '../views/TaskView'
import { ensureAgentDefaultSkills, publishSkillToLibrary, readSkillLibrary, toggleLibrarySkillInstalled, useSkillLibrary } from '../skillLibraryStore'
import { downloadSkillZip } from '../skillZip'
import { readPreviewSession, updatePreviewSession, type SkillAppSessionState } from '../previewSessionStore'

const UPDATED_OFFICIAL_SKILL_IDS = new Set(['creator-info', 'trend'])

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
  if (p.type === 'skill') return p.name || 'SkillApp'
  if (p.type === 'script') return p.name || 'Script App'
  return p.title || '未命名 WebApp'
}

type AgentTestMessage = { id: number; role: 'user' | 'agent'; text: string; streaming?: boolean }

type AgentPreviewSessionState = {
  view: 'profile' | 'chat'
  editingPrompt: boolean
  systemPrompt: string
  promptDraft: string
  apiKey: string
  skillFilter: 'all' | 'installed' | 'uninstalled'
  skillSearchOpen: boolean
  skillQuery: string
  updatedSkillIds: string[]
  testedSystemPrompt: string
  testedSkillSignature: string
  draft: string
  messages: AgentTestMessage[]
}

type WorkspacePreviewSessionState = {
  tabs: WorkspaceTabId[]
  activeTab: WorkspaceTabId | null
}

function AgentTestPreview({
  data,
  agentKey,
  initialView = 'profile',
  initialAgentMessage,
  onBack,
  configureDefaults = true,
  replyLabel = 'Agent 应用',
}: {
  data: AgentPreview
  agentKey: string
  initialView?: 'profile' | 'chat'
  initialAgentMessage?: string
  onBack?: () => void
  configureDefaults?: boolean
  replyLabel?: string
}) {
  const librarySkills = useSkillLibrary()
  const initialSystemPrompt = `你是「${data.name}」。${data.description}\n\n请理解用户的目标，优先调用已配置的技能，并给出清晰、可执行的回答。`
  const restoredState = useMemo(() => readPreviewSession<AgentPreviewSessionState>('agent', agentKey), [agentKey])
  const initialMessages = restoredState?.messages?.map(message => ({ ...message, streaming: false }))
    ?? (initialAgentMessage ? [{ id: 1, role: 'agent' as const, text: initialAgentMessage }] : [])
  const [view, setView] = useState<'profile' | 'chat'>(restoredState?.view || initialView)
  const [editingPrompt, setEditingPrompt] = useState(restoredState?.editingPrompt || false)
  const [systemPrompt, setSystemPrompt] = useState(restoredState?.systemPrompt || initialSystemPrompt)
  const [promptDraft, setPromptDraft] = useState(restoredState?.promptDraft || initialSystemPrompt)
  const [promptSaved, setPromptSaved] = useState(false)
  const [apiKey, setApiKey] = useState(restoredState?.apiKey || '')
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null)
  const [skillScroll, setSkillScroll] = useState({ size: 28, top: 0 })
  const [skillScrollVisible, setSkillScrollVisible] = useState(false)
  const [skillFilter, setSkillFilter] = useState<'all' | 'installed' | 'uninstalled'>(restoredState?.skillFilter || 'installed')
  const [skillFilterOpen, setSkillFilterOpen] = useState(false)
  const [skillSearchOpen, setSkillSearchOpen] = useState(restoredState?.skillSearchOpen || false)
  const [skillQuery, setSkillQuery] = useState(restoredState?.skillQuery || '')
  const [updateConfirmSkillId, setUpdateConfirmSkillId] = useState<string | null>(null)
  const [updatedSkillIds, setUpdatedSkillIds] = useState<string[]>(restoredState?.updatedSkillIds || [])
  const [testedSystemPrompt, setTestedSystemPrompt] = useState(restoredState?.testedSystemPrompt || initialSystemPrompt)
  const [testedSkillSignature, setTestedSkillSignature] = useState(restoredState?.testedSkillSignature || '')
  const [draft, setDraft] = useState(restoredState?.draft || '')
  const [messages, setMessages] = useState<AgentTestMessage[]>(initialMessages)
  const [streaming, setStreaming] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)
  const nextId = useRef(initialMessages.reduce((max, message) => Math.max(max, message.id), 0))
  const streamTimerRef = useRef<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const clearAnchorRef = useRef<HTMLDivElement>(null)
  const backAnchorRef = useRef<HTMLDivElement>(null)
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
    updatePreviewSession<AgentPreviewSessionState>('agent', agentKey, {
      view,
      editingPrompt,
      systemPrompt,
      promptDraft,
      apiKey,
      skillFilter,
      skillSearchOpen,
      skillQuery,
      updatedSkillIds,
      testedSystemPrompt,
      testedSkillSignature,
      draft,
      messages: messages.map(message => ({ ...message, streaming: false })),
    })
  }, [agentKey, view, editingPrompt, systemPrompt, promptDraft, apiKey, skillFilter, skillSearchOpen, skillQuery, updatedSkillIds, testedSystemPrompt, testedSkillSignature, draft, messages])

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
    if (!backConfirmOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!backAnchorRef.current?.contains(event.target as Node)) setBackConfirmOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [backConfirmOpen])

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
    if (configureDefaults) ensureAgentDefaultSkills(agentKey, recommendedSkillIds)
    if (!restoredState) {
      setTestedSystemPrompt(initialSystemPrompt)
      setTestedSkillSignature(readSkillLibrary().filter(skill => skill.installed).map(skill => skill.id).sort().join('|'))
    }
  }, [agentKey, configureDefaults, data.name, data.description, restoredState])

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
    const reply = Array.from(`收到：「${text}」\n\n这是${replyLabel}的测试回复。你可以继续描述希望它具备的能力。`)
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
    updatePreviewSession<AgentPreviewSessionState>('agent', agentKey, { messages: [] })
  }

  const requestClearMessages = () => {
    setClearConfirmOpen(true)
  }

  const confirmClearMessages = () => {
    setClearConfirmOpen(false)
    clearMessages()
  }

  const confirmBack = () => {
    setBackConfirmOpen(false)
    clearMessages()
    if (onBack) onBack()
    else setView('profile')
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

            {configureDefaults && (
              <section className="agent-business-section agent-api-key-section">
                <label htmlFor={`agent-api-key-${agentKey}`}>API Key</label>
                <span className="agent-api-key-help">
                  <button type="button" className="agent-api-key-help-trigger" aria-label="API Key 帮助">
                    <Icon name="info" cls="ic" />
                  </button>
                  <span className="agent-api-key-tooltip" role="tooltip">
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">如何申请？</a>
                  </span>
                </span>
                <input
                  id={`agent-api-key-${agentKey}`}
                  type="password"
                  value={apiKey}
                  onChange={event => setApiKey(event.target.value)}
                  placeholder="请输入 API Key"
                  autoComplete="off"
                  spellCheck={false}
                />
              </section>
            )}

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
                          <div className="agent-skill-name-row">
                            <h3 title={skill.name}>{skill.name}</h3>
                            {skill.owner === 'official' && UPDATED_OFFICIAL_SKILL_IDS.has(skill.id) && !updatedSkillIds.includes(skill.id) && (
                              <button type="button" className="agent-skill-update-badge" title="更新官方技能" aria-label={`更新${skill.name}`} onClick={event => { event.stopPropagation(); setUpdateConfirmSkillId(skill.id) }}>
                                <span>可更新</span><Icon name="arrow-clockwise" cls="ic" />
                              </button>
                            )}
                          </div>
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

            <div className="agent-chat-launch-shell">
              {configureDefaults && !apiKey.trim() && (
                <span className="agent-chat-disabled-tooltip" id={`agent-api-key-required-${agentKey}`} role="tooltip">请填写 API Key</span>
              )}
              <button
                type="button"
                className="agent-chat-launch"
                disabled={configureDefaults && !apiKey.trim()}
                aria-describedby={configureDefaults && !apiKey.trim() ? `agent-api-key-required-${agentKey}` : undefined}
                onClick={() => { if (!configureDefaults || apiKey.trim()) setView('chat') }}
              >
                <Icon name="chat-circle-text" cls="ic" /><strong>和「{data.name}」对话</strong><Icon name="arrow-right" cls="ic arrow" />
              </button>
            </div>
          </article>
        </div>
        <SkillDetailDialog skill={librarySkills.find(skill => skill.id === detailSkillId) || null} onClose={() => setDetailSkillId(null)} />
        {updateConfirmSkillId && (
          <div className="agent-skill-update-mask" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setUpdateConfirmSkillId(null) }}>
            <section className="agent-skill-update-confirm" role="dialog" aria-modal="true" aria-label="确认更新技能">
              <h3>是否更新「{librarySkills.find(skill => skill.id === updateConfirmSkillId)?.name || ''}」？旧版本可能无法找回</h3>
              <div>
                <button type="button" className="confirm" onClick={() => { setUpdatedSkillIds(current => [...current, updateConfirmSkillId]); setUpdateConfirmSkillId(null) }}>确认</button>
                <button type="button" onClick={() => setUpdateConfirmSkillId(null)}>取消</button>
              </div>
            </section>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="agent-test" aria-label={data.name}>
      <header className="agent-test-head">
        <div className="agent-test-title">
          <div className="agent-back-anchor" ref={backAnchorRef}>
            <button type="button" className="agent-back-card" aria-label={onBack ? '返回 Skill 编辑器' : '返回 Agent 卡片'} aria-expanded={backConfirmOpen} onClick={() => setBackConfirmOpen(true)}><Icon name="arrow-right" cls="ic" /></button>
            {backConfirmOpen && (
              <section className="agent-back-confirm" role="dialog" aria-label="确认返回">
                <p>返回后将清空所有测试消息，是否继续</p>
                <div>
                  <button type="button" className="confirm" onClick={confirmBack}>确定</button>
                  <button type="button" onClick={() => setBackConfirmOpen(false)}>取消</button>
                </div>
              </section>
            )}
          </div>
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
            <svg className="agent-brush-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 11V4.5a2 2 0 0 1 4 0V11" />
              <path d="M6.7 11h10.6l2.5 4H4.2l2.5-4Z" />
              <path d="M5 15v2.2c0 1.6-.6 2.8-1.5 3.8h17c-.9-1-1.5-2.2-1.5-3.8V15" />
              <path d="m8.2 17.5-.3 3.3M12 17.5v3.3M15.8 17.5l.3 3.3" />
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
  const toast = useToast()
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
  const [skillFilesByApp, setSkillFilesByApp] = useState<Record<string, SkillAppFile[]>>({})
  const [skillFoldersByApp, setSkillFoldersByApp] = useState<Record<string, string[]>>({})
  const [skillPublishOpen, setSkillPublishOpen] = useState(false)
  const [skillShareOpen, setSkillShareOpen] = useState(false)
  const [skillPublishName, setSkillPublishName] = useState('')
  const [skillPublishDescription, setSkillPublishDescription] = useState('')
  const [skillPublishSuccess, setSkillPublishSuccess] = useState(false)
  const [agentPublishOpen, setAgentPublishOpen] = useState(false)
  const [agentPublishSuccess, setAgentPublishSuccess] = useState(false)
  const [skillAppDirty, setSkillAppDirty] = useState(false)
  const [skillTestOpen, setSkillTestOpen] = useState(false)
  const [pendingWorkspaceTab, setPendingWorkspaceTab] = useState<WorkspaceTabId | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const shareAnchorRef = useRef<HTMLDivElement>(null)
  const skillShareAnchorRef = useRef<HTMLDivElement>(null)
  const skillPublishAnchorRef = useRef<HTMLDivElement>(null)
  const agentPublishAnchorRef = useRef<HTMLDivElement>(null)
  const copyTimerRef = useRef<number | null>(null)
  const approvalTimerRef = useRef<number | null>(null)
  const skillPreviewRef = useRef<SkillAppPreviewHandle>(null)

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
    if (!skillPublishOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!skillPublishAnchorRef.current?.contains(event.target as Node)) setSkillPublishOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [skillPublishOpen])

  useEffect(() => {
    if (!skillShareOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!skillShareAnchorRef.current?.contains(event.target as Node)) setSkillShareOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [skillShareOpen])

  useEffect(() => {
    if (!agentPublishOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!agentPublishAnchorRef.current?.contains(event.target as Node)) setAgentPublishOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [agentPublishOpen])

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
  const restoredSkillState = useMemo(() => readPreviewSession<SkillAppSessionState>('skill', appKey), [appKey])
  const restoredWorkspaceState = useMemo(() => readPreviewSession<WorkspacePreviewSessionState>('workspace', appKey), [appKey])
  const skillFiles = data?.type === 'skill' ? (skillFilesByApp[appKey] || restoredSkillState?.files || data.files) : []
  const skillFolders = data?.type === 'skill' ? (skillFoldersByApp[appKey] || restoredSkillState?.folders || data.folders || []) : []
  const workspaceTabs = tabsByApp[appKey] || restoredWorkspaceState?.tabs || ['preview']
  const requestedActiveTab = activeTabByApp[appKey] !== undefined ? activeTabByApp[appKey] : restoredWorkspaceState?.activeTab
  const activeWorkspaceTab = requestedActiveTab !== undefined && requestedActiveTab !== null && workspaceTabs.includes(requestedActiveTab)
    ? requestedActiveTab
    : workspaceTabs[0] || null

  useEffect(() => {
    setSkillPublishOpen(false)
    setSkillShareOpen(false)
    setAgentPublishOpen(false)
    setSkillAppDirty(false)
    setSkillTestOpen(Boolean(restoredSkillState?.testOpen))
    setPendingWorkspaceTab(null)
  }, [appKey, restoredSkillState?.testOpen])

  const activateWorkspaceTab = (tabId: WorkspaceTabId) => {
    if (data?.type === 'skill' && skillAppDirty && activeWorkspaceTab === 'preview' && tabId !== 'preview') {
      setPendingWorkspaceTab(tabId)
      setAddMenuOpen(false)
      return
    }
    setActiveTabByApp(previous => ({ ...previous, [appKey]: tabId }))
    updatePreviewSession<WorkspacePreviewSessionState>('workspace', appKey, { activeTab: tabId })
  }

  const saveAndSwitchWorkspaceTab = () => {
    if (!pendingWorkspaceTab) return
    skillPreviewRef.current?.save()
    setSkillAppDirty(false)
    setActiveTabByApp(previous => ({ ...previous, [appKey]: pendingWorkspaceTab }))
    updatePreviewSession<WorkspacePreviewSessionState>('workspace', appKey, { activeTab: pendingWorkspaceTab })
    setPendingWorkspaceTab(null)
  }

  const openSkillPublish = () => {
    if (!data || data.type !== 'skill') return
    setSkillPublishName(data.name)
    setSkillPublishDescription(data.description)
    setSkillPublishSuccess(false)
    setSkillPublishOpen(true)
  }

  const openSkillTest = () => {
    if (!data || data.type !== 'skill') return
    if (skillAppDirty) {
      skillPreviewRef.current?.save()
      setSkillAppDirty(false)
    }
    setSkillTestOpen(true)
    updatePreviewSession<SkillAppSessionState>('skill', appKey, { testOpen: true })
  }

  const savePublishedSkill = () => {
    if (!data || data.type !== 'skill' || !skillPublishName.trim() || !skillPublishDescription.trim()) return
    const saved = publishSkillToLibrary({
      name: skillPublishName.trim(),
      description: skillPublishDescription.trim(),
      files: skillFiles,
      folders: skillFolders,
    })
    setSkillPublishName(saved.name)
    setSkillPublishSuccess(true)
  }

  const openAgentPublish = () => {
    if (!data || data.type !== 'agent') return
    setAgentPublishSuccess(false)
    setAgentPublishOpen(true)
  }

  const openWorkspaceTab = (tabId: WorkspaceTabId) => {
    setTabsByApp(previous => {
      const current = previous[appKey] || restoredWorkspaceState?.tabs || ['preview']
      if (current.includes(tabId)) return previous
      const next = [...current, tabId]
      updatePreviewSession<WorkspacePreviewSessionState>('workspace', appKey, { tabs: next })
      return { ...previous, [appKey]: next }
    })
    activateWorkspaceTab(tabId)
    setAddMenuOpen(false)
  }

  const closeWorkspaceTab = (tabId: WorkspaceTabId) => {
    const current = tabsByApp[appKey] || restoredWorkspaceState?.tabs || ['preview']
    const closingIndex = current.indexOf(tabId)
    const next = current.filter(id => id !== tabId)
    setTabsByApp(previous => ({ ...previous, [appKey]: next }))
    updatePreviewSession<WorkspacePreviewSessionState>('workspace', appKey, { tabs: next })
    setActiveTabByApp(previous => {
      if (previous[appKey] !== tabId && activeWorkspaceTab !== tabId) return previous
      const fallback = next[Math.min(closingIndex, next.length - 1)] || null
      updatePreviewSession<WorkspacePreviewSessionState>('workspace', appKey, { activeTab: fallback })
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
        hideInternetShare={data?.type === 'agent'}
        copyLabel={data?.type === 'agent' ? '复制链接' : undefined}
        onInternetShare={onInternetShare ? () => onInternetShare() : undefined}
      />
    </div>
  )

  const skillShareBlock = data?.type === 'skill' ? (
    <div className="sh-anchor skill-download-anchor" ref={skillShareAnchorRef}>
      <button
        type="button"
        className="kb-share-btn"
        title="分享"
        aria-label="分享"
        aria-haspopup="dialog"
        aria-expanded={skillShareOpen}
        onClick={() => setSkillShareOpen(open => !open)}
      >
        <Icon name="share-fat" cls="ic kb-share-ic" />
      </button>
      {skillShareOpen && (
        <section className="skill-download-popover" role="dialog" aria-label="下载这个 Skill">
          <div><strong>下载这个 Skill</strong><span>保存为 ZIP 文件</span></div>
          <button type="button" onClick={() => { downloadSkillZip(skillPublishName || data.name, skillFiles, skillFolders); setSkillShareOpen(false); toast('ZIP 文件已下载') }}>下载</button>
        </section>
      )}
    </div>
  ) : null

  const skillPublishPopover = skillPublishOpen && data?.type === 'skill' ? (
    <section className="skill-publish-dialog skill-publish-popover" role="dialog" aria-labelledby="skill-publish-title">
      {skillPublishSuccess ? (
        <div className="skill-publish-success">
          <span className="skill-publish-success-icon"><Icon name="check" cls="ic" /></span>
          <h2 id="skill-publish-title">发布成功</h2>
          <p>Skill 已发布为官方技能</p>
          <div className="skill-publish-success-actions">
            <button type="button" className="cancel" onClick={() => setSkillPublishOpen(false)}>关闭</button>
          </div>
        </div>
      ) : (
        <>
          <header>
            <div>
              <span className="skill-publish-icon"><Icon name="lightning" cls="ic" /></span>
              <div><h2 id="skill-publish-title">发布 Skill</h2><p>创建后已自动保存到“我的”，发布后将成为官方技能</p></div>
            </div>
            <button type="button" className="skill-publish-close" onClick={() => setSkillPublishOpen(false)} aria-label="关闭"><Icon name="x" cls="ic" /></button>
          </header>
          <div className="skill-publish-summary" aria-label="Skill 发布信息">
            <div>
              <span>Skill 名称</span>
              <strong>{skillPublishName}</strong>
            </div>
            <div>
              <span>描述</span>
              <p>{skillPublishDescription}</p>
            </div>
          </div>
          <footer>
            <button type="button" className="cancel" onClick={() => setSkillPublishOpen(false)}>取消</button>
            <button type="button" className="save" disabled={!skillPublishName.trim() || !skillPublishDescription.trim()} onClick={savePublishedSkill}>发布</button>
          </footer>
        </>
      )}
    </section>
  ) : null

  const agentPublishPopover = agentPublishOpen && data?.type === 'agent' ? (
    <section className="skill-publish-dialog skill-publish-popover" role="dialog" aria-labelledby="agent-publish-title">
      {agentPublishSuccess ? (
        <div className="skill-publish-success">
          <span className="skill-publish-success-icon"><Icon name="check" cls="ic" /></span>
          <h2 id="agent-publish-title">发布成功</h2>
          <p>AgentApp 已发布</p>
          <div className="skill-publish-success-actions">
            <button type="button" className="cancel" onClick={() => setAgentPublishOpen(false)}>关闭</button>
          </div>
        </div>
      ) : (
        <>
          <header>
            <div>
              <span className="skill-publish-icon"><Icon name="chat-circle-text" cls="ic" /></span>
              <div><h2 id="agent-publish-title">发布 AgentApp</h2><p>确认信息后发布 AgentApp</p></div>
            </div>
            <button type="button" className="skill-publish-close" onClick={() => setAgentPublishOpen(false)} aria-label="关闭"><Icon name="x" cls="ic" /></button>
          </header>
          <div className="skill-publish-summary" aria-label="AgentApp 发布信息">
            <div><span>Agent 名称</span><strong>{data.name}</strong></div>
            <div><span>描述</span><p>{data.description}</p></div>
          </div>
          <footer>
            <button type="button" className="cancel" onClick={() => setAgentPublishOpen(false)}>取消</button>
            <button type="button" className="save" onClick={() => setAgentPublishSuccess(true)}>发布</button>
          </footer>
        </>
      )}
    </section>
  ) : null

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
              onClick={() => activateWorkspaceTab(tabId)}
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
      {pendingWorkspaceTab && (
        <div className="kb-tab-unsaved-popover" role="dialog" aria-label="未保存改动">
          <span>改动未保存，是否保存</span>
          <div><button type="button" className="save" onClick={saveAndSwitchWorkspaceTab}>保存</button><button type="button" onClick={() => setPendingWorkspaceTab(null)}>取消</button></div>
        </div>
      )}
      <div className="kb-top-right">
        {data?.type !== 'skill' && shareBlock}
        {skillShareBlock}
        {data?.type === 'webapp' && (
          <button type="button" className="kb-publish-app-btn" onClick={() => toast('WebApp 发布成功')}>发布</button>
        )}
        {data?.type === 'agent' && (
          <div className="skill-publish-anchor" ref={agentPublishAnchorRef}>
            <button type="button" className="kb-publish-app-btn" aria-haspopup="dialog" aria-expanded={agentPublishOpen} onClick={() => agentPublishOpen ? setAgentPublishOpen(false) : openAgentPublish()}>发布</button>
            {agentPublishPopover}
          </div>
        )}
        {data?.type === 'script' && (
          <button type="button" className="kb-publish-app-btn" onClick={() => toast('Script App 发布成功')}>发布</button>
        )}
        {data?.type === 'skill' && (
          <div className="skill-publish-anchor" ref={skillPublishAnchorRef}>
            <button type="button" className="kb-publish-app-btn" aria-haspopup="dialog" aria-expanded={skillPublishOpen} onClick={() => skillPublishOpen ? setSkillPublishOpen(false) : openSkillPublish()}>发布</button>
            {skillPublishPopover}
          </div>
        )}
      </div>
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
            {empty || '输入「做一个webapp」「做一个agentapp」「做一个skillapp」或「做一个对外链接」，完成后会在这里展示预览。'}
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

  if (data.type === 'script') {
    return (
      <div className="kb-wrap kb-wrap-scriptapp">
        {workspaceHeader}
        <ScriptAppPreview data={data as ScriptAppPreviewData} />
      </div>
    )
  }

  if (data.type === 'agent') {
    return (
      <div className="kb-wrap kb-wrap-agent">
        {workspaceHeader}
        <div className="kb-agent-body">
          <AgentTestPreview key={currentApp?.id || data.name} data={data} agentKey={currentApp?.id || data.name} />
        </div>
      </div>
    )
  }

  if (data.type === 'skill') {
    const skillData: SkillAppPreviewData = data
    const skillTestData: AgentPreview = {
      type: 'agent',
      name: skillData.name,
      description: skillData.description,
      welcome: '',
      placeholder: '输入任务',
    }
    return (
      <div className="kb-wrap kb-wrap-skillapp">
        {workspaceHeader}
        {skillTestOpen ? (
          <div className="kb-agent-body skillapp-test-body">
            <AgentTestPreview
              key={`${appKey}-skill-test`}
              data={skillTestData}
              agentKey={`${appKey}-skill-test`}
              initialView="chat"
              initialAgentMessage="您好，我是您刚刚创建的skill，请向我发布任务"
              onBack={() => {
                setSkillTestOpen(false)
                updatePreviewSession<SkillAppSessionState>('skill', appKey, { testOpen: false })
              }}
              configureDefaults={false}
              replyLabel="Skill"
            />
          </div>
        ) : (
          <SkillAppPreview
            key={`${appKey}-editor`}
            ref={skillPreviewRef}
            data={skillData}
            files={skillFiles}
            folders={skillFolders}
            persistenceKey={appKey}
            onFilesChange={(files, folders) => {
              setSkillFilesByApp(current => ({ ...current, [appKey]: files }))
              setSkillFoldersByApp(current => ({ ...current, [appKey]: folders }))
              updatePreviewSession<SkillAppSessionState>('skill', appKey, { files, folders })
              toast('Skill 文件已保存')
            }}
            onDirtyChange={setSkillAppDirty}
            onTry={openSkillTest}
          />
        )}
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
