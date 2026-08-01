import { useRef, useState } from 'react'
import { Icon } from './Icon'
import type { Skill, Connector } from '../types'

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

export function Composer(props: ComposerProps) {
  const { placeholder, value, onChange, onSend, disabled, progress = 0 } = props
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [fileType, setFileType] = useState('默认')
  const [perm, setPerm] = useState('默认权限')
  const [model, setModel] = useState('GPT5.5')
  const [toolCount] = useState({ cur: 2, total: 2 })

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="s-composer">
      <div className="sc-main">
        <textarea
          ref={taRef}
          className="sc-ta"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
        />
        <div className="sc-hint">
          <button className="sc-chip"><span>@</span></button>
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
