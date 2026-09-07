import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { Markdown } from './Markdown'

/**
 * 记忆弹窗（demo）—— 从左下角头像菜单的「记忆」入口打开。
 * 记忆本体是一份 markdown 文档：默认渲染成预览，点内容即就地变成纯文本编辑。
 * 编辑态右上角是取消 / 保存；直接点到别处失焦时，弹二次确认问是否保存。
 * 纯前端演示，数据落 localStorage。
 */

const STORE_KEY = 'popagent-memory-doc'
const STORE_ENABLED_KEY = 'popagent-memories-enabled'
const STORE_TIME_KEY = 'popagent-memory-updated'

const SEED_DOC = [
  '## 用户信息',
  '',
  '**用户画像** —— 用户是谁：身份、背景与目标',
  '',
  '- 抖音生态的**作者运营 / 数据分析**方向从业者，日常看作者、作品、大盘数据',
  '- 目标：用更少的步骤拿到能直接下结论的数据，结果可复用到周报和评审材料',
  '- 偏好中文交流、结论优先，术语保留英文原词',
  '',
  '## 聊天话题',
  '',
  '**饮食口味** —— 用户的饮食口味',
  '',
  '- 偏爱川菜、湘菜，能吃辣，但不吃太麻的花椒重口',
  '- 忌口：不吃香菜；乳糖不耐，牛奶换成燕麦奶',
  '- 点外卖通常备注「不要香菜、少油」',
  '',
  '**宠物信息** —— 用户的宠物：相关细节与习惯',
  '',
  '- 一只 3 岁的英短蓝猫，名字叫「团团」，每年 5 月、11 月各做一次体检',
  '- 每天早晚各喂一次主食罐，出差时托付给楼下宠物店寄养',
].join('\n')

const IMPORT_PROMPT = [
  '请把你对我的长期记忆整理成一份 markdown，用于导入到别的 AI 助手里。',
  '只输出我主动分享过的非敏感信息，不输出证件号、联系方式、账号等隐私数据。',
  '',
  '按下面的结构组织，每条一行、以「- 」开头：',
  '',
  '## 用户信息',
  '身份与背景：我是谁、在做什么、长期目标。',
  '职业：当前和过往的职位、公司以及主要技能领域。',
  '',
  '## 项目',
  '我实际参与构建或投入精力的项目。每个项目一条，包含项目功能、当前状态以及关键决策，以项目名称或简短描述作为条目开头。',
  '',
  '## 偏好',
  '沟通方式、工作习惯、明确表达过的喜好与忌讳。',
  '',
  '直接输出 markdown 本身，不要额外解释。',
].join('\n')

const MIN = 60 * 1000
const HOUR = 60 * MIN

const relativeTime = (ts: number) => {
  const diff = Math.max(0, Date.now() - ts)
  if (diff < MIN) return '刚刚更新'
  if (diff < HOUR) return `${Math.floor(diff / MIN)} 分钟前更新`
  if (diff < 24 * HOUR) return `${Math.floor(diff / HOUR)} 小时前更新`
  return `${Math.floor(diff / (24 * HOUR))} 天前更新`
}

export function MemoryDialog({ open, onClose, toast }: { open: boolean; onClose: () => void; toast?: (m: string) => void }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORE_ENABLED_KEY) !== 'off')
  const [doc, setDoc] = useState(() => localStorage.getItem(STORE_KEY) ?? SEED_DOC)
  const [updatedAt, setUpdatedAt] = useState(() => Number(localStorage.getItem(STORE_TIME_KEY)) || Date.now() - 21 * MIN)
  const [saved, setSaved] = useState(doc)
  const [editing, setEditing] = useState(false)
  // 失焦时的二次确认：closeAfter 表示确认完还要顺手把整个记忆弹窗关掉
  const [askSave, setAskSave] = useState<{ closeAfter: boolean } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importText, setImportText] = useState('')
  const [copied, setCopied] = useState(false)
  const [importPending, setImportPending] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { localStorage.setItem(STORE_ENABLED_KEY, enabled ? 'on' : 'off') }, [enabled])

  const dirty = doc.trim() !== saved.trim()

  const commit = () => {
    setEditing(false)
    setAskSave(null)
    const next = doc.trim()
    if (next === saved.trim()) return
    const now = Date.now()
    setSaved(next)
    setUpdatedAt(now)
    localStorage.setItem(STORE_KEY, next)
    localStorage.setItem(STORE_TIME_KEY, String(now))
    toast?.('记忆已更新')
  }

  const cancelEdit = () => { setDoc(saved); setEditing(false); setAskSave(null) }

  const startEdit = () => { setEditing(true); requestAnimationFrame(() => editorRef.current?.focus()) }

  // 编辑态下失焦：点到取消/保存按钮上不打扰，其它情况有改动就问一句
  const onEditorBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (askSave) return
    const next = event.relatedTarget as HTMLElement | null
    if (next?.closest('[data-mem-editop]')) return
    if (!dirty) { setEditing(false); return }
    setAskSave({ closeAfter: false })
  }

  // 关闭弹窗（右上 X / 点遮罩）：编辑态有未保存改动时先问
  const requestClose = () => {
    if (editing && dirty) { setAskSave({ closeAfter: true }); return }
    setEditing(false)
    onClose()
  }

  const openImport = () => { setImportText(''); setCopied(false); setImporting(true) }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast?.('复制失败，请手动选中提示词复制')
    }
  }

  // demo：导入放到「后台」跑，用户可以直接关窗，跑完再把内容并进记忆
  const confirmImport = () => {
    const pasted = importText.trim()
    if (!pasted || importPending) return
    setImportPending(true)
    window.setTimeout(() => {
      setSaved(current => {
        const next = [current.trim(), pasted].filter(Boolean).join('\n\n')
        const now = Date.now()
        setDoc(next)
        setUpdatedAt(now)
        localStorage.setItem(STORE_KEY, next)
        localStorage.setItem(STORE_TIME_KEY, String(now))
        return next
      })
      setImportPending(false)
      setImporting(false)
      setImportText('')
      toast?.('记忆导入完成')
    }, 2600)
  }

  // 打开时回到预览态
  useEffect(() => {
    if (!open) return
    setEditing(false)
    setAskSave(null)
    setImporting(false)
  }, [open])

  // Esc 关闭弹窗（编辑态的 Esc 由 textarea 自己吞掉，走取消）
  const closeRef = useRef(requestClose)
  closeRef.current = requestClose
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="mem-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) requestClose() }}>
      <section className="mem-dialog" role="dialog" aria-modal="true" aria-labelledby="mem-title">
        <header className="mem-head">
          <h2 id="mem-title">记忆</h2>
          <button type="button" className="mem-close" aria-label="关闭记忆" onMouseDown={e => { e.preventDefault(); requestClose() }}><Icon name="x" cls="ic" /></button>
        </header>

        <div className="mem-body">
          <p className="mem-sub">记忆让 Xagent 记住你的偏好和习惯，对话越多，它就越懂你。记忆仅你本人可见。</p>

          <div className="mem-switch-card">
            <span className="mem-switch-label">生成对话记忆</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="生成对话记忆"
              className={'mem-switch' + (enabled ? ' on' : '')}
              onClick={() => setEnabled(v => !v)}
            />
          </div>

          {enabled ? (
            <div className="mem-manage">
              <div className="mem-manage-head">
                <div>
                  <div className="mem-manage-title">编辑记忆</div>
                  <div className="mem-manage-sub">每晚自动整理更新 · {relativeTime(updatedAt)}</div>
                </div>
                <div className="mem-manage-ops" data-mem-editop>
                  {editing ? (
                    <>
                      <button type="button" className="mem-btn" onClick={cancelEdit}>取消</button>
                      <button type="button" className="mem-btn primary" onClick={commit}>保存</button>
                    </>
                  ) : (
                    <button type="button" className="mem-btn" onClick={openImport}>导入</button>
                  )}
                </div>
              </div>

              {editing ? (
                <textarea
                  ref={editorRef}
                  className="mem-editor"
                  value={doc}
                  spellCheck={false}
                  placeholder={'用 markdown 写下你想让 Xagent 记住的事，例如：\n\n## 用户信息\n\n- 不吃香菜'}
                  onChange={e => setDoc(e.target.value)}
                  onBlur={onEditorBlur}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { e.stopPropagation(); cancelEdit() }
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
                  }}
                  aria-label="记忆内容（markdown）"
                />
              ) : (
                <div
                  className="mem-doc"
                  role="button"
                  tabIndex={0}
                  title="点击编辑"
                  onClick={startEdit}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); startEdit() } }}
                >
                  {doc.trim()
                    ? <Markdown text={doc} />
                    : <div className="mem-doc-empty">还没有记忆，点这里用 markdown 写下你想让 Xagent 记住的事。</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="mem-empty">
              <span className="mem-empty-ic"><Icon name="brain" cls="ic" /></span>
              <div className="mem-empty-title">记忆已关闭</div>
              <p className="mem-empty-tx">
                打开上方「生成对话记忆」后，Xagent 会从对话中提取记忆并展示在这里。<br />
                已有的记忆不会被删除。
              </p>
            </div>
          )}
        </div>
      </section>

      {askSave && (
        <div className="mem-ask" role="alertdialog" aria-modal="true" aria-labelledby="mem-ask-title">
          <div className="mem-ask-card">
            <h3 id="mem-ask-title">是否保存修改？</h3>
            <p>你对记忆做了修改还没有保存，离开后修改会丢失。</p>
            <div className="mem-ask-foot">
              <button type="button" className="mem-btn" onClick={() => { const after = askSave.closeAfter; cancelEdit(); if (after) onClose() }}>不保存</button>
              <button type="button" className="mem-btn primary" onClick={() => { const after = askSave.closeAfter; commit(); if (after) onClose() }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {importing && (
        <div className="mem-ask" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setImporting(false) }}>
          <div className="mem-import" role="dialog" aria-modal="true" aria-labelledby="mem-import-title">
            <header className="mem-import-head">
              <h3 id="mem-import-title">导入其他记忆</h3>
              <button type="button" className="mem-close" aria-label="关闭导入" onClick={() => setImporting(false)}><Icon name="x" cls="ic" /></button>
            </header>

            <div className="mem-import-body">
              <section className="mem-step">
                <div className="mem-step-head">
                  <span className="mem-step-no">1</span>
                  <span className="mem-step-title">复制以下提示词到其他 AI 对话中</span>
                  <button type="button" className="mem-btn" onClick={copyPrompt}>{copied ? '已复制' : '复制'}</button>
                </div>
                <pre className="mem-step-prompt">{IMPORT_PROMPT}</pre>
              </section>

              <section className="mem-step">
                <div className="mem-step-head">
                  <span className="mem-step-no">2</span>
                  <span className="mem-step-title">将结果粘贴到下方，添加到 Xagent 记忆</span>
                </div>
                <textarea
                  className="mem-step-input"
                  value={importText}
                  disabled={importPending}
                  spellCheck={false}
                  placeholder="在此粘贴你的记忆"
                  onChange={e => setImportText(e.target.value)}
                  aria-label="粘贴要导入的记忆"
                />
              </section>
              {importPending && (
                <div className="mem-import-note" role="status">
                  <span className="mem-import-spin" aria-hidden="true" />
                  <span>后台正在导入中，你可以关闭此窗口</span>
                </div>
              )}
            </div>

            <div className="mem-import-foot">
              <button type="button" className="mem-btn" onClick={() => setImporting(false)}>{importPending ? '关闭' : '取消'}</button>
              <button type="button" className="mem-btn primary" disabled={!importText.trim() || importPending} onClick={confirmImport}>
                {importPending ? '导入中…' : '导入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
