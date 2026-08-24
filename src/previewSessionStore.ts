import type { SkillAppFile } from './types'

const PREVIEW_SESSION_PREFIX = 'popagent:preview-session:v1'

export type SkillEditorSessionState = {
  selectedPath: string
  draftFiles: SkillAppFile[]
  draftFolders: string[]
  expandedFolders: Record<string, boolean>
  creating: 'file' | 'folder' | null
  createName: string
  editing: { kind: 'file' | 'folder'; path: string; value: string } | null
  pendingFilePath: string | null
}

export type SkillAppSessionState = {
  files?: SkillAppFile[]
  folders?: string[]
  testOpen?: boolean
  editor?: SkillEditorSessionState
}

function storageKey(namespace: string, key: string) {
  return `${PREVIEW_SESSION_PREFIX}:${namespace}:${key}`
}

export function readPreviewSession<T>(namespace: string, key: string): T | null {
  try {
    const raw = sessionStorage.getItem(storageKey(namespace, key))
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

export function updatePreviewSession<T extends object>(namespace: string, key: string, patch: Partial<T>) {
  try {
    const current = readPreviewSession<T>(namespace, key) || {} as T
    sessionStorage.setItem(storageKey(namespace, key), JSON.stringify({ ...current, ...patch }))
  } catch {}
}
