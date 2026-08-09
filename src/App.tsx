import { useEffect, useState, useCallback } from 'react'
import { Icon, ToastProvider, useToast } from './components/Icon'
import { DialogProvider, useDialog } from './components/Dialog'
import { useColResize } from './components/useColResize'
import { api } from './api'
import type { SidebarTask, Skill, Connector } from './types'
import { HomeView } from './views/HomeView'
import { TaskView } from './views/TaskView'
import { SkillLibraryView } from './views/SkillLibraryView'
import { AppsView } from './views/AppsView'
import type { Prefs } from './api'

export type ViewName = 'home' | 'task' | 'skills' | 'apps'

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
              <button className="frow-del" aria-label="删除会话" title="删除会话" onClick={e => { e.stopPropagation(); deleteTask(t.id, t.title) }}>
                <Icon name="x" cls="ic-s ic" />
              </button>
            </div>
          ))}
          {sidebar.length === 0 && <div className="frow-empty">还没有对话</div>}
          </div>
        </div>

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
      </main>
    </div>
  )
}
