import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import type { SkillAppFile, SkillAppPreview as SkillAppPreviewData } from '../types'

interface Props {
  data: SkillAppPreviewData
  files: SkillAppFile[]
  folders: string[]
  onFilesChange: (files: SkillAppFile[], folders: string[]) => void
  onDirtyChange?: (dirty: boolean) => void
}

export interface SkillAppPreviewHandle {
  save: () => void
  discard: () => void
}

type EditingItem = { kind: 'file' | 'folder'; path: string; value: string } | null
type CreatingItem = 'file' | 'folder' | null
type DraggingItem = { kind: 'file' | 'folder'; path: string } | null

const baseName = (path: string) => path.split('/').pop() || path
const parentPath = (path: string) => path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''

export const SkillAppPreview = forwardRef<SkillAppPreviewHandle, Props>(function SkillAppPreview({ data, files, folders, onFilesChange, onDirtyChange }, ref) {
  const [selectedPath, setSelectedPath] = useState('SKILL.md')
  const [draftFiles, setDraftFiles] = useState<SkillAppFile[]>(files)
  const [draftFolders, setDraftFolders] = useState<string[]>(folders)
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ sop: true, references: true })
  const [creating, setCreating] = useState<CreatingItem>(null)
  const [createName, setCreateName] = useState('')
  const [editing, setEditing] = useState<EditingItem>(null)
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const [draggingItem, setDraggingItem] = useState<DraggingItem>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftFiles(files)
    setDraftFolders(folders)
    if (!files.some(file => file.path === selectedPath)) setSelectedPath(files[0]?.path || '')
  }, [data.name, files, folders])

  useEffect(() => { if (creating) createInputRef.current?.focus() }, [creating])
  useEffect(() => { if (editing) editInputRef.current?.focus() }, [editing])

  useEffect(() => {
    if (!menuKey) return
    const close = () => setMenuKey(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuKey])

  const selectedFile = draftFiles.find(file => file.path === selectedPath) || draftFiles[0]
  const fileChanged = draftFiles.length !== files.length || draftFiles.some(file => files.find(saved => saved.path === file.path)?.content !== file.content)
  const folderChanged = draftFolders.length !== folders.length || draftFolders.some(folder => !folders.includes(folder))
  const dirty = fileChanged || folderChanged

  const saveChanges = () => onFilesChange(draftFiles.map(file => ({ ...file })), [...draftFolders])
  const discardChanges = () => {
    setDraftFiles(files.map(file => ({ ...file })))
    setDraftFolders([...folders])
    if (!files.some(file => file.path === selectedPath)) setSelectedPath(files[0]?.path || '')
  }

  useImperativeHandle(ref, () => ({ save: saveChanges, discard: discardChanges }))
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])

  const folderRows = useMemo(() => {
    const known = new Set(draftFolders)
    draftFiles.forEach(file => {
      const parent = parentPath(file.path)
      if (parent) known.add(parent)
    })
    return [...known].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [draftFiles, draftFolders])

  const rootFiles = draftFiles.filter(file => !file.path.includes('/'))

  const updateSelectedFile = (content: string) => {
    setDraftFiles(current => current.map(file => file.path === selectedPath ? { ...file, content } : file))
  }

  const requestSelectFile = (path: string) => {
    if (path === selectedPath) return
    if (dirty) { setPendingFilePath(path); return }
    setSelectedPath(path)
  }

  const saveAndSelectPendingFile = () => {
    if (!pendingFilePath) return
    saveChanges()
    setSelectedPath(pendingFilePath)
    setPendingFilePath(null)
  }

  const beginCreate = (kind: CreatingItem) => {
    setMenuKey(null)
    setEditing(null)
    setCreating(kind)
    setCreateName('')
  }

  const commitCreate = () => {
    const name = createName.trim().replace(/^\/+|\/+$/g, '')
    if (!creating || !name) { setCreating(null); return }
    if (creating === 'file') {
      if (draftFiles.some(file => file.path === name) || draftFolders.includes(name)) return
      setDraftFiles(current => [...current, { path: name, content: '' }])
      setSelectedPath(name)
    } else {
      if (draftFolders.includes(name) || draftFiles.some(file => file.path === name || file.path.startsWith(`${name}/`))) return
      setDraftFolders(current => [...current, name])
      setExpandedFolders(current => ({ ...current, [name]: true }))
    }
    setCreating(null)
    setCreateName('')
  }

  const beginRename = (kind: 'file' | 'folder', path: string) => {
    setMenuKey(null)
    setCreating(null)
    setEditing({ kind, path, value: baseName(path) })
  }

  const commitRename = () => {
    if (!editing) return
    const name = editing.value.trim().replace(/[\\/]/g, '')
    if (!name || name === baseName(editing.path)) { setEditing(null); return }
    if (editing.kind === 'file') {
      const parent = parentPath(editing.path)
      const nextPath = parent ? `${parent}/${name}` : name
      if (draftFiles.some(file => file.path === nextPath)) return
      setDraftFiles(current => current.map(file => file.path === editing.path ? { ...file, path: nextPath } : file))
      if (selectedPath === editing.path) setSelectedPath(nextPath)
    } else {
      const parent = parentPath(editing.path)
      const nextFolder = parent ? `${parent}/${name}` : name
      if (draftFolders.includes(nextFolder)) return
      setDraftFolders(current => current.map(folder => folder === editing.path || folder.startsWith(`${editing.path}/`) ? nextFolder + folder.slice(editing.path.length) : folder))
      setDraftFiles(current => current.map(file => file.path.startsWith(`${editing.path}/`) ? { ...file, path: nextFolder + file.path.slice(editing.path.length) } : file))
      if (selectedPath.startsWith(`${editing.path}/`)) setSelectedPath(nextFolder + selectedPath.slice(editing.path.length))
      setExpandedFolders(current => ({ ...current, [nextFolder]: current[editing.path] !== false }))
    }
    setEditing(null)
  }

  const deleteFile = (path: string) => {
    const remaining = draftFiles.filter(file => file.path !== path)
    setDraftFiles(remaining)
    if (selectedPath === path) setSelectedPath(remaining[0]?.path || '')
    setMenuKey(null)
  }

  const deleteFolder = (folder: string) => {
    const remaining = draftFiles.filter(file => !file.path.startsWith(`${folder}/`))
    setDraftFiles(remaining)
    setDraftFolders(current => current.filter(item => item !== folder && !item.startsWith(`${folder}/`)))
    if (selectedPath.startsWith(`${folder}/`)) setSelectedPath(remaining[0]?.path || '')
    setMenuKey(null)
  }

  const moveFile = (path: string, folder: string) => {
    const name = baseName(path)
    const nextPath = folder ? `${folder}/${name}` : name
    if (nextPath === path || draftFiles.some(file => file.path === nextPath)) return
    setDraftFiles(current => current.map(file => file.path === path ? { ...file, path: nextPath } : file))
    if (selectedPath === path) setSelectedPath(nextPath)
  }

  const moveFolder = (path: string, targetFolder: string) => {
    if (targetFolder === path || targetFolder.startsWith(`${path}/`)) return
    const nextFolder = targetFolder ? `${targetFolder}/${baseName(path)}` : baseName(path)
    if (nextFolder === path || folderRows.includes(nextFolder)) return
    setDraftFolders(current => current.map(folder => folder === path || folder.startsWith(`${path}/`) ? nextFolder + folder.slice(path.length) : folder))
    setDraftFiles(current => current.map(file => file.path.startsWith(`${path}/`) ? { ...file, path: nextFolder + file.path.slice(path.length) } : file))
    if (selectedPath.startsWith(`${path}/`)) setSelectedPath(nextFolder + selectedPath.slice(path.length))
    setExpandedFolders(current => ({ ...current, [nextFolder]: current[path] !== false, [targetFolder]: true }))
  }

  const finishDrop = (folder: string) => {
    if (draggingItem?.kind === 'file') moveFile(draggingItem.path, folder)
    if (draggingItem?.kind === 'folder') moveFolder(draggingItem.path, folder)
    setDraggingItem(null)
    setDropTarget(null)
  }

  const lineCount = Math.max(1, selectedFile?.content.split('\n').length || 1)

  const itemMenu = (kind: 'file' | 'folder', path: string) => {
    const key = `${kind}:${path}`
    return (
      <div className="skillapp-item-actions" onMouseDown={event => event.stopPropagation()}>
        <button type="button" className="skillapp-more" aria-label={`${baseName(path)}更多操作`} onClick={event => { event.stopPropagation(); setMenuKey(current => current === key ? null : key) }}><Icon name="dots-three" cls="ic" /></button>
        {menuKey === key && (
          <div className="skillapp-item-menu" role="menu" onMouseDown={event => event.stopPropagation()}>
            <button type="button" role="menuitem" onClick={() => beginRename(kind, path)}><Icon name="pencil-simple" cls="ic" />重命名</button>
            <button type="button" role="menuitem" className="danger" onClick={() => kind === 'file' ? deleteFile(path) : deleteFolder(path)}><Icon name="x" cls="ic" />删除</button>
          </div>
        )}
      </div>
    )
  }

  const fileRow = (file: SkillAppFile, child = false) => (
    <div
      className={'skillapp-tree-item' + (selectedPath === file.path ? ' on' : '') + (child ? ' child' : '') + (draggingItem?.kind === 'file' && draggingItem.path === file.path ? ' dragging' : '')}
      key={file.path}
      draggable
      onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', file.path); setDraggingItem({ kind: 'file', path: file.path }); setMenuKey(null) }}
      onDragEnd={() => { setDraggingItem(null); setDropTarget(null) }}
    >
      {editing?.kind === 'file' && editing.path === file.path ? (
        <div className="skillapp-inline-edit"><Icon name="code" cls="ic" /><input ref={editInputRef} value={editing.value} onChange={event => setEditing({ ...editing, value: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') commitRename(); if (event.key === 'Escape') setEditing(null) }} onBlur={commitRename} /></div>
      ) : (
        <button type="button" className="skillapp-item-main" onClick={() => requestSelectFile(file.path)}><Icon name="code" cls="ic" /><span>{baseName(file.path)}</span></button>
      )}
      {itemMenu('file', file.path)}
    </div>
  )

  const folderRow = (folder: string) => {
    const expanded = expandedFolders[folder] !== false
    const childFiles = draftFiles.filter(file => parentPath(file.path) === folder)
    const childFolders = folderRows.filter(item => parentPath(item) === folder)
    const invalidDrop = draggingItem?.kind === 'folder' && (draggingItem.path === folder || folder.startsWith(`${draggingItem.path}/`))
    return (
      <div
        className={'skillapp-folder' + (dropTarget === folder ? ' drop-target' : '')}
        key={folder}
        onDragOver={event => {
          if (invalidDrop) return
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = 'move'
          setDropTarget(folder)
        }}
        onDragLeave={() => setDropTarget(current => current === folder ? null : current)}
        onDrop={event => { if (invalidDrop) return; event.preventDefault(); event.stopPropagation(); finishDrop(folder) }}
      >
        <div
          className={'skillapp-tree-item folder-item' + (draggingItem?.kind === 'folder' && draggingItem.path === folder ? ' dragging' : '')}
          draggable={editing?.path !== folder}
          onDragStart={event => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', folder); setDraggingItem({ kind: 'folder', path: folder }); setMenuKey(null) }}
          onDragEnd={() => { setDraggingItem(null); setDropTarget(null) }}
        >
          {editing?.kind === 'folder' && editing.path === folder ? (
            <div className="skillapp-inline-edit"><Icon name="folder" cls="ic" /><input ref={editInputRef} value={editing.value} onChange={event => setEditing({ ...editing, value: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') commitRename(); if (event.key === 'Escape') setEditing(null) }} onBlur={commitRename} /></div>
          ) : (
            <button type="button" className="skillapp-item-main" onClick={() => setExpandedFolders(current => ({ ...current, [folder]: !expanded }))}><Icon name={expanded ? 'caret-down' : 'caret-right'} cls="ic caret" /><Icon name="folder" cls="ic" /><span>{baseName(folder)}</span></button>
          )}
          {itemMenu('folder', folder)}
        </div>
        {expanded && (childFiles.length > 0 || childFolders.length > 0) && (
          <div className="skillapp-folder-children">
            {childFiles.map(file => fileRow(file))}
            {childFolders.map(childFolder => folderRow(childFolder))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="skillapp-preview" aria-label={`${data.name} Skill 文件编辑器`}>
      <aside className="skillapp-files">
        <header>
          <span>文件</span>
          <div className="skillapp-file-actions">
            <button type="button" title="新建文件" aria-label="新建文件" onClick={() => beginCreate('file')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 3.5h6.5L17.5 7.75v4.5M13 3.75V8h4.25M5.5 3.5h7.75L17.5 7.75V11M11 18h7M14.5 14.5v7M5.5 3.5v17h5" /></svg></button>
            <button type="button" title="新建文件夹" aria-label="新建文件夹" onClick={() => beginCreate('folder')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h6l1.75 2H20.5v11h-17zM12 14h5M14.5 11.5v5" /></svg></button>
          </div>
        </header>
        <div className={'skillapp-tree' + (dropTarget === '__root__' ? ' drop-target' : '')} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget('__root__') }} onDrop={event => { event.preventDefault(); finishDrop('') }}>
          {creating && (
            <div className="skillapp-create-row">
              <Icon name={creating === 'folder' ? 'folder' : 'code'} cls="ic" />
              <input ref={createInputRef} value={createName} onChange={event => setCreateName(event.target.value)} placeholder={creating === 'folder' ? '文件夹名称' : '文件名称'} onKeyDown={event => { if (event.key === 'Enter') commitCreate(); if (event.key === 'Escape') setCreating(null) }} onBlur={commitCreate} />
            </div>
          )}
          {rootFiles.map(file => fileRow(file))}
          {folderRows.filter(folder => !parentPath(folder)).map(folder => folderRow(folder))}
        </div>
      </aside>

      <div className="skillapp-editor-shell">
        <header className="skillapp-editor-head">
          <div className="skillapp-breadcrumb">{selectedPath ? selectedPath.split('/').map((part, index, parts) => <span key={`${part}-${index}`}><strong>{part}</strong>{index < parts.length - 1 && <Icon name="caret-right" cls="ic" />}</span>) : <span><strong>选择一个文件</strong></span>}</div>
          {dirty && (
            <div className="skillapp-unsaved-inline" role="status">
              <span>改动未保存，是否保存</span>
              <button type="button" className="save" onClick={saveChanges}>保存</button>
              <button type="button" onClick={discardChanges}>取消</button>
            </div>
          )}
        </header>
        {pendingFilePath && (
          <div className="skillapp-unsaved-popover" role="dialog" aria-label="未保存改动">
            <span>改动未保存，是否保存</span>
            <div><button type="button" className="save" onClick={saveAndSelectPendingFile}>保存</button><button type="button" onClick={() => setPendingFilePath(null)}>取消</button></div>
          </div>
        )}
        <div className="skillapp-code-editor">
          <div className="skillapp-line-numbers" aria-hidden="true">{Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
          <textarea value={selectedFile?.content || ''} onChange={event => updateSelectedFile(event.target.value)} spellCheck={false} aria-label={selectedPath || '文件内容'} disabled={!selectedFile} />
        </div>
      </div>
    </section>
  )
})
