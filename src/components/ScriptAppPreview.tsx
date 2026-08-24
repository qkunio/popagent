import { useState } from 'react'
import { Icon } from './Icon'
import type { ScriptAppPreview as ScriptAppPreviewData } from '../types'

export function ScriptAppPreview({ data }: { data: ScriptAppPreviewData }) {
  const [values, setValues] = useState<Record<string, string>>({ max_keywords: '5' })
  const [result, setResult] = useState<Record<string, string> | null>(null)

  const run = () => {
    const text = values.text?.trim()
    if (!text) return
    const keywords = text.replace(/[，。！？、\s]+/g, ' ').trim().split(' ').filter(Boolean).slice(0, Number(values.max_keywords || 5))
    setResult({
      summary: text.length > 54 ? text.slice(0, 54) + '…' : text,
      keywords: keywords.join('、'),
      sentiment: 'neutral',
      sentiment_reason: '文本中性，未检测到明显的情绪倾向',
    })
  }

  return (
    <div className="script-preview">
      <div className="script-tabs"><button className="on">运行</button><button>历史</button><button>批量</button></div>
      <div className="script-panel-scroll">
        <div className="script-card script-input-card">
        <div className="script-section-head"><div><strong>输入参数</strong><small>配置本次运行所需的数据</small></div><button type="button" onClick={() => setValues({ max_keywords: '5' })}><Icon name="arrow-clockwise" cls="ic" />重置</button></div>
        <div className="script-fields">
          {data.inputs.map(input => (
            <label className={'script-field ' + (input.name === 'text' ? 'script-field-text' : 'script-field-option')} key={input.name}>
              <span className="script-field-title"><strong>{input.name}</strong><em>{input.type}</em>{input.required && <b>必填</b>}</span>
              <small>{input.description}</small>
              {input.name === 'text' ? <textarea value={values[input.name] || ''} placeholder={input.placeholder} onChange={event => setValues(current => ({ ...current, [input.name]: event.target.value }))} /> : <input value={values[input.name] || ''} placeholder={input.placeholder} onChange={event => setValues(current => ({ ...current, [input.name]: event.target.value }))} />}
            </label>
          ))}
        </div>
        <div className="script-run-row"><span>{values.text?.trim() ? '参数已就绪' : '填写必填参数后运行'}</span><button type="button" className="script-run" disabled={!values.text?.trim()} onClick={run}><Icon name="play" cls="ic" />运行</button></div>
        </div>
        <div className="script-flow-strip"><span>输入</span><i>→</i><strong>文本分析</strong><i>→</i><span>结构化输出</span></div>
        <div className="script-result">
          <div className="script-result-head"><div><h3>运行结果</h3><small>{result ? '本次运行已完成' : '运行后将在这里展示结果'}</small></div>{result && <span className="script-status"><i />已完成</span>}</div>
          {result ? <div className="script-result-grid">{data.outputs.map(output => <div className="script-output" key={output.name}><span>{output.name}</span><code>{result[output.name] || '-'}</code><small>{output.description}</small></div>)}</div> : <div className="script-empty"><Icon name="play" cls="ic" /><strong>点击运行查看结果</strong><span>摘要、关键词和情感判断会分别展示在这里</span></div>}
        </div>
      </div>
    </div>
  )
}
