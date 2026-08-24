import { useEffect, useRef, useState, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Icon, useToast } from '../components/Icon'
import { Composer } from '../components/Composer'
import { Markdown } from '../components/Markdown'
import { KanbanPreview } from '../components/KanbanPreview'
import { SharePopover } from '../components/SharePopover'
import { api, streamChat } from '../api'
import type { AppState } from '../App'
import type { AppPreview } from '../types'
import { ensureCreatedSkillInLibrary } from '../skillLibraryStore'

export interface AppPreviewItem {
  id: string
  preview: AppPreview
  messageId: string
  createdAt: number
}

type PermissionLevel = 'L2' | 'L3'

const PERMISSION_LEVEL_DETAILS: Record<PermissionLevel, { method: string; domains: string[] }> = {
  L2: {
    method: '告知 +1',
    domains: ['作者-播放数据', '作品-互动数据', '粉丝-画像数据'],
  },
  L3: {
    method: '向 +1 申请',
    domains: ['作者-收入数据', '作品-分发数据', '账号-运营数据'],
  },
}

export function TaskView({ state, taskId }: { state: AppState; taskId: string | null }) {
  const [task, setTask] = useState<any>(null)
  const [msgs, setMsgs] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [currentAppId, setCurrentAppId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [permissionRequest, setPermissionRequest] = useState<{ levels: PermissionLevel[]; messageId: string } | null>(null)
  const [permissionAutoContinue, setPermissionAutoContinue] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<'ready' | 'submitting' | 'approved'>('ready')
  const laneRef = useRef<HTMLDivElement>(null)
  const shareAnchorRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const streamVersion = useRef(0)
  const loadedRef = useRef<string | null>(null)
  const lastContentRef = useRef('')
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const permissionTimerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (permissionTimerRef.current !== null) window.clearTimeout(permissionTimerRef.current)
  }, [])

  const scrollToBottom = (smooth = false) => {
    const el = scrollAnchorRef.current
    if (el) {
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' })
      return
    }
    const lane = laneRef.current
    const scroller = lane?.parentElement
    if (scroller) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    }
  }

  const apps: AppPreviewItem[] = useMemo(() => {
    const list: AppPreviewItem[] = []
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i]
      if (m?.app_preview) {
        list.push({
          id: 'app_' + m.id + '_' + i,
          preview: m.app_preview as AppPreview,
          messageId: m.id,
          createdAt: m.created_at || Date.now() + i,
        })
      }
    }
    return list
  }, [msgs])

  const currentApp: AppPreviewItem | null = useMemo(() => {
    if (apps.length === 0) return null
    if (currentAppId) {
      const found = apps.find(a => a.id === currentAppId)
      if (found) return found
    }
    return apps[apps.length - 1]
  }, [apps, currentAppId])

  const currentPreview: AppPreview | null = currentApp?.preview || null

  useEffect(() => {
    setCurrentAppId(null)
  }, [taskId])

  useEffect(() => {
    apps.forEach(app => {
      if (app.preview.type !== 'skill') return
      ensureCreatedSkillInLibrary({
        name: app.preview.name,
        description: app.preview.description,
        files: app.preview.files,
        folders: app.preview.folders,
      })
    })
  }, [apps])

  useEffect(() => {
    if (!taskId || apps.length === 0) return
    const targetMessageId = sessionStorage.getItem('targetAppMessage:' + taskId)
    if (!targetMessageId) return
    const target = apps.find(app => app.messageId === targetMessageId)
    if (!target) return
    setCurrentAppId(target.id)
    setPreviewOpen(true)
    sessionStorage.removeItem('targetAppMessage:' + taskId)
  }, [apps, taskId])

  useEffect(() => {
    if (!taskId || currentAppId) return
    const restoredAppId = sessionStorage.getItem('previewCurrentApp:' + taskId)
    if (restoredAppId && apps.some(app => app.id === restoredAppId)) setCurrentAppId(restoredAppId)
  }, [apps, currentAppId, taskId])

  useEffect(() => {
    if (taskId && currentAppId) sessionStorage.setItem('previewCurrentApp:' + taskId, currentAppId)
  }, [currentAppId, taskId])

  useEffect(() => {
    if (!taskId) return
    const version = ++streamVersion.current
    const aborted = { current: false }
    loadedRef.current = taskId

    const pendingRaw = sessionStorage.getItem('pendingMessage:' + taskId)
    let pending: any = null
    if (pendingRaw) {
      try { pending = JSON.parse(pendingRaw) } catch { pending = null }
    }
    if (pending?.text) {
      setMsgs([{ id: 'pending_user', role: 'user', content: pending.text, trace: [], sources: [] }])
    }

    api.task(taskId).then(t => {
      if (aborted.current || version !== streamVersion.current) return
      setTask(t)

      let nextMsgs: any[] = []
      if (t.messages.length > 0) nextMsgs = t.messages.map(m => ({ ...m }))
      if (pending?.text) nextMsgs = [{ id: 'pending_user', role: 'user', content: pending.text, trace: [], sources: [] }]
      setMsgs(nextMsgs)
      setTimeout(() => scrollToBottom(false), 20)

      if (nextMsgs.some(m => m.app_preview)) setPreviewOpen(true)

      if (pending?.text) {
        sessionStorage.removeItem('pendingMessage:' + taskId)
        const { text, skillId, mode } = pending
        setMsgs([])
        runChatInternal(text, skillId, mode, version, aborted)
      }
    }).catch(() => {})

    return () => { aborted.current = true }
  }, [taskId])

  useLayoutEffect(() => {
    const signature = msgs.length + ':' + msgs.map(m => m.id + ':' + (m.content || '').length + ':' + (m.app_preview ? 'Y' : 'N')).join('|')
    if (signature === lastContentRef.current) return
    lastContentRef.current = signature

    const streaming = msgs.some(m => m.streaming)
    const smooth = !streaming
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => { scrollToBottom(smooth) })
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [msgs])

  useLayoutEffect(() => {
    if (!taskId) return
    const closed = sessionStorage.getItem('previewClosed:' + taskId) === '1'
    if (currentPreview && !closed && !previewOpen) setPreviewOpen(true)
  }, [currentPreview, previewOpen, taskId])

  const runChatInternal = async (
    text: string, skillId: string | undefined, mode: 'fast' | 'deep' | undefined,
    version: number, aborted: { current: boolean },
  ) => {
    if (!taskId || busy) return
    setBusy(true)
    setProgress(10)

    const userMsgId = 'u_' + Date.now() + '_' + version
    setMsgs(prev => [...prev, { id: userMsgId, role: 'user', content: text, trace: [], sources: [] }])
    setTimeout(() => scrollToBottom(false), 10)

    let asstMsgTmpId: string | null = null
    let pendingPreview: AppPreview | null = null

    try {
      await streamChat(taskId, text, skillId, {
        onUser: () => { if (!aborted.current) setProgress(30) },
        onStart: () => { if (!aborted.current) setProgress(45) },
        onTrace: () => { if (!aborted.current) setProgress(p => Math.min(p + 5, 70)) },
        onDelta: ({ text: delta }) => {
          if (aborted.current || version !== streamVersion.current) return
          setProgress(p => Math.min(p + 1, 92))
          setMsgs(prev => {
            const last = prev[prev.length - 1]
            if (asstMsgTmpId != null && last?.id === asstMsgTmpId) {
              const updated = [...prev]
              updated[updated.length - 1] = { ...last, content: last.content + delta }
              return updated
            }
            if (last?.streaming && last.role === 'assistant') {
              asstMsgTmpId = last.id
              const updated = [...prev]
              updated[updated.length - 1] = { ...last, content: last.content + delta }
              return updated
            }
            const id = 's_' + Date.now() + '_' + version
            asstMsgTmpId = id
            return [...prev, { id, role: 'assistant', content: delta, trace: [], sources: [], streaming: true, app_preview: null }]
          })
        },
        onDone: ({ content, trace, sources, app_preview }) => {
          if (aborted.current || version !== streamVersion.current) return
          setProgress(100)
          pendingPreview = app_preview || null
          setMsgs(prev => {
            const updated = [...prev]
            const idx = asstMsgTmpId != null ? updated.findIndex(m => m.id === asstMsgTmpId) : -1
            const finalPreview = app_preview || null
            if (finalPreview) {
              // 新生成的预览始终切到最新结果，避免停留在用户之前选中的旧预览。
              setCurrentAppId(null)
              setPreviewOpen(true)
            }
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], id: 's_' + Date.now() + '_' + version, content, trace, sources, streaming: false, app_preview: finalPreview }
            } else if (updated.length > 0 && updated[updated.length - 1].streaming) {
              updated[updated.length - 1] = { ...updated[updated.length - 1], content, trace, sources, streaming: false, app_preview: finalPreview }
            } else {
              updated.push({ id: 's_' + Date.now() + '_' + version, role: 'assistant', content, trace, sources, streaming: false, app_preview: finalPreview })
            }
            return updated
          })
          setTimeout(() => setProgress(0), 800)
          setTimeout(() => scrollToBottom(true), 30)
        },
        onError: ({ message }) => {
          if (aborted.current || version !== streamVersion.current) return
          toast('出错：' + message)
          setProgress(0)
          setMsgs(prev => {
            const updated = [...prev]
            const idx = asstMsgTmpId != null ? updated.findIndex(m => m.id === asstMsgTmpId) : -1
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], content: '抱歉，出错了：' + message, streaming: false }
            } else if (updated.length > 0 && updated[updated.length - 1].streaming) {
              updated[updated.length - 1] = { ...updated[updated.length - 1], content: '抱歉，出错了：' + message, streaming: false }
            }
            return updated
          })
        },
      })
      state.refreshSidebar()
    } catch (e: any) {
      if (!aborted.current) toast('对话中断：' + (e?.message || '未知错误'))
      setProgress(0)
    } finally {
      if (!aborted.current) setBusy(false)
    }
  }

  const send = async (text: string, mode?: 'fast' | 'deep') => {
    setDraft('')
    const matched = state.skills.find(s => text.includes(s.name))
    const version = ++streamVersion.current
    const aborted = { current: false }
    runChatInternal(text, matched?.id, mode, version, aborted)
  }

  const openPermissionRequest = (levels: PermissionLevel[], messageId: string) => {
    setPermissionRequest({ levels, messageId })
    setPermissionAutoContinue(true)
    setPermissionStatus('ready')
  }

  const submitPermissionRequest = () => {
    if (!permissionRequest || permissionStatus !== 'ready') return
    const levelLabel = permissionRequest.levels.join('、')
    setPermissionStatus('submitting')
    permissionTimerRef.current = window.setTimeout(() => {
      setPermissionStatus('approved')
      permissionTimerRef.current = window.setTimeout(() => {
        setPermissionRequest(null)
        setPermissionStatus('ready')
        permissionTimerRef.current = null
        if (permissionAutoContinue) send(`${levelLabel}权限通过了，请你继续`)
        else toast(`${levelLabel} 权限已通过`)
      }, 900)
    }, 1400)
  }

  const permissionLevelsForMessage = (message: any): PermissionLevel[] | null => {
    if (message?.role !== 'assistant' || !/请点击下方按钮申请/.test(message.content || '')) return null
    const levels = Array.from(new Set(
      Array.from((message.content || '').matchAll(/L([23])/g), (match: RegExpMatchArray) => `L${match[1]}` as PermissionLevel),
    )).sort()
    return levels.length > 0 ? levels : null
  }

  const startInternetShare = () => {
    const prompt = '做一个对外链接'
    setShareOpen(false)
    setDraft(prompt)
    window.setTimeout(() => send(prompt), 0)
  }

  if (!task) return <section className="view on"><div className="pagebody"><div className="frow-empty">加载中…</div></div></section>

  const showPreview = previewOpen

  const chatShareBlock = (
    <div className="sh-anchor" ref={shareAnchorRef}>
      <button
        type="button"
        className="kb-share-btn"
        title="分享任务"
        aria-label="分享任务"
        aria-haspopup="dialog"
        aria-expanded={shareOpen}
        onClick={() => setShareOpen(v => !v)}
      >
        <Icon name="share-fat" cls="ic kb-share-ic" />
      </button>
      <SharePopover
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        anchorRef={shareAnchorRef}
        onInternetShare={startInternetShare}
      />
    </div>
  )

  return (
    <section className="view on">
      <div className={'tk-split' + (showPreview ? ' split' : '')}>
        <div className="tk-col tk-chat">
          <header className="chat-top">
            <div className="chat-top-left">
              <div className="chat-title" title={task?.title}>{task?.title || '对话'}</div>
            </div>
            <div className="chat-top-right">
              {chatShareBlock}
            </div>
          </header>
          <div className="conv-simple">
            <div className="conv-flow" ref={laneRef}>
              {msgs.map(m => {
                const permissionLevels = permissionLevelsForMessage(m)
                return (
                <div key={m.id} className={'s-msg ' + (m.role === 'user' ? 'me' : 'ai')}>
                  {m.role === 'assistant' && (
                    <div className="s-ai-icon"><Icon name="sparkles" cls="ic" /></div>
                  )}
                  <div className="s-body">
                    <div className="s-bubble">
                      <Markdown text={m.content} />
                      {permissionLevels && (
                        <button type="button" className="s-permission-request-button" onClick={() => openPermissionRequest(permissionLevels, m.id)}>
                          <Icon name="lock" cls="ic" />
                          <span>申请 {permissionLevels.join('、')} 数据权限</span>
                          <Icon name="arrow-right" cls="ic arrow" />
                        </button>
                      )}
                    </div>
                    {m.streaming && <span className="s-caret" />}
                  </div>
                </div>
                )
              })}
              <div ref={scrollAnchorRef} style={{ height: 1, flex: 'none' }} />
            </div>

            <div className="s-composer-wrap">
              <Composer
                placeholder="继续追问，比如「那封面要不要换」"
                value={draft} onChange={setDraft} onSend={send}
                disabled={busy}
                progress={progress}
              />
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="tk-col tk-preview">
            <KanbanPreview
              data={currentPreview}
              apps={apps}
              currentAppId={currentApp?.id || null}
              onSelectApp={(id) => setCurrentAppId(id)}
              onClose={() => {
                if (taskId) sessionStorage.setItem('previewClosed:' + taskId, '1')
                setPreviewOpen(false)
              }}
              onInternetShare={startInternetShare}
            />
          </div>
        )}
        {permissionRequest && createPortal(
          <div className="permission-approval-mask" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && permissionStatus === 'ready') setPermissionRequest(null) }}>
            <section className="permission-approval-dialog" role="dialog" aria-modal="true" aria-labelledby="permission-approval-title">
              {permissionStatus === 'approved' ? (
                <div className="permission-approval-result">
                  <span><Icon name="check" cls="ic" /></span>
                  <h2 id="permission-approval-title">权限申请已通过</h2>
                  <p>{permissionAutoContinue ? '即将自动继续刚才的任务' : `${permissionRequest.levels.join('、')} 数据权限已生效`}</p>
                </div>
              ) : (
                <>
                  <header>
                    <div><span className="permission-approval-lock"><Icon name="lock" cls="ic" /></span><div><h2 id="permission-approval-title">申请 {permissionRequest.levels.join('、')} 数据权限</h2></div></div>
                    <button type="button" onClick={() => setPermissionRequest(null)} disabled={permissionStatus === 'submitting'} aria-label="关闭"><Icon name="x" cls="ic" /></button>
                  </header>
                  <div className="permission-approval-content">
                    <div className="permission-scope-list">
                      {permissionRequest.levels.map(level => {
                        const detail = PERMISSION_LEVEL_DETAILS[level]
                        return (
                          <section className="permission-scope-card" key={level}>
                            <header>
                              <span className="permission-level-badge">{level}</span>
                              <span className="permission-method">{detail.method}</span>
                            </header>
                            <div className="permission-scope-row">
                              <span>数据范围</span>
                              <div>{detail.domains.map(domain => <em key={domain}>{domain}</em>)}</div>
                            </div>
                            <div className="permission-approver"><span>审批人</span><strong>你的直属负责人（+1）</strong></div>
                          </section>
                        )
                      })}
                    </div>
                    <label className="permission-auto-continue">
                      <input type="checkbox" checked={permissionAutoContinue} onChange={event => setPermissionAutoContinue(event.target.checked)} disabled={permissionStatus === 'submitting'} />
                      <span><strong>权限通过后自动继续任务</strong><small>系统将自动发送“{permissionRequest.levels.join('、')}权限通过了，请你继续”</small></span>
                    </label>
                  </div>
                  <footer>
                    <button type="button" className="cancel" onClick={() => setPermissionRequest(null)} disabled={permissionStatus === 'submitting'}>取消</button>
                    <button type="button" className="submit" onClick={submitPermissionRequest} disabled={permissionStatus === 'submitting'}>
                      {permissionStatus === 'submitting' ? <><span className="permission-submit-spinner" />审批中</> : '提交申请'}
                    </button>
                  </footer>
                </>
              )}
            </section>
          </div>,
          document.body,
        )}
      </div>
    </section>
  )
}
