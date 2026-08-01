import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Icon } from './Icon'

/**
 * 统一 UI 弹窗 —— 替换原生 window.confirm / prompt / alert。
 * 通过 useDialog() 拿到命令式 API：
 *   const dialog = useDialog()
 *   if (await dialog.confirm({ title, message, danger })) { ... }
 *   const name = await dialog.prompt({ title, placeholder })   // 取消返回 null
 *   await dialog.alert({ title, message })
 */

interface ConfirmOpts { title: string; message?: string; okText?: string; cancelText?: string; danger?: boolean }
interface PromptOpts { title: string; message?: string; placeholder?: string; defaultValue?: string; okText?: string }
interface AlertOpts { title: string; message?: string; okText?: string }

interface DialogApi {
  confirm: (o: ConfirmOpts) => Promise<boolean>
  prompt: (o: PromptOpts) => Promise<string | null>
  alert: (o: AlertOpts) => Promise<void>
}

const DialogCtx = createContext<DialogApi>({
  confirm: async () => false, prompt: async () => null, alert: async () => {},
})
export const useDialog = () => useContext(DialogCtx)

type State =
  | { kind: 'confirm'; opts: ConfirmOpts }
  | { kind: 'prompt'; opts: PromptOpts }
  | { kind: 'alert'; opts: AlertOpts }
  | null

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(null)
  const [input, setInput] = useState('')
  const resolver = useRef<((v: any) => void) | null>(null)

  const settle = (v: any) => { resolver.current?.(v); resolver.current = null; setState(null) }

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>(res => { resolver.current = res; setState({ kind: 'confirm', opts }) }), [])
  const prompt = useCallback((opts: PromptOpts) => new Promise<string | null>(res => { resolver.current = res; setInput(opts.defaultValue || ''); setState({ kind: 'prompt', opts }) }), [])
  const alert = useCallback((opts: AlertOpts) => new Promise<void>(res => { resolver.current = res; setState({ kind: 'alert', opts }) }), [])

  const api: DialogApi = { confirm, prompt, alert }

  const onCancel = () => settle(state?.kind === 'prompt' ? null : false)
  const onOk = () => settle(state?.kind === 'prompt' ? (input.trim() || null) : state?.kind === 'alert' ? undefined : true)

  return (
    <DialogCtx.Provider value={api}>
      {children}
      {state && (
        <div className="dlg-mask" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
          <div className="dlg" role="dialog" aria-modal="true">
            <div className="dlg-head">
              <span className={'dlg-ic' + ((state.kind === 'confirm' && state.opts.danger) ? ' danger' : '')}>
                <Icon name={state.kind === 'confirm' && state.opts.danger ? 'warning-circle' : state.kind === 'prompt' ? 'folder' : 'check-circle'} />
              </span>
              <h3 className="dlg-title">{state.opts.title}</h3>
            </div>
            {state.opts.message && <p className="dlg-msg">{state.opts.message}</p>}
            {state.kind === 'prompt' && (
              <input
                className="dlg-input" autoFocus
                placeholder={(state.opts as PromptOpts).placeholder || ''}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onOk(); if (e.key === 'Escape') onCancel() }}
              />
            )}
            <div className="dlg-foot">
              {state.kind !== 'alert' && (
                <button className="dlg-btn ghost" onClick={onCancel}>
                  {(state.kind === 'confirm' && state.opts.cancelText) || '取消'}
                </button>
              )}
              <button
                className={'dlg-btn primary' + ((state.kind === 'confirm' && state.opts.danger) ? ' danger' : '')}
                onClick={onOk}
              >
                {state.kind === 'prompt'
                  ? ((state.opts as PromptOpts).okText || '确定')
                  : state.kind === 'alert'
                    ? ((state.opts as AlertOpts).okText || '知道了')
                    : ((state.opts as ConfirmOpts).okText || '确定')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  )
}
