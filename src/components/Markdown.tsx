import React from 'react'

/**
 * 极简 markdown 渲染 —— 支持 **加粗**、有序/无序列表、段落。
 * 用于渲染 Agent 结论（对齐设计稿 .prose 的排版）。
 */
export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="prose">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        // 标题 # / ## / ###（单行）
        const hm = lines[0].match(/^(#{1,3})\s+(.*)$/)
        if (hm && lines.length === 1) {
          const lvl = hm[1].length
          if (lvl === 1) return <h3 key={i} className="md-h1">{inline(hm[2])}</h3>
          if (lvl === 2) return <h4 key={i} className="md-h2">{inline(hm[2])}</h4>
          return <h5 key={i} className="md-h3">{inline(hm[2])}</h5>
        }
        // 引用块 >
        if (lines.every(l => /^\s*>\s?/.test(l)) && lines[0].trim()) {
          return <blockquote key={i} className="md-quote">{lines.map((l, k) => <React.Fragment key={k}>{inline(l.replace(/^\s*>\s?/, ''))}{k < lines.length - 1 && <br />}</React.Fragment>)}</blockquote>
        }
        // 有序列表
        if (lines.every(l => /^\s*\d+\.\s/.test(l)) && lines.length > 0 && lines[0].trim()) {
          return <ol key={i}>{lines.map((l, k) => <li key={k}>{inline(l.replace(/^\s*\d+\.\s/, ''))}</li>)}</ol>
        }
        // 无序列表
        if (lines.every(l => /^\s*[-·]\s/.test(l)) && lines[0].trim()) {
          return <ul key={i}>{lines.map((l, k) => <li key={k}>{inline(l.replace(/^\s*[-·]\s/, ''))}</li>)}</ul>
        }
        return <p key={i}>{lines.map((l, k) => <React.Fragment key={k}>{inline(l)}{k < lines.length - 1 && <br />}</React.Fragment>)}</p>
      })}
    </div>
  )
}

function inline(text: string): React.ReactNode {
  // 先切 [text](url) 与 **bold** 与裸 URL，保持顺序
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\)|\*\*[^*]+\*\*|https?:\/\/[^\s，。、）)]+)/g)
  return parts.map((p, i) => {
    if (!p) return null
    const md = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
    if (md) return <a key={i} href={md[2]} target="_blank" rel="noopener" className="md-link">{md[1]}</a>
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener" className="md-link">{p}</a>
    if (p.startsWith('**') && p.endsWith('**')) return <b key={i}>{p.slice(2, -2)}</b>
    return <React.Fragment key={i}>{p}</React.Fragment>
  })
}
