import { useEffect } from 'react'

/**
 * 拖拽调整侧栏 / 画布宽度 —— 对齐高保真设计稿的 .vresize 交互。
 * 通过修改 .app 上的 --railw / --artw CSS 变量实现（布局本身已用 var 引用）。
 * 用事件委托绑定在 document 上，这样后挂载的画布句柄（artifact-panel 条件渲染）也生效。
 */
export function useColResize() {
  useEffect(() => {
    const app = document.querySelector('.app') as HTMLElement | null
    if (!app) return
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      const h = target?.closest?.('.vresize') as HTMLElement | null
      if (!h) return
      e.preventDefault()
      const kind = h.dataset.rs
      const prop = kind === 'rail' ? '--railw' : '--artw'
      const startX = e.clientX
      const start = parseFloat(getComputedStyle(app).getPropertyValue(prop)) || (kind === 'rail' ? 252 : 432)
      h.classList.add('dragging')
      document.body.classList.add('col-resizing')
      try { h.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        if (kind === 'rail') app.style.setProperty(prop, clamp(start + dx, 208, 360) + 'px')
        else app.style.setProperty(prop, clamp(start - dx, 320, 640) + 'px')
      }
      const up = () => {
        h.classList.remove('dragging')
        document.body.classList.remove('col-resizing')
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }

    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])
}
