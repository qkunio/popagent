import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import type { Skill, Connector } from '../types'
import { api } from '../api'
import { useSkillLibrary } from '../skillLibraryStore'

interface ComposerProps {
  placeholder: string
  value: string
  onChange: (v: string) => void
  onSend: (text: string, mode?: 'fast' | 'deep') => void
  skills?: Skill[]
  connectors?: Connector[]
  variant?: 'home' | 'conv'
  folderName?: string
  disabled?: boolean
  progress?: number
}

type MentionCategory = 'author' | 'work' | 'skill' | 'agent' | 'web'
type MentionItem = { id: string; category: MentionCategory; label: string; detail?: string }

const MENTION_CATEGORIES: Array<{ id: MentionCategory; label: string }> = [
  { id: 'author', label: '作者' },
  { id: 'work', label: '作品' },
  { id: 'skill', label: 'Skill' },
  { id: 'agent', label: 'Agent' },
  { id: 'web', label: 'Web' },
]

const STATIC_MENTIONS: Record<'author' | 'work', MentionItem[]> = {
  author: [
    { id: 'author-chenhe', category: 'author', label: '陈赫', detail: '美食 · 生活方式' },
    { id: 'author-laozhou', category: 'author', label: '灶台边的老周', detail: '家常菜创作者' },
    { id: 'author-caicai', category: 'author', label: '家常菜日记', detail: '美食创作者' },
  ],
  work: [
    { id: 'work-1', category: 'work', label: '三分钟学会一道家常菜', detail: '灶台边的老周 · 作品' },
    { id: 'work-2', category: 'work', label: '本周热点选题复盘', detail: '陈赫 · 作品' },
    { id: 'work-3', category: 'work', label: '夏日低脂晚餐合集', detail: '家常菜日记 · 作品' },
  ],
}

function serializeEditor(root: HTMLElement | null): string {
  if (!root) return ''
  const readNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (!(node instanceof HTMLElement)) return ''
    if (node.dataset.mentionText) return node.dataset.mentionText
    if (node.tagName === 'BR') return '\n'
    return Array.from(node.childNodes).map(readNode).join('')
  }
  return Array.from(root.childNodes).map(readNode).join('')
}

export function Composer(props: ComposerProps) {
  const { placeholder, value, onChange, onSend, disabled, progress = 0 } = props
  const editorRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const librarySkills = useSkillLibrary()
  const [fileType, setFileType] = useState('默认')
  const [perm, setPerm] = useState('默认权限')
  const [model, setModel] = useState('GPT5.5')
  const [toolCount] = useState({ cur: 2, total: 2 })
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionCategory, setMentionCategory] = useState<MentionCategory>('author')
  const [mentionQuery, setMentionQuery] = useState('')
  const [editorEmpty, setEditorEmpty] = useState(!value)
  const [generatedApps, setGeneratedApps] = useState<Array<{ id: string; type: string; title: string; description: string }>>([])

  useEffect(() => { api.generatedApps().then(setGeneratedApps).catch(() => {}) }, [])
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || serializeEditor(editor) === value) return
    editor.textContent = value
    setEditorEmpty(!value)
  }, [value])
  useEffect(() => {
    if (!mentionOpen) return
    const close = (event: MouseEvent) => {
      if (!composerRef.current?.contains(event.target as Node)) setMentionOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => document.removeEventListener('mousedown', close)
  }, [mentionOpen])

  const mentionOptions = useMemo<MentionItem[]>(() => {
    if (mentionCategory === 'author' || mentionCategory === 'work') return STATIC_MENTIONS[mentionCategory]
    if (mentionCategory === 'skill') return librarySkills.map(skill => ({ id: skill.id, category: 'skill', label: skill.name, detail: skill.description }))
    if (mentionCategory === 'agent') return generatedApps.filter(app => app.type === 'agentapp').map(app => ({ id: app.id, category: 'agent', label: app.title, detail: app.description }))
    return generatedApps.filter(app => app.type === 'webapp').map(app => ({ id: app.id, category: 'web', label: app.title, detail: app.description }))
  }, [generatedApps, librarySkills, mentionCategory])

  const visibleMentionOptions = useMemo(() => {
    const keyword = mentionQuery.trim().toLowerCase()
    return mentionOptions.filter(item => !keyword || item.label.toLowerCase().includes(keyword) || item.detail?.toLowerCase().includes(keyword))
  }, [mentionOptions, mentionQuery])

  const rangeAtEditorEnd = () => {
    const editor = editorRef.current
    if (!editor) return null
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    return range
  }

  const captureEditorRange = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    savedRangeRef.current = editor && range && editor.contains(range.commonAncestorContainer) ? range.cloneRange() : rangeAtEditorEnd()
  }

  const openMentionPicker = () => {
    captureEditorRange()
    setMentionOpen(true)
    setMentionQuery('')
  }

  const selectMention = (item: MentionItem) => {
    const editor = editorRef.current
    if (!editor) return
    const typeLabel = MENTION_CATEGORIES.find(category => category.id === item.category)?.label || ''
    const mentionText = `@${typeLabel}：${item.label}`
    const range = savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer) ? savedRangeRef.current : rangeAtEditorEnd()
    if (!range) return
    range.deleteContents()
    const token = document.createElement('span')
    token.className = 'sc-mention-token'
    token.contentEditable = 'false'
    token.dataset.mentionText = mentionText
    token.dataset.mentionId = `${item.category}:${item.id}`
    token.textContent = mentionText
    const trailingSpace = document.createTextNode(' ')
    range.insertNode(trailingSpace)
    range.insertNode(token)
    const selection = window.getSelection()
    const after = document.createRange()
    after.setStartAfter(trailingSpace)
    after.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(after)
    savedRangeRef.current = after.cloneRange()
    const nextValue = serializeEditor(editor)
    onChange(nextValue)
    setEditorEmpty(!nextValue)
    setMentionOpen(false)
    setMentionQuery('')
    window.setTimeout(() => editor.focus(), 0)
  }

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
  }

  const syncEditorValue = () => {
    const nextValue = serializeEditor(editorRef.current)
    onChange(nextValue)
    setEditorEmpty(!nextValue)
  }

  const handleEditorInput = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    const textNode = range?.startContainer
    const offset = range?.startOffset ?? 0

    // Some browsers don't dispatch cancellable beforeinput events for
    // contentEditable. Detect a just-inserted @ at the caret as a fallback,
    // remove it, and preserve that exact position for the rich mention token.
    if (
      editor && range?.collapsed && textNode?.nodeType === Node.TEXT_NODE &&
      editor.contains(textNode) && offset > 0 &&
      textNode.textContent?.charAt(offset - 1) === '@'
    ) {
      const currentText = textNode.textContent || ''
      textNode.textContent = currentText.slice(0, offset - 1) + currentText.slice(offset)
      const caret = document.createRange()
      caret.setStart(textNode, offset - 1)
      caret.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(caret)
      savedRangeRef.current = caret.cloneRange()
      const nextValue = serializeEditor(editor)
      onChange(nextValue)
      setEditorEmpty(!nextValue)
      setMentionQuery('')
      setMentionOpen(true)
      return
    }

    syncEditorValue()
  }

  const insertLineBreak = () => {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    range.deleteContents()
    const lineBreak = document.createTextNode('\n')
    range.insertNode(lineBreak)
    range.setStartAfter(lineBreak)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    syncEditorValue()
  }

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && mentionOpen) {
      setMentionOpen(false)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      insertLineBreak()
    }
  }

  const handleBeforeInput = (event: React.FormEvent<HTMLDivElement>) => {
    const inputEvent = event.nativeEvent as InputEvent
    if (inputEvent.inputType === 'insertText' && inputEvent.data === '@') {
      event.preventDefault()
      openMentionPicker()
    }
  }

  return (
    <div className="s-composer" ref={composerRef}>
      {mentionOpen && (
        <section className="mention-picker" role="dialog" aria-label="选择引用内容">
          <nav className="mention-categories" aria-label="引用类型">
            {MENTION_CATEGORIES.map(category => (
              <button type="button" key={category.id} className={mentionCategory === category.id ? 'on' : ''} onClick={() => { setMentionCategory(category.id); setMentionQuery(''); window.setTimeout(() => searchRef.current?.focus(), 0) }}>
                <span>{category.label}</span><Icon name="caret-right" cls="ic" />
              </button>
            ))}
          </nav>
          <div className="mention-results">
            <label className="mention-search">
              <Icon name="magnifying-glass" cls="ic" />
              <input ref={searchRef} value={mentionQuery} onChange={event => setMentionQuery(event.target.value)} placeholder={`搜索${MENTION_CATEGORIES.find(category => category.id === mentionCategory)?.label}`} />
            </label>
            <div className="mention-result-list">
              {visibleMentionOptions.length ? visibleMentionOptions.map(item => (
                <button type="button" key={`${item.category}:${item.id}`} onClick={() => selectMention(item)}>
                  <span className={'mention-result-icon ' + item.category}>{item.category === 'author' ? item.label.slice(0, 1) : <Icon name={item.category === 'work' ? 'code' : item.category === 'skill' ? 'lightning' : item.category === 'agent' ? 'chat-circle-text' : 'columns'} cls="ic" />}</span>
                  <span className="mention-result-copy"><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}</span>
                </button>
              )) : <div className="mention-empty">输入关键词搜索{MENTION_CATEGORIES.find(category => category.id === mentionCategory)?.label}</div>}
            </div>
          </div>
        </section>
      )}
      <div className="sc-main">
        <div
          ref={editorRef}
          className="sc-editor"
          contentEditable={!disabled}
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          data-placeholder={placeholder}
          data-empty={editorEmpty ? 'true' : 'false'}
          suppressContentEditableWarning
          onInput={handleEditorInput}
          onBeforeInput={handleBeforeInput}
          onKeyDown={handleKey}
        />
        <div className="sc-hint">
          <button type="button" className="sc-chip" onClick={openMentionPicker}><span>@</span></button>
          <span className="sc-sep">/</span>
          <button className="sc-chip">
            <span>技能</span>
          </button>
          <span className="sc-dot" />
          <span className="sc-tool-count">
            <span className="green-dot" />
            工具 {toolCount.cur}/{toolCount.total}
          </span>
        </div>
        <button
          className={'sc-send' + (progress > 0 && progress < 100 ? ' with-progress' : '')}
          onClick={handleSend}
          disabled={!value.trim() || disabled}
        >
          {progress > 0 && progress < 100 ? (
            <svg viewBox="0 0 36 36" className="sc-progress">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="var(--btn)" strokeWidth="3"
                strokeDasharray={`${(progress / 100) * 94.2} 94.2`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
              <text x="18" y="22" textAnchor="middle" fontSize="10" fill="var(--btn)" fontWeight="600">
                {progress}%
              </text>
            </svg>
          ) : (
            <Icon name="arrow-up" cls="ic" />
          )}
        </button>
      </div>

      <div className="sc-toolbar">
        <button className="st-left st-btn">
          <Icon name="folder" cls="ic-s ic" />
          <span>{fileType}</span>
          <Icon name="caret-down" cls="ic-xs ic" />
        </button>

        <button className="st-left st-btn">
          <span>{perm}</span>
          <Icon name="caret-down" cls="ic-xs ic" />
        </button>

        <button className="st-left st-btn">
          <Icon name="paperclip" cls="ic-s ic" />
          <span>上传文件</span>
        </button>

        <div className="st-right">
          <button className="st-right st-btn">
            <Icon name="lightning" cls="ic-s ic" />
            <span>{model}</span>
            <Icon name="caret-down" cls="ic-xs ic" />
          </button>
        </div>
      </div>
    </div>
  )
}
