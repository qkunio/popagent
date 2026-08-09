import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { LibrarySkill } from '../skillLibraryStore'
import { Icon } from './Icon'

export function SkillDetailDialog({ skill, onClose }: { skill: LibrarySkill | null; onClose: () => void }) {
  useEffect(() => {
    if (!skill) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [skill, onClose])

  if (!skill) return null

  return createPortal(
    <div className="skill-detail-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="skill-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="skill-detail-title">
        <header>
          <h2 id="skill-detail-title">{skill.name}</h2>
          <button type="button" aria-label="关闭技能详情" onClick={onClose}><Icon name="x" cls="ic" /></button>
        </header>
        <div className="skill-detail-content">{skill.description}</div>
      </section>
    </div>,
    document.body,
  )
}
