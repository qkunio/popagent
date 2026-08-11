import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

type MemberPerm = 'read' | 'fork'

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

function calcPos(anchor: HTMLElement | null, width = 560, height = 240): PopPos {
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
  copyLabel = '内网链接',
  onCopy,
  onInternetShare,
}: SharePopoverProps) {
  type SpacePerm = 'hidden' | 'fork' | 'view'
  const [spacePerm, setSpacePerm] = useState<SpacePerm>('hidden')
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false)
  const [internetConfirmOpen, setInternetConfirmOpen] = useState(false)
  const [internetAcknowledged, setInternetAcknowledged] = useState(false)
  const [internetGenerating, setInternetGenerating] = useState(false)
  const [members, setMembers] = useState<ShareMember[]>(() => MAKE_MEMBERS())
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<ShareMember[]>([])
  const [inviteDirectory, setInviteDirectory] = useState<ShareMember[]>(() => INVITE_CANDIDATES)
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([])
  const [inviteAdded, setInviteAdded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pos, setPos] = useState<PopPos>(() => calcPos(anchorRef?.current || null))
  const wrapRef = useRef<HTMLDivElement>(null)
  const inviteEntryRef = useRef<HTMLDivElement>(null)
  const inviteInputRef = useRef<HTMLInputElement>(null)
  const inviteAddedTimerRef = useRef<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [managePermOpenId, setManagePermOpenId] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    setMounted(true)
    const update = () => {
      const width = wrapRef.current ? Math.min(560, wrapRef.current.getBoundingClientRect().width || 560) : 560
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
    setInviteAdded(false)
    if (inviteAddedTimerRef.current !== null) {
      window.clearTimeout(inviteAddedTimerRef.current)
      inviteAddedTimerRef.current = null
    }
    return () => window.clearTimeout(id)
  }, [open])

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
        if (managePermOpenId) { setManagePermOpenId(null); return }
        if (manageOpen) { setManageOpen(false); return }
        if (spaceMenuOpen) { setSpaceMenuOpen(false); return }
        if (internetConfirmOpen) {
          setInternetConfirmOpen(false)
          setInternetAcknowledged(false)
          setInternetGenerating(false)
          return
        }
        onClose()
      }
    }
    const onDoc = (e: MouseEvent) => {
      const root = wrapRef.current
      const anc = anchorRef?.current
      const t = e.target as Node
      if (root && root.contains(t)) return
      if (anc && anc.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDoc, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDoc, true)
    }
  }, [open, onClose, anchorRef, manageOpen, managePermOpenId, spaceMenuOpen, internetConfirmOpen])

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

  const spaceLabel: Record<SpacePerm, string> = {
    hidden: '不可见',
    fork: '可 Fork',
    view: '可查看',
  }
  const spaceIcon: Record<SpacePerm, string> = {
    hidden: 'lock',
    fork: 'export',
    view: 'magnifying-glass',
  }
  const spacePerms: SpacePerm[] = ['hidden', 'fork', 'view']

  const permLabel: Record<MemberPerm, string> = { read: '可阅读', fork: '可 Fork' }
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
    setInviteAdded(false)
    if (inviteAddedTimerRef.current !== null) {
      window.clearTimeout(inviteAddedTimerRef.current)
      inviteAddedTimerRef.current = null
    }
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
    setInviteAdded(true)
    if (inviteAddedTimerRef.current !== null) window.clearTimeout(inviteAddedTimerRef.current)
    inviteAddedTimerRef.current = window.setTimeout(() => {
      setInviteAdded(false)
      inviteAddedTimerRef.current = null
    }, 1200)
  }

  const closeInternetConfirm = () => {
    setInternetConfirmOpen(false)
    setInternetAcknowledged(false)
    setInternetGenerating(false)
  }

  if (!mounted && !open) return null

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
                    const labels = { read: '可阅读', fork: '可 Fork', remove: '移除' }
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
            <h4 className="sh-internet-confirm-title">确认分享到互联网</h4>
            <div className="sh-internet-notice">
              <p>1. 数据将会发布到公网，请自行把控数据安全。</p>
              <p>2. 点击确认后，Agent 将自动开始生成分享页面，请耐心等待 2～3 分钟，期间会占用会话。</p>
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
                onClose()
                onInternetShare?.(shareUrl)
              }}
            >
              开始生成
            </button>
          </>
        )}
      </div>
    </div>
  )

  const renderShareView = () => (
    <>
      <div className="sh-head">
        <h3 className="sh-title">{title}</h3>
      </div>

      {webpageOnly ? (
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
      ) : (
        <div className="sh-link-row">
          <div className="sh-link-box">
            <span className="sh-link-text">{shareUrl}</span>
          </div>
          <button type="button" className="sh-copy-btn" onClick={copyLink}>
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
                  <span>{copyLabel}</span>
                </>
              )}
          </button>
          {!hideInternetShare && (
            <button
              type="button"
              className="sh-internet-btn"
              aria-label="对外分享"
              onClick={() => {
                setInternetConfirmOpen(true)
                setInternetAcknowledged(false)
                setInternetGenerating(false)
              }}
            >
              <Icon name="export" cls="ic sh-internet-ic" />
              <span>对外分享</span>
            </button>
          )}
        </div>
      )}

      {!webpageOnly && (
        <>
        <div className="sh-access-row">
        <span className="sh-access-label">指定可访问的用户</span>
        <button type="button" className="sh-target-chip" onClick={() => setManageOpen(true)} aria-label="管理可访问用户">
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
        </button>
        <div className="sh-invite-stack">
          <div className="sh-invite-entry">
            <div ref={inviteEntryRef} className="sh-select sh-invite sh-invite-inline">
              {selectedInviteMembers.map((member) => (
                <span key={member.id} className="sh-invite-chip">
                  <span className="sh-invite-chip-avatar" style={{ background: member.avatarColor }}>
                    {member.avatarSeed || member.name.charAt(0)}
                  </span>
                  <span className="sh-invite-chip-name">{member.name}</span>
                  <button
                    type="button"
                    className="sh-invite-chip-remove"
                    onClick={() => setSelectedInviteIds((ids) => ids.filter((id) => id !== member.id))}
                    aria-label={`移除${member.name}`}
                  >
                    <Icon name="x" cls="ic" />
                  </button>
                </span>
              ))}
              <div className="sh-invite-input-row">
                <input
                  ref={inviteInputRef}
                  className="sh-invite-input"
                  type="text"
                  placeholder={selectedInviteMembers.length > 0 ? '' : '输入姓名以添加用户'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="输入姓名以添加用户"
                />
                {searching && <span className="sh-invite-loading">搜索中</span>}
              </div>
            </div>
            {(selectedInviteMembers.length > 0 || inviteAdded) && (
              <button type="button" className="sh-invite-submit" onClick={submitInvites} disabled={inviteAdded}>
                {inviteAdded ? '添加成功' : '添加'}
              </button>
            )}
          </div>

          {(searching || (search.trim() && !searching)) && (
            <div className="sh-invite-results" role="listbox" aria-label="用户搜索结果">
              {searching ? (
                <div className="sh-invite-result-status">
                  <span className="sh-invite-spinner" aria-hidden="true" />
                  正在搜索用户…
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((member) => {
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className="sh-invite-result"
                      role="option"
                      aria-selected={false}
                      onClick={() => selectInvite(member.id)}
                    >
                      <span className="sh-invite-result-avatar" style={{ background: member.avatarColor }}>
                        {member.avatarSeed || member.name.charAt(0)}
                      </span>
                      <span className="sh-invite-result-main">
                        <span className="sh-invite-result-name">{member.name}</span>
                        {member.dept && <span className="sh-invite-result-dept">{member.dept}</span>}
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="sh-invite-result-status">未找到匹配用户</div>
              )}
            </div>
          )}
        </div>
        </div>

        <div className="sh-space-access-row">
        <div className="sh-space-foot">
          <span className="sh-space-foot-label">对空间成员</span>
          <div className={'sh-space-perm-picker' + (spaceMenuOpen ? ' is-open' : '')}>
            <button
              type="button"
              className="sh-space-perm-trigger"
              aria-expanded={spaceMenuOpen}
              aria-haspopup="listbox"
              onClick={() => setSpaceMenuOpen((openState) => !openState)}
            >
              <Icon name={spaceIcon[spacePerm]} cls="ic sh-space-perm-trigger-ic" />
              <span className="sh-space-perm-label">{spaceLabel[spacePerm]}</span>
              <Icon name="caret-down" cls="ic sh-space-perm-caret" />
            </button>

            {spaceMenuOpen && (
              <div className="sh-space-perm-menu" role="listbox" aria-label="对空间成员权限">
                <div className="sh-space-perm-menu-title">空间成员权限</div>
                {spacePerms.map((perm) => (
                  <button
                    key={perm}
                    type="button"
                    className="sh-space-perm-option"
                    role="option"
                    aria-selected={spacePerm === perm}
                    onClick={() => {
                      setSpacePerm(perm)
                      setSpaceMenuOpen(false)
                    }}
                  >
                    <Icon name={spaceIcon[perm]} cls="ic sh-space-perm-option-ic" />
                    <span>{spaceLabel[perm]}</span>
                    {spacePerm === perm && <Icon name="check" cls="ic sh-space-perm-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="sh-foot">
        <p className="sh-sub">
          <span className="sh-sub-ic" aria-hidden="true">
            <Icon name="info" cls="ic" />
          </span>
          <span className="sh-sub-text">访问权限对本项目的对话记录与产物分享同时生效</span>
        </p>
        </div>
        </>
      )}
    </>
  )

  const content = (
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
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}
