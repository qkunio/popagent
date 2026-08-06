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
  type WebApprovalStatus = 'idle' | 'reviewing' | 'approved'
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [webApprovalOpen, setWebApprovalOpen] = useState(false)
  const [webApprovalReason, setWebApprovalReason] = useState('')
  const [webApprovalStatus, setWebApprovalStatus] = useState<WebApprovalStatus>('idle')
  const [webLinkCopied, setWebLinkCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const shareAnchorRef = useRef<HTMLDivElement>(null)
  const copyTimerRef = useRef<number | null>(null)
  const approvalTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

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
