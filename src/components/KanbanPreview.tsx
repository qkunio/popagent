import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { SharePagePreview } from './SharePagePreview'
import { SharePopover } from './SharePopover'
import type { AppPreview, KanbanPreview as KanbanPreviewData, WebpagePreview } from '../types'
import type { AppPreviewItem } from '../views/TaskView'

interface Props {
  data: AppPreview | null
  empty?: string
  apps: AppPreviewItem[]
  currentAppId: string | null
  onSelectApp: (id: string) => void
  onClose?: () => void
  onInternetShare?: () => void
}

function previewTitle(p: AppPreview | null | undefined): string {
  if (!p) return '未命名应用'
  if (p.type === 'webpage') return p.cover.title || '可分享网页'
  return p.title || '未命名看板'
}

export function KanbanPreview({ data, empty, apps, currentAppId, onSelectApp, onClose, onInternetShare }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [webLinkCopied, setWebLinkCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const shareAnchorRef = useRef<HTMLDivElement>(null)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const currentApp = apps.find(a => a.id === currentAppId) || apps[apps.length - 1] || null

  const renderMenu = (cls = '') => (
    <div className={'kb-top-left' + (cls ? ' ' + cls : '')} ref={menuRef}>
      <button
        type="button"
        className={'kb-title-btn' + (apps.length > 1 ? ' with-caret' : '') + (currentApp ? '' : ' empty')}
        onClick={() => apps.length > 1 && setMenuOpen(v => !v)}
        aria-label="切换预览"
        aria-expanded={menuOpen}
        disabled={apps.length <= 1}
      >
        <span className="kb-title-text">预览</span>
        {apps.length > 1 && (
          <>
            <span className="kb-title-count">{apps.length}</span>
            <Icon name="caret-down" cls={'kb-caret ' + (menuOpen ? 'open' : '')} />
          </>
        )}
      </button>
      {menuOpen && apps.length > 0 && (
        <div className="kb-apps-menu" role="listbox">
          {apps.map((app, i) => {
            const selected = app.id === currentAppId || (!currentAppId && i === apps.length - 1)
            const t = previewTitle(app.preview)
            const tp = (app.preview as AppPreview | null | undefined)?.type
            const tag = tp === 'webpage' ? '网页' : '应用'
            const kind: string = tp || 'kanban'
            return (
              <button
                type="button"
                key={app.id}
                role="option"
                aria-selected={selected}
                className={'kb-app-row ' + (selected ? 'on' : '')}
                onClick={() => { onSelectApp(app.id); setMenuOpen(false) }}
              >
                <span className="kb-app-idx">{String(i + 1).padStart(2, '0')}</span>
                <span className={'kb-app-type t-' + kind} data-kind={kind}>{tag}</span>
                <span className="kb-app-name" title={t}>{t}</span>
                {selected && <Icon name="check" cls="kb-check ic" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  const shareUrl = data && data.type === 'webpage' ? data.footer.share_url : document.location.href

  const copyWebpageLink = () => {
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
        webpageOnly={data?.type === 'webpage'}
        onInternetShare={onInternetShare ? () => onInternetShare() : undefined}
      />
    </div>
  )

  const shareAndClose = (
    <>
      {shareBlock}
      {onClose && (
        <button type="button" className="kb-close" onClick={onClose} title="关闭预览" aria-label="关闭预览">×</button>
      )}
    </>
  )

  if (!data) {
    return (
      <div className="kb-wrap">
        <header className="kb-top">
          {renderMenu()}
          <div className="kb-top-right">{shareAndClose}</div>
        </header>

        <div className="kb-empty">
          <div className="kb-empty-ic">📊</div>
          <div className="kb-empty-title">预览面板</div>
          <div className="kb-empty-sub">
            {empty || '在对话中输入「做一个应用」生成看板，或「做一个可分享网页」生成外部分享页，完成后会在这里展示预览。'}
          </div>
        </div>
      </div>
    )
  }

  if (data.type === 'webpage') {
    const w: WebpagePreview = data
    return (
      <div className="kb-wrap">
        <header className="kb-top">
          {renderMenu()}
          <div className="kb-top-right">
            {onClose && (
              <button type="button" className="kb-close" onClick={onClose} title="关闭预览" aria-label="关闭预览">×</button>
            )}
          </div>
        </header>
        <div className="kb-web-share-bar">
          <span className="kb-web-share-notice">请确认数据安全后再对外分享～</span>
          <button type="button" className="sh-copy-btn kb-web-copy-btn" onClick={copyWebpageLink}>
            <Icon name={webLinkCopied ? 'check' : 'copy'} cls="ic sh-copy-ic" />
            <span>{webLinkCopied ? '已复制' : '我已知晓，复制链接'}</span>
          </button>
        </div>
        <div className="kb-body kb-body-web">
          <SharePagePreview data={w} />
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
      <header className="kb-top">
        {renderMenu()}
        <div className="kb-top-right">{shareAndClose}</div>
      </header>

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
