import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Composer } from '../components/Composer'
import { api } from '../api'
import type { AppState } from '../App'

export function HomeView({ state }: { state: AppState }) {
  const [draft, setDraft] = useState(state.composerDraft || '做一个webapp')

  const send = async (text: string, mode?: 'fast' | 'deep') => {
    setDraft('')
    const matched = state.skills.find(s => text.includes(s.name))
    const title = text.slice(0, 24) || '新对话'
    const { id } = await api.createTask(title, matched?.id)
    state.setComposerDraft('')
    state.refreshSidebar()
    sessionStorage.setItem('pendingMessage:' + id, JSON.stringify({ text, skillId: matched?.id, mode }))
    state.openTask(id)
  }

  const bento = [
    { id: 'tijian', w2: true, icon: 'shield-check', bi: 'grn', name: '作品体检', desc: '一条作品能不能推、问题出在哪', prompt: '帮我体检这条作品，能不能推、问题在哪' },
    { id: 'fupan', icon: 'chart-line-up', bi: 'blu', name: '掉量复盘', desc: '排除处罚，给掉量归因', prompt: '@某作者 最近两周为什么掉量，帮我复盘' },
    { id: 'zhenduan', icon: 'flask', bi: 'yel', name: '账号诊断', desc: '值不值得培、卡在哪', prompt: '这个作者值不值得进培优、卡在哪' },
    { id: 'xuanti', w2: true, icon: 'bell', bi: 'gry', name: '选题热点', desc: '这周这个垂类拍什么', prompt: '这周美食垂类拍什么，给我几个选题' },
  ]

  const fillFromSkill = (prompt: string) => {
    setDraft(prompt)
  }

  return (
    <section className="view on">
      <header className="chat-top">
        <div className="chat-top-left">
          <div className="chat-title">新建任务</div>
        </div>
      </header>
      <div className="homewrap">
        <div className="homebody"><div className="home">
          <h1 className="hello st" style={{ ['--i' as any]: 0 }}>你好，<span className="dim">今天帮你干什么？</span></h1>

          <div className="h-sec st" style={{ ['--i' as any]: 1 }}><b>快速开始</b><span>点一个，把它填进下面的输入框</span></div>
          <div className="bento">
            {bento.map((b, i) => (
              <button key={b.id} className={'bcard st' + (b.w2 ? ' w2' : '')} style={{ ['--i' as any]: 2 + i }} onClick={() => fillFromSkill(b.prompt)}>
                <span className={'bi ' + b.bi}><Icon name={b.icon} /></span>
                <span className="bn">{b.name}</span>
                <span className="bd">{b.desc}</span>
              </button>
            ))}
          </div>
        </div></div>

        <div className="homedock"><div className="inner">
          <Composer
            variant="home"
            placeholder="描述你要做的事，或 @ 一个作者，/ 唤起技能"
            value={draft} onChange={setDraft} onSend={send}
            skills={state.skills} connectors={state.connectors}
          />
        </div></div>
      </div>
    </section>
  )
}
