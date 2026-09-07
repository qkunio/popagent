import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { LibrarySkill } from '../skillLibraryStore'
import { Markdown } from './Markdown'

type DetailFile = { path: string; content: string }

const baseName = (path: string) => path.split('/').pop() || path
const parentPath = (path: string) => path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''

function makeFallbackSkillFile(skill: LibrarySkill): DetailFile {
  const detail = skill.detail?.trim() || skill.description
  const hasFrontmatter = detail.startsWith('---\n')
  return {
    path: 'SKILL.md',
    content: hasFrontmatter
      ? detail
      : `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n# ${skill.name}\n\n${detail}`,
  }
}

function parseSkillDocument(content: string, skill: LibrarySkill) {
  const fallback = { name: skill.name, description: skill.description }
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/)
  if (!match) return { metadata: fallback, body: content }

  const metadata: Record<string, string> = {}
  match[1].split('\n').forEach(line => {
    const entry = line.match(/^([\w-]+):\s*(.*)$/)
    if (!entry) return
    const value = entry[2].trim()
    metadata[entry[1]] = value.length > 1 && value[0] === value[value.length - 1] && ['"', "'"].includes(value[0])
      ? value.slice(1, -1)
      : value
  })

  return {
    metadata: Object.keys(metadata).length ? metadata : fallback,
    body: content.slice(match[0].length).trim() || `# ${skill.name}\n\n${skill.description}`,
  }
}

export function SkillDetailDialog({ skill, onClose }: { skill: LibrarySkill | null; onClose: () => void }) {
  const files = useMemo<DetailFile[]>(() => {
    if (!skill) return []
    return skill.files?.length ? skill.files.map(file => ({ ...file })) : [makeFallbackSkillFile(skill)]
  }, [skill])
  const folderPaths = useMemo(() => {
    const folders = new Set(skill?.folders || [])
    files.forEach(file => {
      const parts = file.path.split('/').slice(0, -1)
      parts.forEach((_, index) => folders.add(parts.slice(0, index + 1).join('/')))
    })
    return [...folders].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [files, skill?.folders])
  const [selectedPath, setSelectedPath] = useState('SKILL.md')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [metadataExpanded, setMetadataExpanded] = useState(true)

  useEffect(() => {
    if (!skill) return
    setSelectedPath(files.find(file => file.path === 'SKILL.md')?.path || files[0]?.path || '')
    setExpandedFolders(Object.fromEntries(folderPaths.map(folder => [folder, true])))
    setMetadataExpanded(true)
  }, [skill?.id])

  useEffect(() => {
    if (!skill) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [skill, onClose])

  if (!skill) return null

  const selectedFile = files.find(file => file.path === selectedPath) || files[0]
  const parsedDocument = parseSkillDocument(selectedFile?.content || '', skill)
  const metadataEntries = Object.entries(parsedDocument.metadata)
  const rootFiles = files.filter(file => !parentPath(file.path))

  const renderFile = (file: DetailFile) => (
    <button
      type="button"
      className={'skill-detail-file' + (selectedFile?.path === file.path ? ' on' : '')}
      key={file.path}
      onClick={() => setSelectedPath(file.path)}
      title={file.path}
    >
      <FileText size={15} aria-hidden="true" />
      <span>{baseName(file.path)}</span>
    </button>
  )

  const renderFolder = (folder: string) => {
    const expanded = expandedFolders[folder] !== false
    const active = selectedFile?.path.startsWith(`${folder}/`)
    const childFiles = files.filter(file => parentPath(file.path) === folder)
    const childFolders = folderPaths.filter(item => parentPath(item) === folder)
    return (
      <div className="skill-detail-folder" key={folder}>
        <button
          type="button"
          className={'skill-detail-folder-row' + (active ? ' active' : '')}
          onClick={() => setExpandedFolders(current => ({ ...current, [folder]: !expanded }))}
          aria-expanded={expanded}
          title={folder}
        >
          {expanded ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
          <Folder size={15} aria-hidden="true" />
          <span>{baseName(folder)}</span>
        </button>
        {expanded && (childFiles.length > 0 || childFolders.length > 0) && (
          <div className="skill-detail-folder-children">
            {childFiles.map(renderFile)}
            {childFolders.map(renderFolder)}
          </div>
        )}
      </div>
    )
  }

  return createPortal(
    <div className="skill-detail-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="skill-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="skill-detail-title">
        <header className="skill-detail-header">
          <h2 id="skill-detail-title">{skill.name}</h2>
          <button type="button" aria-label="关闭技能详情" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>

        <div className="skill-detail-layout">
          <aside className="skill-detail-sidebar" aria-label="文件列表">
            <h3>文件列表</h3>
            <div className="skill-detail-tree">
              {rootFiles.map(renderFile)}
              {folderPaths.filter(folder => !parentPath(folder)).map(renderFolder)}
            </div>
          </aside>

          <section className="skill-detail-document">
            <header className="skill-detail-document-head">{selectedFile?.path || '选择文件'}</header>
            <div className="skill-detail-document-scroll">
              {baseName(selectedFile?.path || '').toLowerCase() === 'skill.md' && (
                <section className="skill-detail-metadata">
                  <button type="button" onClick={() => setMetadataExpanded(open => !open)} aria-expanded={metadataExpanded}>
                    <strong>Metadata ({metadataEntries.length})</strong>
                    {metadataExpanded ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
                  </button>
                  {metadataExpanded && (
                    <dl>
                      {metadataEntries.map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              )}
              <div className="skill-detail-markdown"><Markdown text={parsedDocument.body} /></div>
            </div>
          </section>
        </div>
      </section>
    </div>,
    document.body,
  )
}
