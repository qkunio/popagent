import { useEffect, useState } from 'react'

export interface LibrarySkill {
  id: string
  name: string
  description: string
  owner: 'official' | 'mine'
  installed?: boolean
}

const STORAGE_KEY = 'popagent:skill-library'
const COUNTER_KEY = 'popagent:skill-library-counter'
const CHANGE_EVENT = 'popagent:skill-library-changed'

const DEFAULT_SKILLS: LibrarySkill[] = [
  { id: 'gaiacli', name: 'gaiacli', description: '抖音 gaia 域 CLI（gaiacli），按审批单 ApplyID 查询审批快照。', owner: 'official' },
  { id: 'lark-base', name: 'lark-base', description: '使用 lark-cli 操作飞书多维表格，支持建表、字段管理和记录读写。', owner: 'official' },
  { id: 'lark-doc', name: 'lark-doc', description: '创建、读取和编辑飞书云文档。', owner: 'official' },
  { id: 'lark-drive', name: 'lark-drive', description: '管理飞书云空间中的文件和文件夹。', owner: 'official' },
  { id: 'lark-shared', name: 'lark-shared', description: '飞书 CLI 的身份、权限与共享基础能力。', owner: 'official' },
  { id: 'lark-sheets', name: 'lark-sheets', description: '创建和操作飞书电子表格。', owner: 'official' },
  { id: 'lark-wiki', name: 'lark-wiki', description: '管理飞书知识空间、成员与文档节点。', owner: 'official' },
  { id: 'promptbook', name: 'PromptBook读取解析及提示词提取', description: '读取并解析 PromptBook 的完整内容。', owner: 'official' },
  { id: 'author-diagnosis', name: '作者作品诊断', description: '作者与作品诊断的统一入口。', owner: 'official' },
  { id: 'strategy', name: '作者策划案生成', description: '根据作者沟通内容生成可执行的策划选题和脚本。', owner: 'official' },
  { id: 'creator-info', name: '创作者信息查询', description: '查询作者、账号和作品相关数据。', owner: 'official' },
  { id: 'vertical', name: '垂类作者摸底', description: '按赛道和运营分层分析作者。', owner: 'official' },
  { id: 'hotspot', name: '多平台热榜及社媒资讯洞察', description: '查询多平台热榜并进行社交媒体语义搜索。', owner: 'official' },
  { id: 'pet-monitor', name: '宠物计划视频监控回写', description: '监控宠物计划视频并回写相关数据。', owner: 'official', installed: true },
  { id: 'potential', name: '潜力作者挖掘', description: '筛选具有成长潜力的作者。', owner: 'official' },
  { id: 'rules', name: '平台规则答疑', description: '查询平台规则、内容标准与运营门槛。', owner: 'official' },
  { id: 'trend', name: '赛道趋势分析', description: '分析赛道趋势、增长机会与供给缺口。', owner: 'official' },
  { id: 'my-skill', name: '我的作者跟进助手', description: '生成重点作者的每日运营行动清单。', owner: 'mine', installed: true },
]

export function readSkillLibrary(): LibrarySkill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as LibrarySkill[]
  } catch {}
  return DEFAULT_SKILLS.map(skill => ({ ...skill }))
}

function writeSkillLibrary(skills: LibrarySkill[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function addSkillToLibrary(): LibrarySkill {
  const skills = readSkillLibrary()
  const largestIndex = skills.reduce((max, skill) => {
    const match = /^新增技能(\d+)$/.exec(skill.name)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  const storedIndex = Number(localStorage.getItem(COUNTER_KEY) || 0)
  const index = Math.max(largestIndex, storedIndex) + 1
  localStorage.setItem(COUNTER_KEY, String(index))
  const skill: LibrarySkill = {
    id: `custom-skill-${Date.now()}-${index}`,
    name: `新增技能${index}`,
    description: '用户新增的自定义技能。',
    owner: 'mine',
    installed: true,
  }
  writeSkillLibrary([skill, ...skills])
  return skill
}

export function deleteSkillFromLibrary(skillId: string) {
  writeSkillLibrary(readSkillLibrary().filter(skill => skill.id !== skillId))
}

export function toggleLibrarySkillInstalled(skillId: string) {
  writeSkillLibrary(readSkillLibrary().map(skill => skill.id === skillId ? { ...skill, installed: !skill.installed } : skill))
}

export function ensureAgentDefaultSkills(agentKey: string, skillIds: string[]) {
  const markerKey = `popagent:agent-default-skills:${agentKey}`
  if (localStorage.getItem(markerKey)) return
  const skillIdSet = new Set(skillIds)
  const skills = readSkillLibrary()
  writeSkillLibrary(skills.map(skill => skillIdSet.has(skill.id) ? { ...skill, installed: true } : skill))
  localStorage.setItem(markerKey, '1')
}

export function useSkillLibrary(): LibrarySkill[] {
  const [skills, setSkills] = useState(readSkillLibrary)
  useEffect(() => {
    const sync = () => setSkills(readSkillLibrary())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return skills
}
