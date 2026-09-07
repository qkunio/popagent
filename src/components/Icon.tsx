import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  AtSign,
  BadgeCheck,
  Bell,
  Bot,
  Brain,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Cloud,
  Code2,
  Columns2,
  Copy,
  Database,
  ExternalLink,
  FilePlus2,
  FlaskConical,
  Folder,
  FolderPlus,
  Folders,
  Funnel,
  Gauge,
  Grid2X2,
  GripVertical,
  History,
  Info,
  Link,
  List,
  Lock,
  MessageCircleMore,
  Minimize2,
  Moon,
  MoreHorizontal,
  Paintbrush,
  Paperclip,
  Pencil,
  Pin,
  Play,
  PlugZap,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash2,
  TrendingDown,
  Upload,
  UserPlus,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  alarm: AlarmClock,
  'arrow-clockwise': RotateCw,
  'arrow-counter-clockwise': RotateCcw,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrows-in-simple': Minimize2,
  at: AtSign,
  bell: Bell,
  bot: Bot,
  brain: Brain,
  'caret-down': ChevronDown,
  'caret-right': ChevronRight,
  'chart-line-up': ChartNoAxesCombined,
  'chat-circle-text': MessageCircleMore,
  check: Check,
  'check-circle': CircleCheck,
  'clock-clockwise': History,
  cloud: Cloud,
  code: Code2,
  columns: Columns2,
  copy: Copy,
  database: Database,
  'dots-six-vertical': GripVertical,
  'dots-three': MoreHorizontal,
  export: ExternalLink,
  'file-plus': FilePlus2,
  flask: FlaskConical,
  folder: Folder,
  'folder-plus': FolderPlus,
  folders: Folders,
  funnel: Funnel,
  gauge: Gauge,
  info: Info,
  lightning: Zap,
  link: Link,
  list: List,
  lock: Lock,
  'magnifying-glass': Search,
  moon: Moon,
  'paintbrush': Paintbrush,
  'paper-plane-tilt': Send,
  paperclip: Paperclip,
  'pencil-simple': Pencil,
  pin: Pin,
  play: Play,
  'plugs-connected': PlugZap,
  plus: Plus,
  'seal-check': BadgeCheck,
  'share-fat': ExternalLink,
  'shield-check': ShieldCheck,
  sparkle: Sparkles,
  sparkles: Sparkles,
  'squares-four': Grid2X2,
  sun: Sun,
  'thumbs-down': ThumbsDown,
  'thumbs-up': ThumbsUp,
  timer: Timer,
  trash: Trash2,
  'trend-down': TrendingDown,
  upload: Upload,
  'user-plus': UserPlus,
  users: Users,
  'warning-circle': CircleAlert,
  x: X,
}

export function Icon({ name, cls = 'ic' }: { name: string; cls?: string }) {
  const normalizedName = name.startsWith('i-') ? name.slice(2) : name
  const Component = icons[normalizedName] || CircleHelp
  return <Component className={cls} aria-hidden="true" />
}

// ==== Toast ====
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const toast = useCallback((m: string) => {
    setMsg(m); setShow(true)
    window.clearTimeout((toast as any)._t)
    ;(toast as any)._t = window.setTimeout(() => setShow(false), 2200)
  }, [])
  useEffect(() => {
    const onShow = (e: any) => {
      const m = e?.detail
      if (typeof m === 'string' && m) toast(m)
    }
    window.addEventListener('toast:show', onShow as any)
    return () => window.removeEventListener('toast:show', onShow as any)
  }, [toast])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={'toast' + (show ? ' show' : '')}>
        <Icon name="check" cls="ic-s ic" />
        <span className="tmsg">{msg}</span>
      </div>
    </ToastCtx.Provider>
  )
}
