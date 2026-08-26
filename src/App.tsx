import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Icon, ToastProvider, useToast } from './components/Icon'
import { DialogProvider, useDialog } from './components/Dialog'
import { useColResize } from './components/useColResize'
import { api } from './api'
import type { SidebarTask, Skill, Connector } from './types'
import { HomeView } from './views/HomeView'
import { TaskView } from './views/TaskView'
import { SkillLibraryView } from './views/SkillLibraryView'
import { AppsView } from './views/AppsView'
import { DataOverviewView } from './views/DataOverviewView'
import { SharePopover } from './components/SharePopover'
import { ConversationShareView } from './views/ConversationShareView'
import { getConversationShareUrl } from './conversationShare'
import type { Prefs } from './api'

export type ViewName = 'home' | 'task' | 'skills' | 'apps' | 'data'

export interface AppState {
  skills: Skill[]
  connectors: Connector[]
  sidebar: SidebarTask[]
  refreshSidebar: () => void
  go: (v: ViewName) => void
  openTask: (id: string) => void
  activeTaskId: string | null
  setActiveTaskId: (id: string | null) => void
  composerDraft: string
  setComposerDraft: (v: string) => void
}

export default function App() {
  if (window.location.hash === '#/share/conversation') return <ConversationShareView />
  return (
    <ToastProvider>
      <DialogProvider>
        <Shell />
      </DialogProvider>
    </ToastProvider>
  )
}

function Shell() {
  const [view, setView] = useState<ViewName>('home')
  const [skills, setSkills] = useState<Skill[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [sidebar, setSidebar] = useState<SidebarTask[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [composerDraft, setComposerDraft] = useState('')
  const [acctOpen, setAcctOpen] = useState(false)
  const [sidebarMenu, setSidebarMenu] = useState<{ task: SidebarTask; top: number; left: number } | null>(null)
  const [sidebarShareTask, setSidebarShareTask] = useState<SidebarTask | null>(null)
  const [sidebarActionAnchor, setSidebarActionAnchor] = useState<HTMLButtonElement | null>(null)
  const sidebarActionAnchorRef = { current: sidebarActionAnchor }
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('popagent-theme') as 'light' | 'dark') || 'light')
  const [me, setMe] = useState<{ name: string; role: string; avatar?: string; authenticated?: boolean } | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const toast = useToast()
  const dialog = useDialog()

  const refreshSidebar = useCallback(() => { api.sidebar().then(setSidebar).catch(() => {}) }, [])
  useColResize()

  useEffect(() => {
    api.skills().then(setSkills).catch(() => {})
    api.connectors().then(setConnectors).catch(() => {})
    api.me().then(setMe).catch(() => setMe({ name: '本地用户', role: '纯前端演示', authenticated: false }))
    api.getPrefs().then(setPrefs).catch(() => {})
    refreshSidebar()
  }, [refreshSidebar])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('popagent-theme', theme)
  }, [theme])

  const go = useCallback((v: ViewName) => { setView(v) }, [])
  const openTask = useCallback((id: string) => {
    setActiveTaskId(id); setView('task')
    api.readTask(id).then(() => refreshSidebar()).catch(() => {})
  }, [refreshSidebar])

  const deleteTask = useCallback(async (id: string, title: string) => {
    const ok = await dialog.confirm({ title: '删除会话', message: `确定删除会话「${title}」吗？此操作不可恢复。`, okText: '删除', danger: true })
    if (!ok) return
    try {
      await api.deleteTask(id)
      if (activeTaskId === id) { setActiveTaskId(null); setView('home') }
      refreshSidebar()
      toast('会话已删除')
    } catch { toast('删除失败') }
  }, [activeTaskId, refreshSidebar, toast, dialog])

  const toggleSidebarPin = async (task: SidebarTask) => {
    setSidebarMenu(null)
    const pinned = !Boolean(task.pinned)
    try {
      await api.setTaskPinned(task.id, pinned)
      refreshSidebar()
      window.dispatchEvent(new CustomEvent('task:updated', { detail: { id: task.id, pinned } }))
      toast(pinned ? '已置顶会话' : '已取消置顶')
    } catch { toast('操作失败') }
  }

  const renameSidebarTask = async (task: SidebarTask) => {
    setSidebarMenu(null)
    const title = await dialog.prompt({ title: '重命名会话', message: '输入新的会话名称', defaultValue: task.title, placeholder: '会话名称', okText: '保存' })
    if (!title || title === task.title) return
    try {
      await api.renameTask(task.id, title)
      refreshSidebar()
      window.dispatchEvent(new CustomEvent('task:updated', { detail: { id: task.id, title } }))
      toast('会话名称已更新')
    } catch { toast('重命名失败') }
  }

  const state: AppState = {
    skills, connectors, sidebar, refreshSidebar, go, openTask,
    activeTaskId, setActiveTaskId,
    composerDraft, setComposerDraft,
  }

  return (
    <div className={'app' + (view === 'task' ? ' task-on' : '')}>
      <aside className="rail">
        <div className="brand">
          <div className="mark">P</div>
          <div><div className="bt">Pop Agent</div><div className="bs">AI 对话助手</div></div>
        </div>
        <nav className="nav">
          <button className={'railcta' + (view === 'home' ? ' on' : '')} onClick={() => { setActiveTaskId(null); go('home') }}><Icon name="plus" />新建任务</button>
        </nav>

        <nav className="rail-tabs" aria-label="功能导航">
          {[
            { label: '定时任务', icon: 'clock-clockwise', view: null },
            { label: '技能库', icon: 'folders', view: 'skills' as ViewName },
            { label: '应用', icon: 'squares-four', view: 'apps' as ViewName },
            { label: '数据', icon: 'database', view: 'data' as ViewName },
            { label: '服务', icon: 'cloud', view: null },
          ].map(item => (
            <button
              type="button"
              key={item.label}
              className={item.view === view ? 'on' : ''}
              onClick={() => {
                if (item.view) {
                  setActiveTaskId(null)
                  go(item.view)
                } else {
                  toast(`${item.label}功能即将开放`)
                }
              }}
            >
              <Icon name={item.icon} cls="ic" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="tlp">
          <div className="tlp-scroll">
          <div className="tlp-caption">会话列表</div>
          {sidebar.map(t => (
            <div key={t.id} className={'frow frow-row' + (activeTaskId === t.id && view === 'task' ? ' on' : '')} onClick={() => openTask(t.id)}>
              <span className={'fdot' + (t.dot ? ' ' + t.dot : '')} /><span className="ftx">{t.title}</span>
              <button
                className="frow-del"
                aria-label={`更多会话操作：${t.title}`}
                title="更多"
                aria-haspopup="menu"
                aria-expanded={sidebarMenu?.task.id === t.id}
                onClick={e => {
                  e.stopPropagation()
                  setSidebarActionAnchor(e.currentTarget)
                  setSidebarShareTask(null)
                  const rect = e.currentTarget.getBoundingClientRect()
                  const menuHeight = 184
                  const belowTop = rect.bottom + 5
                  const top = belowTop + menuHeight <= window.innerHeight - 8
                    ? belowTop
                    : Math.max(8, rect.top - menuHeight - 5)
                  const left = Math.min(Math.max(8, rect.right - 168), window.innerWidth - 176)
                  setSidebarMenu(current => current?.task.id === t.id ? null : { task: t, top, left })
                }}
              >
                <Icon name="dots-three" cls="ic-s ic" />
              </button>
              {t.pinned && (
                <button
                  type="button"
                  className="frow-pin"
                  aria-label={`取消置顶：${t.title}`}
                  title="取消置顶"
                  onClick={e => { e.stopPropagation(); toggleSidebarPin(t) }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.5h8l-1 5 3.5 3.5v1.5h-6V21l-1-1-1-6.5h-6V12L8 8.5l-1-5Z" /></svg>
                </button>
              )}
            </div>
          ))}
          {sidebar.length === 0 && <div className="frow-empty">还没有对话</div>}
          </div>
        </div>

        {sidebarMenu && createPortal((
          <>
            <button type="button" className="chat-more-dismiss" aria-label="关闭菜单" onClick={() => setSidebarMenu(null)} />
            <div className="chat-more-menu sidebar-chat-more-menu" role="menu" style={{ top: sidebarMenu.top, left: sidebarMenu.left }}>
              <button type="button" role="menuitem" onClick={() => toggleSidebarPin(sidebarMenu.task)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.5h8l-1 5 3.5 3.5v1.5h-6V21l-1-1-1-6.5h-6V12L8 8.5l-1-5Z" /></svg>
                <span>{sidebarMenu.task.pinned ? '取消置顶' : '置顶'}</span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setSidebarShareTask(sidebarMenu.task); setSidebarMenu(null) }}>
                <Icon name="share-fat" cls="ic" /><span>分享</span>
              </button>
              <button type="button" role="menuitem" onClick={() => renameSidebarTask(sidebarMenu.task)}>
                <Icon name="pencil-simple" cls="ic" /><span>重命名</span>
              </button>
              <button type="button" role="menuitem" className="danger" onClick={() => { const task = sidebarMenu.task; setSidebarMenu(null); deleteTask(task.id, task.title) }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5h15M9 4.5h6l1 3H8l1-3Zm-2 3 .8 12h8.4l.8-12M10 11v5M14 11v5" /></svg>
                <span>删除</span>
              </button>
            </div>
          </>
        ), document.body)}
        <SharePopover
          open={Boolean(sidebarShareTask)}
          onClose={() => setSidebarShareTask(null)}
          anchorRef={sidebarActionAnchorRef}
          title="分享对话"
          shareUrl={sidebarShareTask ? getConversationShareUrl() : undefined}
        />

        <div className="railfoot">
          <div className="av" aria-hidden="true">P</div>
          <div className="rf-tx">
            <div className="un">{me?.name || '本地用户'}</div>
          </div>
          <button className="more" aria-label="更多" onClick={() => setAcctOpen(o => !o)}><Icon name="dots-three" /></button>

          {acctOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setAcctOpen(false)} />
              <div className="acctmenu">
                <div className="acct-item" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} style={{ cursor: 'pointer' }}>
                  <Icon name={theme === 'dark' ? 'moon' : 'sun'} cls="ic" />主题
                  <span className={'acct-switch' + (theme === 'dark' ? ' on' : '')} />
                </div>
                <div className="acct-sep" />
                <div className="acct-item" onClick={() => { setAcctOpen(false); toast('纯前端演示版本，无需登录') }}>
                  <Icon name="export" cls="ic" />关于
                </div>
              </div>
            </>
          )}
        </div>
        <div className="vresize rail-rs" data-rs="rail" aria-label="拖拽调整侧栏宽度" />
      </aside>

      <main className="stage">
        {view === 'home' && <HomeView state={state} />}
        {view === 'task' && <TaskView state={state} taskId={activeTaskId} />}
        {view === 'skills' && <SkillLibraryView toast={toast} />}
        {view === 'apps' && <AppsView state={state} />}
        {view === 'data' && <DataOverviewView />}
      </main>
    </div>
  )
}
