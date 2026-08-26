import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { SkillDetailDialog } from '../components/SkillDetailDialog'
import { addSkillToLibrary, deleteSkillFromLibrary, toggleLibrarySkillInstalled, useSkillLibrary, type LibrarySkill } from '../skillLibraryStore'

type SkillFilter = 'all' | 'official' | 'space' | 'mine'

export function SkillLibraryView({ toast }: { toast: (message: string) => void }) {
  const skills = useSkillLibrary()
  const [filter, setFilter] = useState<SkillFilter>('all')
  const [query, setQuery] = useState('')
  const [menuSkillId, setMenuSkillId] = useState<string | null>(null)
  const [detailSkill, setDetailSkill] = useState<LibrarySkill | null>(null)

  const counts = useMemo(() => ({
    all: skills.length,
    official: skills.filter(skill => skill.owner === 'official').length,
    space: skills.filter(skill => skill.owner === 'space').length,
    mine: skills.filter(skill => skill.owner === 'mine').length,
  }), [skills])

  const visibleSkills = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return skills.filter(skill => {
      if (filter !== 'all' && skill.owner !== filter) return false
      return !keyword || skill.name.toLowerCase().includes(keyword) || skill.description.toLowerCase().includes(keyword)
    })
  }, [filter, query, skills])

  const toggleInstall = (skill: LibrarySkill) => {
    const removing = Boolean(skill.installed)
    toggleLibrarySkillInstalled(skill.id)
    toast(removing ? `已移除 ${skill.name}` : `已添加 ${skill.name}`)
  }

  return (
    <section className="view on skill-library-view">
      <header className="skill-library-top">
        <div className="skill-library-badge"><Icon name="lightning" cls="ic" />技能</div>
        <div className="skill-library-actions">
          <label className="skill-search">
            <Icon name="magnifying-glass" cls="ic" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索技能名称或描述" />
          </label>
          <button className="skill-add-primary" type="button" onClick={() => { const skill = addSkillToLibrary(); setFilter('all'); setQuery(''); toast(`已添加 ${skill.name}`) }}>
            <Icon name="plus" cls="ic" />添加技能
          </button>
        </div>
      </header>

      <div className="skill-library-scroll">
        <div className="skill-library-content">
          <nav className="skill-filter-tabs" aria-label="技能筛选">
            {([
              ['all', '全部'],
              ['official', '官方'],
              ['space', '空间'],
              ['mine', '我的'],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={filter === value ? 'on' : ''} onClick={() => setFilter(value)}>
                <span>{label}</span><small>{counts[value]}</small>
              </button>
            ))}
          </nav>

          {visibleSkills.length ? (
            <div className="skill-card-grid">
              {visibleSkills.map(skill => {
                const installed = Boolean(skill.installed)
                return (
                  <article className="skill-library-card clickable" key={skill.id} role="button" tabIndex={0} onClick={() => setDetailSkill(skill)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setDetailSkill(skill) }}>
                    <div className="skill-card-title-row">
                      <h3 title={skill.name}>{skill.name}</h3>
                      <span className="skill-kind">Skill</span>
                    </div>
                    <p>{skill.description}</p>
                    <footer>
                      <span className="skill-owner"><Icon name="seal-check" cls="ic" />{{ official: '官方技能', space: '空间技能', mine: '我的技能' }[skill.owner]}</span>
                      <div className="skill-card-actions">
                        <button type="button" className={'skill-install' + (installed ? ' installed' : '')} onClick={event => { event.stopPropagation(); toggleInstall(skill) }}>
                          <Icon name={installed ? 'check' : 'plus'} cls="ic" />{installed ? '已添加' : '添加'}
                        </button>
                        <div className="skill-more-anchor">
                          <button type="button" className="skill-more" aria-label={`${skill.name}更多操作`} aria-expanded={menuSkillId === skill.id} onClick={event => { event.stopPropagation(); setMenuSkillId(current => current === skill.id ? null : skill.id) }}>
                            <Icon name="dots-three" cls="ic" />
                          </button>
                          {menuSkillId === skill.id && (
                            <div className="skill-more-menu" role="menu">
                              <button type="button" role="menuitem" onClick={event => { event.stopPropagation(); deleteSkillFromLibrary(skill.id); setMenuSkillId(null); toast(`已删除 ${skill.name}`) }}>
                                <Icon name="x" cls="ic" />删除技能
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </footer>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="skill-library-empty">没有找到匹配的技能</div>
          )}
        </div>
      </div>
      <SkillDetailDialog skill={detailSkill} onClose={() => setDetailSkill(null)} />
    </section>
  )
}
