import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

type MemberPerm = 'read' | 'fork'
export type VisibilityScope = 'partial' | 'company' | 'internet'
export type WebDeploymentStatus = 'missing' | 'approval' | 'reviewing' | 'approved' | 'deploying' | 'deployed' | 'error'

interface ShareMember {
  id: string
  name: string
  account: string
  role?: string
  roleBadge?: '所有者'
  dept?: string
  avatarColor: string
  avatarSeed?: string
  perm: MemberPerm
  removable?: boolean
}

interface SharePopoverProps {
  open: boolean
  onClose: () => void
  anchorRef?: React.RefObject<HTMLElement | null>
  title?: string
  shareUrl?: string
  webpageOnly?: boolean
  hideInternetShare?: boolean
  copyLabel?: string
  onCopy?: (url: string) => void
  onInternetShare?: (url: string) => void
  deploymentStatus?: WebDeploymentStatus
  deploymentError?: string
  deploymentTarget?: '企业内链接' | '互联网链接'
  deploymentVersion?: number
  onSyncDeployment?: () => void
  onSubmitDeploymentApproval?: (reason: string) => void
  onGenerateDeployment?: () => void
  externalShareStatus?: 'idle' | 'applying' | 'approved' | 'generating' | 'generated'
  externalShareRequested?: boolean
  externalAgentGenerating?: boolean
  externalOnlineOutdated?: boolean
  onExternalShareAction?: () => void
  managedWebAppDeployment?: boolean
  controlledVisibilityScope?: VisibilityScope
  onVisibilityScopeChange?: (scope: VisibilityScope) => void
  internetPreparationDone?: boolean
  onInternetPreparationConfirmed?: () => void
}

const MAKE_MEMBERS = (): ShareMember[] => [
  { id: 'u1', name: '张三', account: 'zhangsan', roleBadge: '所有者', dept: '部门A', avatarColor: '#52C41A', avatarSeed: '🧑‍🎨', perm: 'read', removable: false },
  { id: 'u2', name: '李四', account: 'lisi', dept: '部门B', avatarColor: '#165DFF', avatarSeed: '🧑', perm: 'read', removable: true },
  { id: 'u3', name: '张三的飞书助手', account: 'zhangsan.assistant', dept: '', avatarColor: '#14C9C9', avatarSeed: '🤖', perm: 'read', removable: true },
  { id: 'u4', name: '王五', account: 'wangwu', dept: '部门A', avatarColor: '#FF7D00', avatarSeed: '👧', perm: 'read', removable: true },
  { id: 'u5', name: '赵六', account: 'zhaoliu', dept: '部门B', avatarColor: '#722ED1', avatarSeed: '👤', perm: 'read', removable: true },
  { id: 'u6', name: '孙七', account: 'sunqi', dept: '部门A', avatarColor: '#F53F3F', avatarSeed: '👩', perm: 'read', removable: true },
]

const INVITE_CANDIDATES: ShareMember[] = [
  { id: 'u7', name: '周八', account: 'zhouba', dept: '部门B', avatarColor: '#A070E8', avatarSeed: '周', perm: 'read', removable: true },
  { id: 'u8', name: '吴九', account: 'wujiu', dept: '部门A', avatarColor: '#B48B6A', avatarSeed: '🐱', perm: 'read', removable: true },
  { id: 'u9', name: '郑十', account: 'zhengshi', dept: '部门B', avatarColor: '#4080FF', avatarSeed: '郑', perm: 'read', removable: true },
  { id: 'u10', name: '用户甲', account: 'user.a', dept: '部门A', avatarColor: '#14C9C9', avatarSeed: '甲', perm: 'read', removable: true },
]

interface PopPos {
  left: number
  top: number
}

function calcPos(anchor: HTMLElement | null, width = 480, height = 240): PopPos {
  const gap = 6
  const margin = 16
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  let top = 60
  let left = Math.max(margin, (vw - width) / 2)
  if (anchor) {
    const r = anchor.getBoundingClientRect()
    const desiredLeft = r.right - width
    top = r.bottom + gap
    left = desiredLeft
  }
  const minLeft = margin
  const maxLeft = vw - width - margin
  left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft))
  if (top + height > vh - margin) top = Math.max(margin, vh - height - margin)
  return { top, left }
}

export function SharePopover({
  open,
  onClose,
  anchorRef,
  title = '分享产物',
  shareUrl = 'https://popagent.example.com/share/demo',
  webpageOnly = false,
  hideInternetShare = false,
  copyLabel = '复制链接',
  onCopy,
  onInternetShare,
  deploymentStatus,
  deploymentError = 'WebApp 部署失败，请检查构建配置后重新部署。',
  deploymentTarget = '企业内链接',
  deploymentVersion = 1,
  onSyncDeployment,
  onSubmitDeploymentApproval,
  onGenerateDeployment,
  externalShareStatus,
  externalShareRequested = false,
  externalAgentGenerating = false,
  externalOnlineOutdated = false,
  onExternalShareAction,
  managedWebAppDeployment = false,
  controlledVisibilityScope,
  onVisibilityScopeChange,
  internetPreparationDone = false,
  onInternetPreparationConfirmed,
}: SharePopoverProps) {
  const [internetConfirmOpen, setInternetConfirmOpen] = useState(false)
  const [internetAcknowledged, setInternetAcknowledged] = useState(false)
  const [internetGenerating, setInternetGenerating] = useState(false)
  const [members, setMembers] = useState<ShareMember[]>(() => MAKE_MEMBERS())
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<ShareMember[]>([])
  const [inviteDirectory, setInviteDirectory] = useState<ShareMember[]>(() => INVITE_CANDIDATES)
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [pos, setPos] = useState<PopPos>(() => calcPos(anchorRef?.current || null))
  const wrapRef = useRef<HTMLDivElement>(null)
  const externalApprovalRef = useRef<HTMLDivElement>(null)
  const inviteEntryRef = useRef<HTMLDivElement>(null)
  const inviteInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [managePermOpenId, setManagePermOpenId] = useState<string | null>(null)
  const [localToast, setLocalToast] = useState('')
  const localToastTimerRef = useRef<number | null>(null)
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>('partial')
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false)
  const [externalApprovalOpen, setExternalApprovalOpen] = useState(false)
  const [externalApprovalReason, setExternalApprovalReason] = useState('')
  const [deploymentErrorOpen, setDeploymentErrorOpen] = useState(false)
  const previousVisibilityScopeRef = useRef<VisibilityScope>('partial')

  useEffect(() => {
    if (controlledVisibilityScope) setVisibilityScope(controlledVisibilityScope)
  }, [controlledVisibilityScope])

  useEffect(() => {
    if (externalShareRequested) setVisibilityScope('internet')
  }, [externalShareRequested])

  useLayoutEffect(() => {
    if (!open) return
    setMounted(true)
    const update = () => {
      const width = wrapRef.current ? Math.min(480, wrapRef.current.getBoundingClientRect().width || 480) : 480
      const height = wrapRef.current?.getBoundingClientRect().height || (internetConfirmOpen ? 390 : 240)
      setPos(calcPos(anchorRef?.current || null, width, height))
    }
    update()
    const raf = window.requestAnimationFrame(update)
    const raf2 = window.requestAnimationFrame(update)
    window.addEventListener('resize', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true, capture: true })
    return () => {
      window.cancelAnimationFrame(raf)
      window.cancelAnimationFrame(raf2)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef, internetConfirmOpen, searching, searchResults.length, selectedInviteIds.length])

  useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => setMounted(false), 0)
    setInternetConfirmOpen(false)
    setInternetAcknowledged(false)
    setInternetGenerating(false)
    setSearch('')
    setSearching(false)
    setSearchResults([])
    setSelectedInviteIds([])
    setLocalToast('')
    setExternalApprovalOpen(false)
    setExternalApprovalReason('')
    setDeploymentErrorOpen(false)
    if (localToastTimerRef.current !== null) {
      window.clearTimeout(localToastTimerRef.current)
      localToastTimerRef.current = null
    }
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (deploymentStatus !== 'error') setDeploymentErrorOpen(false)
  }, [deploymentStatus])

  const handleLinkAction = () => {
    if (managedWebAppDeployment) {
      if (shareUrl) copyLink()
      return
    }
    const useExternalShareFlow = externalShareRequested && visibilityScope === 'internet'
    if (useExternalShareFlow && externalShareStatus === 'generating') {
      copyLink()
      return
    }
    if (useExternalShareFlow && externalShareStatus === 'idle') {
      setExternalApprovalOpen(true)
      return
    }
    if (useExternalShareFlow && externalShareStatus !== 'generated') {
      onExternalShareAction?.()
      return
    }
    copyLink()
  }

  const submitExternalApproval = () => {
    if (managedWebAppDeployment) {
      setExternalApprovalOpen(false)
      onSubmitDeploymentApproval?.(externalApprovalReason)
      setExternalApprovalReason('')
      return
    }
    setExternalApprovalOpen(false)
    onExternalShareAction?.()
  }

  useLayoutEffect(() => {
    if (!open || selectedInviteIds.length === 0) return
    const entry = inviteEntryRef.current
    if (entry) entry.scrollLeft = entry.scrollWidth
    inviteInputRef.current?.focus()
  }, [open, selectedInviteIds.length])

  useEffect(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) {
      setSearching(false)
      setSearchResults([])
      return
    }

    setSearching(true)
    setSearchResults([])
    const timer = window.setTimeout(() => {
      const pool = [...members, ...INVITE_CANDIDATES]
      const unique = Array.from(new Map(pool.map((member) => [member.id, member])).values())
      const matchedMembers = unique.filter((member) =>
        member.name.toLocaleLowerCase().includes(query) || member.account.toLocaleLowerCase().includes(query),
      )
      const generatedMembers: ShareMember[] = [query, `${query}1`, `${query}2`, `${query}3`].map((name, index) => ({
        id: `invite_${encodeURIComponent(query)}_${index}`,
        name,
        account: `${query}${index ? index : ''}`,
        dept: '部门A',
        avatarColor: ['#A070E8', '#4080FF', '#14C9C9', '#FF7D00'][index],
        avatarSeed: ['👤', '👩', '👨', '🤖'][index],
        perm: 'read',
        removable: true,
      }))
      const results = Array.from(new Map([...matchedMembers, ...generatedMembers].map((member) => [member.id, member])).values())
      setInviteDirectory((current) => {
        const directory = new Map(current.map((member) => [member.id, member]))
        results.forEach((member) => directory.set(member.id, member))
        return Array.from(directory.values())
      })
      setSearchResults(results)
      setSearching(false)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [search, members])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (externalApprovalOpen) { setExternalApprovalOpen(false); return }
        if (managePermOpenId) { setManagePermOpenId(null); return }
        if (manageOpen) { setManageOpen(false); return }
        if (visibilityMenuOpen) { setVisibilityMenuOpen(false); return }
        if (internetConfirmOpen) {
          setInternetConfirmOpen(false)
          setInternetAcknowledged(false)
          setInternetGenerating(false)
          setVisibilityScope(previousVisibilityScopeRef.current)
          return
        }
        onClose()
      }
    }
    const onDoc = (e: MouseEvent) => {
      const root = wrapRef.current
      const approval = externalApprovalRef.current
      const anc = anchorRef?.current
      const t = e.target as Node
      if (root && root.contains(t)) return
      if (approval && approval.contains(t)) return
      if (anc && anc.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDoc, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDoc, true)
    }
  }, [open, onClose, anchorRef, manageOpen, managePermOpenId, visibilityMenuOpen, internetConfirmOpen, externalApprovalOpen])

  const copyLink = () => {
    try {
      const el = document.createElement('div')
      el.textContent = shareUrl
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      const r = document.createRange()
      r.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
      document.execCommand('copy')
      sel?.removeAllRanges()
      document.body.removeChild(el)
    } catch {}
    setCopied(true)
    onCopy?.(shareUrl)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const permLabel: Record<MemberPerm, string> = { read: '可阅读', fork: '可复制' }
  const permIcon: Record<MemberPerm, string> = { read: 'magnifying-glass', fork: 'export' }

  const visibleMembers = useMemo(() => members, [members])
  const selectedInviteMembers = useMemo(() => {
    const pool = [...members, ...INVITE_CANDIDATES, ...inviteDirectory]
    const byId = new Map(pool.map((member) => [member.id, member]))
    return selectedInviteIds.map((id) => byId.get(id)).filter((member): member is ShareMember => Boolean(member))
  }, [members, inviteDirectory, selectedInviteIds])
  const shownCount = 3
  const overflowCount = Math.max(0, visibleMembers.length - shownCount)

  const setPerm = (id: string, next: MemberPerm | 'remove') => {
    if (next === 'remove') {
      setMembers((ms) => ms.filter((m) => m.id !== id))
      return
    }
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, perm: next } : m)))
  }

  const selectInvite = (id: string) => {
    setSelectedInviteIds((ids) => ids.includes(id) ? ids : [...ids, id])
    setSearch('')
    setSearching(false)
    setSearchResults([])
  }

  const submitInvites = () => {
    if (selectedInviteMembers.length === 0) return
    setMembers((current) => {
      const existing = new Set(current.map((member) => member.id))
      const additions = selectedInviteMembers
        .filter((member) => !existing.has(member.id))
        .map((member) => ({ ...member, perm: 'read' as MemberPerm, removable: true }))
      return additions.length > 0 ? [...current, ...additions] : current
    })
    setSelectedInviteIds([])
    setSearch('')
    setLocalToast('添加成功')
    if (localToastTimerRef.current !== null) window.clearTimeout(localToastTimerRef.current)
    localToastTimerRef.current = window.setTimeout(() => {
      setLocalToast('')
      localToastTimerRef.current = null
    }, 1600)
  }

  const closeInternetConfirm = () => {
    setInternetConfirmOpen(false)
    setInternetAcknowledged(false)
    setInternetGenerating(false)
    setVisibilityScope(previousVisibilityScopeRef.current)
  }

  if (!mounted && !open) return null

  const renderInvitePicker = () => (
    <div className="sh-invite-stack sh-manage-invite-top">
      <div className="sh-invite-entry">
        <div ref={inviteEntryRef} className="sh-select sh-invite sh-invite-inline">
          {selectedInviteMembers.map((member) => (
            <span key={member.id} className="sh-invite-chip">
              <span className="sh-invite-chip-avatar" style={{ background: member.avatarColor }}>{member.avatarSeed || member.name.charAt(0)}</span>
              <span className="sh-invite-chip-name">{member.name}</span>
              <button type="button" className="sh-invite-chip-remove" onClick={() => setSelectedInviteIds(ids => ids.filter(id => id !== member.id))} aria-label={`移除${member.name}`}>
                <Icon name="x" cls="ic" />
              </button>
            </span>
          ))}
          <div className="sh-invite-input-row">
            <input ref={inviteInputRef} className="sh-invite-input" type="text" placeholder={selectedInviteMembers.length > 0 ? '' : '输入姓名以添加用户'} value={search} onChange={e => setSearch(e.target.value)} aria-label="输入姓名以添加用户" />
            {searching && <span className="sh-invite-loading">搜索中</span>}
          </div>
        </div>
        {selectedInviteMembers.length > 0 && (
          <button type="button" className="sh-invite-submit" onClick={submitInvites}>添加</button>
        )}
      </div>
      {(searching || (search.trim() && !searching)) && (
        <div className="sh-invite-results" role="listbox" aria-label="用户搜索结果">
          {searching ? (
            <div className="sh-invite-result-status"><span className="sh-invite-spinner" aria-hidden="true" />正在搜索用户…</div>
          ) : searchResults.length > 0 ? searchResults.map(member => (
            <button key={member.id} type="button" className="sh-invite-result" role="option" aria-selected={false} onClick={() => selectInvite(member.id)}>
              <span className="sh-invite-result-avatar" style={{ background: member.avatarColor }}>{member.avatarSeed || member.name.charAt(0)}</span>
              <span className="sh-invite-result-main"><span className="sh-invite-result-name">{member.name}</span>{member.dept && <span className="sh-invite-result-dept">{member.dept}</span>}</span>
            </button>
          )) : <div className="sh-invite-result-status">未找到匹配用户</div>}
        </div>
      )}
    </div>
  )

  const renderManageView = () => (
    <div className="sh-manage">
      <div className="sh-manage-head">
        <button type="button" className="sh-back-btn" onClick={() => { setManageOpen(false); setManagePermOpenId(null) }} aria-label="返回">
          <span className="sh-back-ic">
            <Icon name="caret-right" cls="ic" />
          </span>
        </button>
        <h3 className="sh-manage-title">管理可访问用户</h3>
      </div>

      {renderInvitePicker()}

      <ul className="sh-manage-list">
        {visibleMembers.map((m) => (
          <li key={m.id} className="sh-manage-row">
            <div className="sh-manage-avatar" style={{ background: m.avatarColor }}>
              {m.avatarSeed || m.name.charAt(0)}
            </div>
            <div className="sh-manage-main">
              <div className="sh-manage-headrow">
                <span className="sh-manage-name">{m.name}</span>
                {m.roleBadge === '所有者' && <span className="sh-manage-tag">所有者</span>}
              </div>
              {m.dept && <div className="sh-manage-dept">{m.dept}</div>}
            </div>
            {m.removable !== false && (
              <div className={'sh-space-perm-picker sh-manage-perm-picker' + (managePermOpenId === m.id ? ' is-open' : '')}>
                <button
                  type="button"
                  className="sh-space-perm-trigger sh-manage-perm-trigger"
                  aria-label={`${m.name} 的访问权限`}
                  aria-expanded={managePermOpenId === m.id}
                  aria-haspopup="listbox"
                  onClick={() => setManagePermOpenId((id) => id === m.id ? null : m.id)}
                >
                  <Icon name={permIcon[m.perm]} cls="ic sh-space-perm-trigger-ic" />
                  <span className="sh-space-perm-label">{permLabel[m.perm]}</span>
                  <Icon name="caret-down" cls="ic sh-space-perm-caret" />
                </button>

                {managePermOpenId === m.id && (
                <div className="sh-space-perm-menu sh-manage-perm-menu" role="listbox" aria-label={`${m.name} 的访问权限`}>
                  <div className="sh-space-perm-menu-title">访问权限</div>
                  {(['read', 'fork', 'remove'] as const).map((perm) => {
                    const labels = { read: '可阅读', fork: '可复制', remove: '移除' }
                    const icons = { read: 'magnifying-glass', fork: 'export', remove: 'x' }
                    return (
                      <button
                        key={perm}
                        type="button"
                        className={'sh-space-perm-option' + (perm === 'remove' ? ' sh-manage-remove-option' : '')}
                        role="option"
                        aria-selected={perm === m.perm}
                        onClick={() => {
                          setPerm(m.id, perm)
                          setManagePermOpenId(null)
                        }}
                      >
                        <Icon name={icons[perm]} cls="ic sh-space-perm-option-ic" />
                        <span>{labels[perm]}</span>
                        {perm === m.perm && <Icon name="check" cls="ic sh-space-perm-check" />}
                      </button>
                    )
                  })}
                </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )

  const renderInternetConfirmView = () => (
    <div className="sh-manage sh-internet-confirm">
      <div className="sh-manage-head">
        <button type="button" className="sh-back-btn" onClick={closeInternetConfirm} aria-label="返回">
          <span className="sh-back-ic">
            <Icon name="caret-right" cls="ic" />
          </span>
        </button>
        <h3 className="sh-manage-title">分享到互联网</h3>
      </div>

      <div className="sh-internet-confirm-body">
        <div className="sh-internet-confirm-icon" aria-hidden="true">
          <Icon name="cloud" cls="ic" />
        </div>

        {internetGenerating ? (
          <>
            <h4 className="sh-internet-confirm-title">正在生成分享页面</h4>
            <p className="sh-internet-confirm-desc">
              Agent 正在生成分享页面，请耐心等待 2～3 分钟，期间会占用当前会话。
            </p>
            <div className="sh-internet-generating-status">
              <span className="sh-internet-spinner" aria-hidden="true" />
              <span>生成中</span>
            </div>
          </>
        ) : (
          <>
            <h4 className="sh-internet-confirm-title">确认切换为互联网可见</h4>
            <div className="sh-internet-notice">
              <p>1. 数据将会发布到公网，请自行把控数据安全。</p>
              <p>2. 确认后 Agent 会自动发送对外分享消息，消息完成后进入互联网分享审核。</p>
            </div>

            <label className="sh-internet-ack">
              <input
                type="checkbox"
                checked={internetAcknowledged}
                onChange={(e) => setInternetAcknowledged(e.target.checked)}
              />
              <span>我已知晓</span>
            </label>

            <button
              type="button"
              className="sh-internet-start-btn"
              disabled={!internetAcknowledged}
              onClick={() => {
                if (!internetAcknowledged) return
                setInternetGenerating(true)
                if (managedWebAppDeployment) {
                  setVisibilityScope('internet')
                  onVisibilityScopeChange?.('internet')
                  onInternetPreparationConfirmed?.()
                }
                onClose()
                onInternetShare?.(shareUrl)
              }}
            >
              {managedWebAppDeployment ? '确认并继续' : '开始生成'}
            </button>
          </>
        )}
      </div>
    </div>
  )

  const webAppDeploymentError = deploymentStatus === 'error'
  const internetExternalShareActive = externalShareRequested && visibilityScope === 'internet'
  const externalLinkMaking = internetExternalShareActive && externalShareStatus !== 'generated'
  const cloudSyncState = webAppDeploymentError
    ? 'error'
    : !shareUrl
      ? 'unpublished'
    : deploymentStatus && deploymentStatus !== 'deployed' || externalLinkMaking || externalOnlineOutdated
      ? 'syncing'
      : 'synced'
  const cloudSyncLabel = deploymentStatus === 'error'
    ? '出错'
    : !shareUrl
      ? '未发布'
      : deploymentStatus === 'deployed'
      ? '已发布'
      : '版本落后'
  const syncingWithoutBlocker = deploymentStatus === 'missing' || deploymentStatus === 'deploying'

  const renderShareView = () => (
    <>
      <div className="sh-head">
        <h3 className="sh-title">{title}</h3>
      </div>

      {webpageOnly && externalShareStatus !== 'generated' ? (
        <div className="sh-external-page-making">
          <div className="sh-external-visibility"><span>可访问范围</span><strong>互联网可见</strong></div>
          <div className="sh-external-making-status"><span className="sh-internet-spinner" aria-hidden="true" /><span>网页正在制作中</span></div>
        </div>
      ) : webpageOnly ? (
        <div className="sh-webpage-share">
          <p className="sh-webpage-share-notice">请确认数据安全后再对外分享～</p>
          <button type="button" className="sh-copy-btn sh-webpage-copy-btn" onClick={copyLink}>
            {copied
              ? (
                <>
                  <Icon name="check" cls="ic sh-copy-ic" />
                  <span>已复制</span>
                </>
              )
              : (
                <>
                  <Icon name="copy" cls="ic sh-copy-ic" />
                  <span>我已知晓，复制链接</span>
                </>
              )}
          </button>
        </div>
      ) : null}

      {!webpageOnly && (
        <>
        <div className="sh-access-row">
        <span className="sh-access-label">可访问范围</span>
        <div className="sh-visibility-picker">
          <button type="button" className="sh-visibility-trigger" aria-haspopup="listbox" aria-expanded={visibilityMenuOpen} onClick={() => setVisibilityMenuOpen(openState => !openState)}>
            <span>{{ partial: '部分人可见', company: '企业内可见', internet: '互联网可见' }[visibilityScope]}</span>
            <Icon name="caret-down" cls="ic" />
          </button>
          {visibilityMenuOpen && (
            <div className="sh-visibility-menu" role="listbox" aria-label="访问范围">
              {([
                ['partial', '部分人可见'],
                ['company', '企业内可见'],
                ['internet', '互联网可见'],
              ] as const).map(([value, label]) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={visibilityScope === value}
                  key={value}
                  onClick={() => {
                    if (managedWebAppDeployment && value === 'internet' && visibilityScope !== 'internet' && !internetPreparationDone) {
                      previousVisibilityScopeRef.current = visibilityScope
                      setVisibilityMenuOpen(false)
                      setInternetConfirmOpen(true)
                      setInternetAcknowledged(false)
                      setInternetGenerating(false)
                      return
                    }
                    setVisibilityScope(value)
                    onVisibilityScopeChange?.(value)
                    setVisibilityMenuOpen(false)
                    if (!managedWebAppDeployment && value === 'internet' && !externalShareRequested) {
                      previousVisibilityScopeRef.current = visibilityScope
                      setInternetConfirmOpen(true)
                      setInternetAcknowledged(false)
                      setInternetGenerating(false)
                    } else {
                      setExternalApprovalOpen(false)
                    }
                  }}
                >
                  <span>{label}</span>
                  {visibilityScope === value && <Icon name="check" cls="ic" />}
                </button>
              ))}
            </div>
          )}
        </div>
        {visibilityScope === 'partial' && <button type="button" className="sh-target-chip" onClick={() => setManageOpen(true)} aria-label="管理可访问用户">
          <span className="sh-target-avatars">
            {visibleMembers.slice(0, shownCount).map((m) => (
              <span key={m.id} className="sh-target-av" style={{ background: m.avatarColor }}>
                {m.avatarSeed || m.name.charAt(0)}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="sh-target-more">+{overflowCount}</span>
            )}
          </span>
          <Icon name="arrow-right" cls="ic sh-target-arrow" />
        </button>}
        </div>

        <div className="sh-foot sh-copy-foot sh-link-action-row">
          {managedWebAppDeployment && !shareUrl ? (
            <div className="sh-link-box sh-link-box-empty"><span className="sh-link-text">尚未生成链接</span></div>
          ) : externalLinkMaking && !shareUrl ? (
            <div className="sh-external-making-status sh-external-making-status-inline">
              {(externalAgentGenerating || externalShareStatus === 'generating') && <span className="sh-internet-spinner" aria-hidden="true" />}
              <span>{externalAgentGenerating ? '网页正在制作中' : externalShareStatus === 'approved' ? '对外链接待生成' : externalShareStatus === 'generating' ? '正在发布中' : '对外连接生成需要审核'}</span>
            </div>
          ) : (
            <div className="sh-link-box"><span className="sh-link-text">{shareUrl}</span></div>
          )}
          <button
            type="button"
            className="sh-copy-btn"
            onClick={handleLinkAction}
            disabled={(managedWebAppDeployment && !shareUrl) || (!managedWebAppDeployment && internetExternalShareActive && (externalAgentGenerating || externalShareStatus === 'applying'))}
          >
            <Icon name={managedWebAppDeployment ? copied ? 'check' : 'copy' : internetExternalShareActive && externalShareStatus === 'idle' ? 'export' : internetExternalShareActive && externalShareStatus === 'approved' ? 'link' : copied ? 'check' : 'copy'} cls="ic sh-copy-ic" />
            <span>{managedWebAppDeployment ? copied ? '已复制' : '复制链接' : internetExternalShareActive ? externalShareStatus === 'idle' ? '去审核' : externalShareStatus === 'applying' ? '审核中' : externalShareStatus === 'approved' ? '生成链接' : copied ? '已复制' : '复制链接' : copied ? '已复制' : copyLabel}</span>
          </button>
        </div>
        {deploymentStatus && (
          <div className="sh-cloud-sync-row">
            <span
              className={`sh-cloud-sync-badge is-${cloudSyncState}`}
              role="status"
              aria-label={cloudSyncLabel}
            >
              <Icon name="link" cls="ic sh-cloud-sync-link-icon" />
              <span>{cloudSyncLabel}</span>
            </span>
            {deploymentStatus === 'error' && (
              <button type="button" className="sh-cloud-sync-action is-error-action" onClick={() => setDeploymentErrorOpen(true)}>查看信息</button>
            )}
            {syncingWithoutBlocker && (
              <span className="sh-cloud-sync-action is-static is-progress"><span className="sh-cloud-sync-spinner" aria-hidden="true" />{shareUrl ? '正在同步版本' : '正在发布中'}</span>
            )}
            {deploymentStatus === 'approval' && (
              <>
                <span className="sh-cloud-sync-action is-static is-blocked">对外发布与更新需审核</span>
                <button type="button" className="sh-cloud-sync-apply" onClick={() => setExternalApprovalOpen(true)}>点击申请</button>
              </>
            )}
            {deploymentStatus === 'reviewing' && (
              <span className="sh-cloud-sync-action is-static is-progress"><span className="sh-cloud-sync-spinner" aria-hidden="true" />对外链接审核中</span>
            )}
            {deploymentStatus === 'approved' && (
              <>
                <span className="sh-cloud-sync-action is-static is-approved">审核已通过</span>
                <button type="button" className="sh-cloud-sync-generate" onClick={onGenerateDeployment}>{shareUrl ? '同步版本' : '生成链接'}</button>
              </>
            )}
          </div>
        )}
        </>
      )}
    </>
  )

  const content = (
    <>
    {deploymentErrorOpen && createPortal(
      <div className="sh-deployment-error-mask" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeploymentErrorOpen(false) }}>
        <section className="sh-deployment-error-dialog" role="dialog" aria-modal="true" aria-labelledby="sh-deployment-error-title">
          <header>
            <div>
              <span className="sh-deployment-error-icon"><Icon name="warning-circle" cls="ic" /></span>
              <h3 id="sh-deployment-error-title">部署失败</h3>
            </div>
            <button type="button" onClick={() => setDeploymentErrorOpen(false)} aria-label="关闭"><Icon name="x" cls="ic" /></button>
          </header>
          <dl className="sh-deployment-error-meta">
            <div><dt>发布目标</dt><dd>{deploymentTarget}</dd></div>
            <div><dt>目标版本</dt><dd>V{deploymentVersion}</dd></div>
          </dl>
          <pre>{deploymentError}</pre>
          <footer>
            <button type="button" className="cancel" onClick={() => setDeploymentErrorOpen(false)}>取消</button>
            <button type="button" className="retry" onClick={() => { setDeploymentErrorOpen(false); onSyncDeployment?.() }}>{deploymentTarget === '互联网链接' ? '重新提交审核' : '重新部署'}</button>
          </footer>
        </section>
      </div>,
      document.body,
    )}
    <div
      className={'sh-popover-wrap sh-popover-wrap-portal' + (open ? '' : ' sh-closing')}
      ref={wrapRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 10000,
      }}
    >
      <div
        className="sh-popover"
        role="dialog"
        aria-modal="false"
        aria-label={manageOpen ? '管理可访问用户' : internetConfirmOpen ? '分享到互联网' : title}
      >
        {manageOpen ? renderManageView() : internetConfirmOpen ? renderInternetConfirmView() : renderShareView()}
        {localToast && <div className="sh-local-toast" role="status"><Icon name="check" cls="ic" />{localToast}</div>}
      </div>
    </div>
    {externalApprovalOpen && (
      <div ref={externalApprovalRef} className="sh-external-approval-mask" role="presentation" onMouseDown={event => {
        if (event.target === event.currentTarget) setExternalApprovalOpen(false)
      }}>
        <section className="sh-external-approval-dialog" role="dialog" aria-modal="true" aria-labelledby="sh-external-approval-title">
          <header>
            <span className="sh-external-approval-icon"><Icon name="lock" cls="ic" /></span>
            <div>
              <h3 id="sh-external-approval-title">申请互联网分享审核</h3>
              <p>提交后将由你的直属负责人审核</p>
            </div>
            <button type="button" onClick={() => setExternalApprovalOpen(false)} aria-label="关闭"><Icon name="x" cls="ic" /></button>
          </header>
          <div className="sh-external-approval-content">
            <dl>
              <div><dt>申请应用</dt><dd>{title.replace(/^分享/, '') || '当前 WebApp'}</dd></div>
              {managedWebAppDeployment && <div><dt>申请版本</dt><dd>V{deploymentVersion}</dd></div>}
              <div><dt>可访问范围</dt><dd><span className="sh-external-approval-badge">互联网可见</span></dd></div>
              <div><dt>审批人</dt><dd>你的直属负责人（+1）</dd></div>
            </dl>
            <label>
              <span>申请理由 <em>选填</em></span>
              <textarea
                value={externalApprovalReason}
                onChange={event => setExternalApprovalReason(event.target.value)}
                placeholder="请简要说明对外分享的用途"
                maxLength={200}
              />
              <small>{externalApprovalReason.length}/200</small>
            </label>
          </div>
          <footer>
            <button type="button" className="cancel" onClick={() => setExternalApprovalOpen(false)}>取消</button>
            <button type="button" className="submit" onClick={submitExternalApproval}>提交审核</button>
          </footer>
        </section>
      </div>
    )}
    </>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}
