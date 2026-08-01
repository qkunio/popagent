import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export function Icon({ name, cls = 'ic' }: { name: string; cls?: string }) {
  // name 可传 'i-xxx' 或 'xxx'
  const id = name.startsWith('i-') ? name : `i-${name}`
  return (
    <svg className={cls} aria-hidden="true"><use href={`#${id}`} /></svg>
  )
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
