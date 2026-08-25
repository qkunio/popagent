// ==== 领域类型 ====
export interface Skill {
  id: string; name: string; icon: string; color: string; category: string
  gate: string; gate_label: string; description: string; prompt: string
  connector_id: string | null; connector_ok: number
  system_prompt: string; tools: string[]
  pass_line: string; cur_score: string; cur_label: string; eval_meta: string
  pipe_step: number; samples: string[]; versions: [string, string, string][]
  sort: number
  installed?: number; featured?: number
  detail?: string
}

export interface Connector {
  id: string; name: string; icon: string; color: string
  description: string; scope: string; status: 'connected' | 'pending'; sort: number
}

export interface AppItem {
  id: string; name: string; type: string; icon: string; color: string
  description: string; source: string; spec: any; visits: number; published: number; created_at: number
  shared?: boolean; collab_members?: CollabMember[]; chat_id?: string | null
}

export interface Schedule {
  id: string; name: string; icon: string; color: string; description: string
  cron_desc: string; channel: string; subscribed: number; runs: number[]; last_error: string | null; sort: number
  prompt?: string
}

export interface Folder {
  id: string; name: string; is_default: number; kind?: 'local' | 'cloud'; cloud_token?: string; cloud_url?: string
  members: { name: string; color: string }[]
  taskCount?: number; taskPreview?: { id: string; title: string }[]; created_at: number; updated_at: number
  shared?: boolean; collab_members?: CollabMember[]
}

export interface SidebarTask {
  id: string; title: string; dot: string; skill_id: string | null; pinned?: boolean; cloud?: boolean; group?: boolean
}

export interface TraceStep { tool: string; connector: string; label: string; status: 'run' | 'ok' | 'err' | 'auth'; ms: number }

export interface KPIData { label: string; value: string; delta?: string; status?: 'good' | 'bad' | 'neutral' }
export interface Insight { idx: number; title: string; summary: string; bullets: string[] }
export interface KanbanPreview {
  type: 'webapp'
  theme?: 'sand' | 'violet'
  revision?: number
  subtitle: string
  title: string
  description: string
  meta: { label: string; value: string }[]
  status_tag: { label: string; color: 'warn' | 'ok' | 'grn' }
  conclusion: { label: string; summary: string }
  kpis: KPIData[]
  insights: Insight[]
}

export interface WebpageSection {
  id: string
  title: string
  lead?: string
  kpis?: { label: string; value: string; delta?: string; badge?: 'up' | 'down' }[]
  body: string
  bullets?: string[]
  accent?: 'sage' | 'lilac' | 'coral' | 'sky'
}

export interface WebpagePreview {
  type: 'sharepage'
  theme: 'sage' | 'lilac' | 'coral' | 'sky'
  cover: {
    eyebrow: string
    title: string
    subtitle: string
    tags: string[]
    shareMeta: { by: string; at: string; reads: string; external: boolean }
  }
  summary: string
  sections: WebpageSection[]
  callout: { label: string; body: string; cta: string }
  footer: { note: string; share_url: string; qr_caption: string }
}

export interface AgentPreview {
  type: 'agent'
  name: string
  description: string
  welcome: string
  placeholder: string
}

export interface SkillAppFile {
  path: string
  content: string
}

export interface SkillAppPreview {
  type: 'skill'
  name: string
  description: string
  folders: string[]
  files: SkillAppFile[]
}

export interface ScriptAppPreview {
  type: 'script'
  name: string
  description: string
  inputs: Array<{ name: string; type: 'string' | 'integer'; required?: boolean; description: string; placeholder?: string; defaultValue?: string }>
  outputs: Array<{ name: string; type: string; description: string }>
}

export type AppPreview = KanbanPreview | WebpagePreview | AgentPreview | SkillAppPreview | ScriptAppPreview

export interface GeneratedApp {
  id: string
  taskId: string
  messageId: string
  type: 'webapp' | 'agentapp' | 'skillapp' | 'scriptapp'
  title: string
  description: string
  createdAt: number
}

export interface Message {
  id: string; task_id: string; role: 'user' | 'assistant'; content: string
  trace: TraceStep[]; sources: string[]; feedback: string | null; created_at: number
  app_preview?: AppPreview | null
}

export interface TaskDetail {
  id: string; title: string; folder_id: string; skill_id: string | null; status: string; dot: string
  pinned?: boolean
  messages: Message[]; skill: { id: string; name: string; color: string; icon: string } | null
}

export interface EvalCase { id: string; skill_id: string; input: string; expected: string; judge: string; sort: number }

export interface RecentTask { id: string; title: string; updated_at: number; skill_name: string | null; skill_color: string | null }

export interface ShareState {
  internal: boolean
  external: boolean
  visit_internal: number
  visit_external: number
  internal_url: string
  external_url: string | null
}

export interface CollabMember { name: string; color: string; role: 'owner' | 'member' }
export interface TaskCollab { kind: 'personal' | 'group'; members: CollabMember[]; invite_token: string; invite_url: string }
export interface FolderShareState { share: boolean; token: string; visits: number; share_url: string | null }

// 会话绑定的应用（分屏面板用）
export interface SessionApp {
  id: string; name: string; type: string; icon: string; color: string
  source: string; published: number; spec: { previewUrl?: string; kpis?: any[]; improvements?: any[]; [k: string]: any }
}
