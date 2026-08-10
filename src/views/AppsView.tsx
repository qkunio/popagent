import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { Icon } from '../components/Icon'
import type { AppState } from '../App'
import type { GeneratedApp } from '../types'

type AppFilter = 'all' | 'webapp' | 'agentapp' | 'skillapp'

const appMeta = (type: GeneratedApp['type']) => type === 'agentapp'
  ? { label: 'AgentApp', icon: 'chat-circle-text' }
  : type === 'skillapp'
    ? { label: 'SkillApp', icon: 'lightning' }
    : { label: 'WebApp', icon: 'columns' }

function relativeTime(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

export function AppsView({ state }: { state: AppState }) {
  const [apps, setApps] = useState<GeneratedApp[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<AppFilter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.generatedApps()
      .then(items => { if (active) setApps(items) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visibleApps = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return apps.filter(app => {
      if (filter !== 'all' && app.type !== filter) return false
      return !keyword || app.title.toLowerCase().includes(keyword) || app.description.toLowerCase().includes(keyword)
    })
  }, [apps, filter, query])

  const openApp = (app: GeneratedApp) => {
    sessionStorage.setItem('targetAppMessage:' + app.taskId, app.messageId)
    state.openTask(app.taskId)
  }

  return (
    <section className="view on apps-view">
      <header className="apps-page-top"><h1>应用</h1></header>
      <div className="apps-page-scroll">
        <div className="apps-page-content">
          <div className="apps-toolbar">
            <label className="apps-search">
              <Icon name="magnifying-glass" cls="ic" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索应用" />
            </label>
            <div className="apps-filter" aria-label="应用类型筛选">
              {([
                ['all', '全部'],
                ['webapp', 'WebApp'],
                ['agentapp', 'AgentApp'],
                ['skillapp', 'SkillApp'],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" className={filter === value ? 'on' : ''} onClick={() => setFilter(value)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="apps-section-title">
            <strong>默认项目</strong><span>{visibleApps.length}</span>
          </div>

          {loading ? (
            <div className="apps-empty">正在加载应用…</div>
          ) : visibleApps.length ? (
            <div className="apps-card-grid">
              {visibleApps.map(app => (
                <button className="app-gallery-card" type="button" key={app.id} onClick={() => openApp(app)}>
                  <div className={'app-card-visual ' + app.type}>
                    <div className="app-visual-icon">
                      <Icon name={appMeta(app.type).icon} cls="ic" />
                    </div>
                    <div className="app-visual-lines" aria-hidden="true"><span /><span /><span /></div>
                  </div>
                  <div className="app-card-info">
                    <h2>{app.title}</h2>
                    <p>{app.description}</p>
                    <div className="app-card-meta">
                      <span className={'app-type-chip ' + app.type}>
                        <Icon name={appMeta(app.type).icon} cls="ic" />
                        {appMeta(app.type).label}
                      </span>
                      <span>{relativeTime(app.createdAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="apps-empty">
              <Icon name="squares-four" cls="ic" />
              <strong>{apps.length ? '没有匹配的应用' : '暂无应用'}</strong>
              <span>{apps.length ? '换个关键词或类型试试' : '在会话中创建 WebApp、AgentApp 或 SkillApp 后会显示在这里'}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
