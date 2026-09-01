import type { Skill, Connector, AppItem, Schedule, Folder, SidebarTask, TaskDetail, Message, TraceStep, KanbanPreview, WebpagePreview, AppPreview, KPIData, Insight, WebpageSection, GeneratedApp } from './types'

const LS_KEY = 'popagent:data'

interface Store {
  tasks: { id: string; title: string; folder_id: string; skill_id: string | null; status: string; dot: string; pinned?: boolean; created_at: number; updated_at: number }[]
  messages: { id: string; task_id: string; role: 'user' | 'assistant'; content: string; trace: TraceStep[]; sources: string[]; feedback: string | null; created_at: number; app_preview?: AppPreview | null }[]
  folders: Folder[]
  skills: Skill[]
  connectors: Connector[]
  apps: AppItem[]
  schedules: Schedule[]
  prefs: { model: string; defaultMode: 'fast' | 'deep'; notifyEnabled: boolean; mutedScheduleIds: string[]; memoryEnabled: boolean }
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const store = JSON.parse(raw) as Store
      // 按内容结构迁移历史数据：看板归为 WebApp；外链网页归为分享页面。
      store.messages = store.messages.map(message => {
        const preview = message.app_preview as any
        if (!preview) return message
        if (preview.cover && preview.footer && preview.sections) {
          return { ...message, app_preview: { ...preview, type: 'sharepage' } as AppPreview }
        }
        if (preview.kpis && preview.insights && preview.status_tag) {
          return { ...message, app_preview: { ...preview, type: 'webapp' } as AppPreview }
        }
        if (preview.type === 'agent' && preview.name === 'Agent 测试') {
          return { ...message, app_preview: { ...preview, name: '热点探查Agent' } as AppPreview }
        }
        return message
      })
      return store
    }
  } catch {}
  return seedStore()
}

function saveStore(s: Store) {
  localStorage.setItem(LS_KEY, JSON.stringify(s))
}

function seedStore(): Store {
  const now = Date.now()
  const store: Store = {
    tasks: [
      { id: 't_1', title: '作品体检：灶台边的老周', folder_id: 'f_default', skill_id: 'tijian', status: 'active', dot: '', created_at: now - 3600000, updated_at: now - 1800000 },
      { id: 't_2', title: '掉量复盘：家常菜日记', folder_id: 'f_default', skill_id: 'fupan', status: 'active', dot: '', created_at: now - 7200000, updated_at: now - 3600000 },
    ],
    messages: [
      { id: 'm_1', task_id: 't_1', role: 'user', content: '帮我体检这条作品，能不能推、问题在哪', trace: [], sources: [], feedback: null, created_at: now - 3600000 },
      { id: 'm_2', task_id: 't_1', role: 'assistant', content: '## 体检结论\n\n这条作品**推荐推送**，综合评分 78 分。\n\n### 优点\n- 开头 3 秒 hook 到位，完播率 45%\n- 封面点击率 8.2%，高于赛道均值\n- 互动率 3.1%，表现良好\n\n### 可优化\n- 中段节奏略慢，建议 15s 处增加信息点\n- 结尾 CTA 不够明确\n\n### 建议\n保持当前风格，下次拍摄可尝试加入对比手法。', trace: [{ tool: 'check_item', connector: '创作者数据', label: '创作者数据 · check_item()', status: 'ok', ms: 120 }], sources: ['创作者数据'], feedback: null, created_at: now - 3500000 },
      { id: 'm_3', task_id: 't_2', role: 'user', content: '@家常菜日记 最近两周为什么掉量，帮我复盘', trace: [], sources: [], feedback: null, created_at: now - 7200000 },
      { id: 'm_4', task_id: 't_2', role: 'assistant', content: '## 掉量归因\n\n**核心原因：发布时间窗口选择不当**\n\n### 数据对比\n- 上周同期平均播放：12.3 万 → 本周：4.7 万（-62%）\n- 发布时间从周六 18:00 改为周三 12:00\n- 周三午间时段该赛道流量仅为周六晚间的 35%\n\n### 排除因素\n- 无处罚记录\n- 内容质量分稳定（4.2/5）\n- 粉丝活跃度无异常\n\n### 建议\n1. 恢复周六 18:00 发布\n2. 或选择周五 20:00 作为备选窗口', trace: [{ tool: 'analyze_trend', connector: '创作者数据', label: '创作者数据 · analyze_trend()', status: 'ok', ms: 230 }], sources: ['创作者数据'], feedback: null, created_at: now - 7100000 },
    ],
    folders: [
      { id: 'f_default', name: '默认', is_default: 1, kind: 'local', members: [{ name: '我', color: '#D9DBE1' }], created_at: now, updated_at: now },
      { id: 'f_peiyang', name: '培优专项', is_default: 0, kind: 'local', members: [{ name: '我', color: '#D9DBE1' }], created_at: now, updated_at: now },
      { id: 'f_dingpan', name: '本周盯盘', is_default: 0, kind: 'local', members: [{ name: '我', color: '#D9DBE1' }], created_at: now, updated_at: now },
    ],
    skills: [
      { id: 'tijian', name: '作品体检', icon: 'shield-check', color: 'grn', category: '诊断', gate: 'pass', gate_label: '已通过', description: '一条作品能不能推、问题出在哪、怎么改。数字全部可溯源。', prompt: '帮我体检这条作品', connector_id: 'authorcli', connector_ok: 1, system_prompt: '你是专业的内容运营助手', tools: ['check_item', 'search_rules'], pass_line: '', cur_score: '78', cur_label: '良好', eval_meta: '', pipe_step: 3, samples: [], versions: [['v1','v2','v3']], sort: 1, installed: 1, featured: 1 },
      { id: 'fupan', name: '掉量复盘', icon: 'chart-line-up', color: 'blu', category: '诊断', gate: 'pass', gate_label: '已通过', description: '排除处罚，给掉量归因与话术。', prompt: '帮我复盘掉量原因', connector_id: 'authorcli', connector_ok: 1, system_prompt: '你是专业的掉量分析助手', tools: ['analyze_trend', 'check_penalty'], pass_line: '', cur_score: '82', cur_label: '优秀', eval_meta: '', pipe_step: 3, samples: [], versions: [['v1','v2','v3']], sort: 2, installed: 1, featured: 1 },
      { id: 'zhenduan', name: '账号诊断', icon: 'flask', color: 'yel', category: '诊断', gate: 'pass', gate_label: '已通过', description: '值不值得培、卡在哪、怎么培。', prompt: '帮我诊断这个账号', connector_id: 'authorcli', connector_ok: 1, system_prompt: '你是专业的账号诊断助手', tools: ['check_author', 'compare_benchmark'], pass_line: '', cur_score: '75', cur_label: '良好', eval_meta: '', pipe_step: 3, samples: [], versions: [['v1','v2','v3']], sort: 3, installed: 1 },
      { id: 'quanxuan', name: '圈选找人', icon: 'magnifying-glass', color: 'blu', category: '工具', gate: 'pass', gate_label: '已通过', description: '按条件从作者库拉一批名单。', prompt: '帮我圈一批作者', connector_id: 'authorcli', connector_ok: 1, system_prompt: '你是专业的作者筛选助手', tools: ['search_authors'], pass_line: '', cur_score: '', cur_label: '', eval_meta: '', pipe_step: 0, samples: [], versions: [['v1','v2','v3']], sort: 4, installed: 1 },
      { id: 'dayi', name: '规则答疑', icon: 'check-circle', color: 'grn', category: '查询', gate: 'pass', gate_label: '已通过', description: '算不算违规、优质标准，带出处。', prompt: '这条内容算不算违规', connector_id: 'rulecli', connector_ok: 1, system_prompt: '你是专业的规则咨询助手', tools: ['search_rules'], pass_line: '', cur_score: '', cur_label: '', eval_meta: '', pipe_step: 0, samples: [], versions: [['v1','v2','v3']], sort: 5, installed: 1 },
      { id: 'xuanti', name: '选题热点', icon: 'bell', color: 'gry', category: '热点', gate: 'pass', gate_label: '已通过', description: '这周这个垂类拍什么，给依据。', prompt: '这周有什么热点选题', connector_id: 'hotcli', connector_ok: 1, system_prompt: '你是专业的热点分析助手', tools: ['get_hot_topics'], pass_line: '', cur_score: '', cur_label: '', eval_meta: '', pipe_step: 0, samples: [], versions: [['v1','v2','v3']], sort: 6, installed: 1 },
    ],
    connectors: [
      { id: 'authorcli', name: '创作者数据', icon: 'user', color: 'blu', description: '作者/作品/粉丝数据', scope: '作者、作品', status: 'connected', sort: 1 },
      { id: 'rulecli', name: '规则库', icon: 'book', color: 'grn', description: '平台规则与标准', scope: '规则查询', status: 'connected', sort: 2 },
      { id: 'hotcli', name: '热点数据', icon: 'fire', color: 'red', description: '赛道热点与趋势', scope: '热点', status: 'pending', sort: 3 },
    ],
    apps: [],
    schedules: [
      { id: 's_1', name: '垂类早报', icon: 'bell', color: 'gry', description: '每天扫一眼美食赛道热点', cron_desc: '每天 09:30', channel: '飞书', subscribed: 1, runs: [], last_error: null, sort: 1 },
      { id: 's_2', name: '培优周战报', icon: 'chart-line-up', color: 'blu', description: '每周复盘一位重点作者', cron_desc: '每周五 18:00', channel: '飞书', subscribed: 1, runs: [], last_error: null, sort: 2 },
    ],
    prefs: { model: 'GPT5.5', defaultMode: 'fast', notifyEnabled: true, mutedScheduleIds: [], memoryEnabled: true },
  }
  saveStore(store)
  return store
}

// 触发建应用类特殊 prompt 时，Agent 模拟输出的正文字数限制（按非空白字符统计）。
const SPECIAL_REPLY_MIN_CHARS = 400
const SPECIAL_REPLY_MAX_CHARS = 500
const SPECIAL_REPLY_FILLERS = [
  '右侧预览区会实时展示最新效果，改动之后不需要重新生成，刷新一下就能看到当前版本。',
  '你可以继续告诉我需要调整的部分，无论是内容、结构还是展示样式，都可以在这一版上直接改。',
  '后续的修改我都会同步到预览里，确认无误之后再决定要不要发布或者对外分享。',
]

function countReplyChars(text: string): number {
  return Array.from(text.replace(/\s+/g, '')).length
}

// 不足下限时补充收尾话术，超过上限时按可见字数截断，保证正文落在 125~150 字。
function clampSpecialReply(text: string): string {
  let result = text.trim()
  for (const filler of SPECIAL_REPLY_FILLERS) {
    if (countReplyChars(result) >= SPECIAL_REPLY_MIN_CHARS) break
    result += `\n\n${filler}`
  }
  if (countReplyChars(result) <= SPECIAL_REPLY_MAX_CHARS) return result
  let kept = ''
  let count = 0
  for (const char of Array.from(result)) {
    if (/\s/.test(char)) { kept += char; continue }
    if (count >= SPECIAL_REPLY_MAX_CHARS - 1) break
    kept += char
    count++
  }
  return `${kept.replace(/[\s，,、。；;：:！!？?]+$/, '')}。`
}

function mockAIResponse(message: string, skillId?: string): { content: string; trace: TraceStep[]; sources: string[]; app_preview?: AppPreview | null } {
  let appIdx = 0
  let webpageIdx = 0
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const s = JSON.parse(raw) as Store
      for (const m of s.messages) {
        if (!m?.app_preview) continue
        const previewType = (m.app_preview as any).type
        const preview = m.app_preview as any
        if (previewType === 'webpage' || previewType === 'sharepage' || preview.cover) webpageIdx++
        else appIdx++
      }
    }
  } catch {}

  const TEMPLATES: Array<Omit<KanbanPreview, 'type'> & {
    appName: string
    conclusion: { label: string; summary: string }
    markdownTop: string
    markdownKpis: string[]
    markdownInsights: string[]
    markdownImprove: string[]
  }> = [
    {
      subtitle: 'MEDICAL HEALTH AUTHOR REPORT',
      title: '医疗健康垂类 · 签约 / 优质 / 高潜作者近 7 天分析',
      description: '围绕作者分层、内容供给、播放流量、互动质量和可执行运营动作，基于最新可用离线分区与实体点查生成。',
      meta: [
        { label: '正式垂类', value: '医疗健康 / tag 621' },
        { label: '统计周期', value: '__RANGE__' },
        { label: '覆盖规模', value: '5,983 作者' },
        { label: '口径状态', value: '非完整口径' },
      ],
      status_tag: { label: '非完整口径', color: 'warn' },
      conclusion: {
        label: '分析结论  流量集中在高潜与少数头部作者',
        summary: '医疗健康三组作者近 7 天合计贡献 34.7 亿播放，高潜作者承担最大流量盘，但优质作者在互动效率上更稳，签约层需要重点提升单条效率和稳定供给。',
      },
      kpis: [
        { label: '覆盖规模', value: '5,983 作者', delta: '+2.1%', status: 'good' },
        { label: '7 日总播放', value: '34.7 亿', delta: '+8.4%', status: 'good' },
        { label: '平均互动率', value: '3.1%', delta: '−0.2%', status: 'bad' },
        { label: '粉丝增量', value: '214 万', delta: '+11.6%', status: 'good' },
        { label: '作者中位 CPM', value: '¥ 38.2', delta: '+5.0%', status: 'good' },
        { label: '稳定供给率', value: '46%', delta: '−1.3%', status: 'bad' },
      ],
      insights: [
        { idx: 1, title: '高潜层是最大流量池，但长尾更明显', summary: '高潜贡献 42.5% 播放量，签约层单条 CPM 更稳，适合分层运营。', bullets: ['7 日播放 14.7 亿 · 占三组播放 42.5% · 1 日中位播放 7,174', '规模优势拉高总流量，但单作者中位效率低于签约和优质', '适合用分层运营：高潜做规模，签约做标杆，优质做留存'] },
        { idx: 2, title: '互动率下滑源于前 3 秒 hook 变弱', summary: '赛道竞争加剧，头部作者开始在首 2 秒直接抛出冲突信息，中位完播率掉 1.2pct。', bullets: ['中位 3 秒跳出率 41%（上周 37%）', '开头无冲突/无悬念的内容 2 秒跳出率高 2.3×', '建议：高潜作者统一使用"结论前置"脚本模板'] },
        { idx: 3, title: '供给节奏不均衡，周末空档明显', summary: '本周六周日日均发布量比工作日低 38%，导致周末高峰时段供给缺口 15%。', bullets: ['工作日日均 3,200 条 · 周末 1,980 条', '20:00 黄金档 30 分钟缺口率 22%', '建议：周末发布激励计划 + 脚本预排机制'] },
      ],
      appName: '医疗健康作者看板',
      markdownTop: '**【应用：医疗健康作者看板】**\n\n**名称：** 医疗健康作者看板\n**类型：** 数据诊断看板\n**说明：** 基于「作者分层 / 流量 / 供给」对话沉淀的可复用诊断看板，用于快速判断垂类健康度、问题在哪、下一步如何优化。\n\n**核心指标：**',
      markdownKpis: ['- 覆盖规模：5,983 作者（+2.1%）', '- 7 日总播放：34.7 亿（+8.4%）', '- 平均互动率：3.1%（−0.2%）', '- 作者中位 CPM：¥ 38.2（+5.0%）'],
      markdownInsights: ['1. 高潜层是最大流量池，但长尾更明显 → 建议用分层策略：高潜做规模，签约做标杆，优质做留存。', '2. 互动率下滑源于前 3 秒 hook 变弱 → 推"结论前置"脚本模板。', '3. 周末供给空档明显 → 加周末发布激励 + 脚本预排机制。'],
      markdownImprove: ['- 结论前置 → 冲突信息前置到 0~2 秒，预估 3 秒跳出率下降 6pct', '- 分层运营脚本 → 按高潜 / 优质 / 签约分模板，中位完播率提升 12%', '- 周末激励 → 周末日均发布量 +25%，黄金档供给缺口收窄'],
    },
    {
      subtitle: 'FOOD / HOMECOOKED CONTENT INSIGHT',
      title: '家常菜作者掉量复盘 · 近 14 天对比分析',
      description: '对比近 14 天与上一周期的流量、留存、供给与互动，定位掉量主因和可落地的恢复抓手。',
      meta: [
        { label: '正式垂类', value: '美食 / 家常菜' },
        { label: '统计周期', value: '__RANGE__' },
        { label: '覆盖规模', value: '3,216 位作者' },
        { label: '口径状态', value: '已对齐口径' },
      ],
      status_tag: { label: '掉量预警', color: 'warn' },
      conclusion: {
        label: '分析结论  供给侧收缩 + 时段错配导致掉量 7%',
        summary: '家常菜作者近 14 天总播放掉 7pct，其中高潜组缩量最明显（−12.6%），主因是工作日早高峰时段稳定供给量下滑 24%，叠加竞品引入"工作日 5 分钟快手菜"定向激励，在黄金时段抢走 8% 曝光。',
      },
      kpis: [
        { label: '覆盖作者', value: '3,216', delta: '−3.8%', status: 'bad' },
        { label: '14 天总播放', value: '18.2 亿', delta: '−7.0%', status: 'bad' },
        { label: '中位完播率', value: '36.2%', delta: '−1.1pct', status: 'bad' },
        { label: '收藏率', value: '6.4%', delta: '+0.8pct', status: 'good' },
        { label: '中位千次曝光', value: '¥ 26.8', delta: '+2.1%', status: 'good' },
        { label: '日均发布量', value: '1,840', delta: '−8.4%', status: 'bad' },
      ],
      insights: [
        { idx: 1, title: '工作日早高峰供给塌陷', summary: '工作日 7:30~9:00 供给量同比降 24%，流量分配权重没同步调导致作者曝光被切走。', bullets: ['早 7:30~9:00 投稿量从 420 条/天 降到 318 条/天', '同槽位 10 条里本垂类只占 3.2 条（上周 4.1）', '建议：工作日 5 分钟快手菜定向投 2 周 + 早上黄金档加权'] },
        { idx: 2, title: '封面标题点击率掉 2pct', summary: '高潜组封面从"成品横图"普遍换成"步骤拼贴"，但老观众点击率反而掉到 3.4%。', bullets: ['高潜组 CTR 中位数 3.4%（上周 5.4%）', '"步骤拼贴"类封面同槽位点击率比成品图低 1.7×', '建议：封面 A/B 测试 + 高潜作者统一回归成品图'] },
        { idx: 3, title: '长尾供给退出，作者留存差', summary: '连续 14 天没发稿的新增作者占比 28%，其中 30% 已经停更。', bullets: ['停更长尾作者 642 人 · 贡献上一周期 11% 播放', '首次发布后 7 日内无任何任务提醒触达', '建议：发布后 7 日新手任务链 + 流量包激励'] },
      ],
      appName: '家常菜掉量复盘看板',
      markdownTop: '**【应用：家常菜掉量复盘看板】**\n\n**名称：** 家常菜作者掉量复盘 · 近 14 天\n**类型：** 对比诊断看板\n**说明：** 对比近 14 天 vs 上一周期，定位掉量主因和可落地的恢复抓手。\n\n**核心指标：**',
      markdownKpis: ['- 覆盖作者：3,216 位（−3.8%）', '- 14 天总播放：18.2 亿（−7.0%）', '- 中位完播率：36.2%（−1.1pct）', '- 收藏率：6.4%（+0.8pct）'],
      markdownInsights: ['1. 工作日早高峰供给塌陷（−24%）→ 周末发布激励 × 工作日 7:30~9:00 加权。', '2. 封面点击率掉 2pct → 高潜作者回归成品横图 + 封面 A/B。', '3. 长尾退出 28% → 新手 7 日任务链 + 首条发布后 7 日流量包。'],
      markdownImprove: ['- 早高峰供给补足 → 工作日定向投 + 黄金档加权，预计恢复播放 5pct', '- 封面 A/B → 成品横图回归，预计 CTR 回升 1.6pct', '- 7 日新手任务链 + 流量包，停更率下降 10pct'],
    },
    {
      subtitle: 'CROSS-DOMAIN MIGRATION DASHBOARD',
      title: '垂类拓圈 · 新人转跨领域作者近 30 天表现看板',
      description: '观察 4,218 位拓圈新人的跨领域投稿率、留存、单条效率，拆解"能成功留下"的关键行为。',
      meta: [
        { label: '正式垂类', value: '全平台 · 拓圈' },
        { label: '统计周期', value: '__RANGE__' },
        { label: '样本规模', value: '4,218 位拓圈新人' },
        { label: '口径状态', value: '已对齐口径' },
      ],
      status_tag: { label: '观察样本 · 稳定增长', color: 'grn' },
      conclusion: {
        label: '分析结论  跨领域投稿 3 次以上的新人留存率 ×1.8',
        summary: '4,218 位拓圈新人里，跨领域投稿 ≥3 次的 1,243 人在 30 天后仍保持活跃的比例是 62%，明显高于只跨 1 次的 35%；核心抓手是"跨领域投稿后 48 小时内给出曝光扶持 + 明确的二次引导任务"。',
      },
      kpis: [
        { label: '样本规模', value: '4,218 位', delta: '—', status: 'good' },
        { label: '跨领域投稿率', value: '58%', delta: '+6pct', status: 'good' },
        { label: '跨 ≥3 次占比', value: '29.5%', delta: '+2.3pct', status: 'good' },
        { label: '30 日留存率', value: '46%', delta: '+4.7pct', status: 'good' },
        { label: '中位千次曝光', value: '¥ 22.7', delta: '+6.8%', status: 'good' },
        { label: '稳定供给率', value: '42%', delta: '+3.4pct', status: 'good' },
      ],
      insights: [
        { idx: 1, title: '前 3 次跨领域投稿的"前 48h 曝光"决定留存', summary: '跨域稿件上线后 48h 曝光 < 1,000 的新人后续不再投稿的概率是 58%。', bullets: ['跨域后 48h 曝光 ≥ 5,000：留存 68%', '跨域后 48h 曝光 < 500：留存 22%', '建议：拓圈新人前 3 条跨域稿件走 48h 扶持池'] },
        { idx: 2, title: '"兴趣标签 + 技能提示"组合能让跨域率再 +8%', summary: '在发布页放"你感兴趣的 X 垂类 + 建议投稿标题"引导的实验组，跨域投稿率比控制组高 8.3pct。', bullets: ['控制组跨域率 54% · 实验组 62.3%', '提示内容里出现"3 步可复制模板"的点击率更高', '建议：发布页为作者增加「拓圈选题卡片」模块'] },
        { idx: 3, title: '30 日后留存的强特征是"跨 3 个不同子垂"', summary: '跨 ≥3 个子垂的新人，90 日还在活跃的概率是 64%，远高于只跨 1 个子垂的 31%。', bullets: ['跨 ≥3 子垂：90 日还活跃 64%', '跨 1 子垂：90 日还活跃 31%', '建议：拓圈任务链里设置「跨 3 子垂解锁流量包」'] },
      ],
      appName: '拓圈新人表现看板',
      markdownTop: '**【应用：拓圈新人表现看板】**\n\n**名称：** 垂类拓圈 · 新人跨领域近 30 天表现\n**类型：** 样本分析看板\n**说明：** 基于 4,218 位拓圈新人的投稿率、留存、单条效率，拆解"能留得下"的关键行为。\n\n**核心指标：**',
      markdownKpis: ['- 样本规模：4,218 位拓圈新人', '- 跨 ≥3 次占比：29.5%（+2.3pct）', '- 30 日留存率：46%（+4.7pct）', '- 中位千次曝光：¥ 22.7（+6.8%）'],
      markdownInsights: ['1. 前 3 条跨域稿件的 48h 曝光决定留存 → 拓圈扶持池给前 3 条稿件加权。', '2. 发布页放「拓圈选题卡片」可让跨域率再 +8%。', '3. 跨 ≥3 子垂的 90 日活跃率 ×2 → 任务链解锁流量包。'],
      markdownImprove: ['- 48h 扶持池 → 跨域前 3 条稿件加权，留存率预估 +6pct', '- 拓圈选题卡片上线，跨域率 +8%', '- 「跨 3 子垂」解锁流量包，稳定供给率 +3.4pct'],
    },
  ]

  const T = TEMPLATES[appIdx % TEMPLATES.length]
  const skill = skillId ? mockAIResponse.skills?.find(s => s.id === skillId) : null
  const skillName = skill?.name || 'AI 助手'

  let content: string
  let trace: TraceStep[] = []
  const sources = ['本地数据']
  let app_preview: AppPreview | undefined | null = null

  const triggersAgentApp = /做一个\s*agent\s*app/i.test(message)
  const triggersScriptApp = /做一个\s*script\s*app/i.test(message)
  const triggersSkillApp = /做一个\s*skill(?:\s*app)?/i.test(message)
  const triggersSharePage = /做一个对外(?:链接|连接)/.test(message)
  const triggersWebApp = /做一个\s*web\s*app/i.test(message)
  const triggersFile = /做一(个|份)文件/.test(message)
  const mentionedPermissionLevels = Array.from(new Set(
    Array.from(message.matchAll(/[Ll]([23])/g), match => `L${match[1]}`),
  )).sort()
  const permissionRequestLevels = /获取/.test(message) && /数据/.test(message) ? mentionedPermissionLevels : []
  const permissionContinueLevels = /权限通过了[，,]?请你继续/i.test(message) ? mentionedPermissionLevels : []
  if (permissionContinueLevels.length > 0) {
    const levelLabel = permissionContinueLevels.join('、')
    content = `${levelLabel} 数据权限已生效，我会继续执行刚才的数据获取任务。\n\n已完成权限校验，正在按申请范围读取数据并整理结果。`
    trace = [
      { tool: 'check_data_permission', connector: '权限中心', label: `权限中心 · check(${levelLabel})`, status: 'ok', ms: 95 },
      { tool: 'resume_task', connector: '任务引擎', label: '任务引擎 · resume()', status: 'ok', ms: 160 },
    ]
  } else if (permissionRequestLevels.length > 0) {
    const levelLabel = permissionRequestLevels.join('、')
    const permissionNotes = permissionRequestLevels.map(level => level === 'L2'
      ? 'L2 数据申请需告知你的 +1。'
      : 'L3 数据申请需由你的 +1 审批。').join('\n')
    content = `当前账号尚未获得 ${levelLabel} 数据权限。\n\n${permissionNotes}\n\n请点击下方按钮申请 ${levelLabel} 数据权限。`
    trace = [
      { tool: 'check_data_permission', connector: '权限中心', label: `权限中心 · check(${levelLabel})`, status: 'err', ms: 88 },
    ]
  } else if (triggersScriptApp) {
    const scriptName = '文本摘要与关键词提取'
    app_preview = {
      type: 'script',
      name: scriptName,
      description: '输入一段文本，自动生成摘要、关键词和情感判断。',
      inputs: [
        { name: 'text', type: 'string', required: true, description: '需要分析的文本内容', placeholder: '输入 string...' },
        { name: 'max_keywords', type: 'integer', description: '提取关键词的最大数量（默认 5）', defaultValue: '5' },
      ],
      outputs: [
        { name: 'summary', type: 'string', description: '文本摘要' },
        { name: 'keywords', type: 'array', description: '关键词数组' },
        { name: 'sentiment', type: 'string', description: '情感判断' },
      ],
    }
    content = `Script App 已经构建完成，应用 ID 为 16222，右侧预览区可以直接填写参数并试跑。

这个应用接收两个输入：text 是需要分析的文本内容，为必填项；max_keywords 控制提取关键词的最大数量，不填时默认取 5 个。输出包含三项结果：summary 是整段文本的摘要，keywords 是关键词数组，sentiment 是整体情感判断。

实现上我把三件事合并到了一次模型调用里完成，避免多轮请求带来的额外延迟和成本。输入参数已经自动生成了类型校验，缺少必填项或者类型不符时会直接提示，不会把脏数据带到下游环节。输出结构是固定的 JSON，字段名和类型都不会随内容变化，可以放心被其他应用直接引用。

需要说明的是，摘要长度目前由模型自行判断，遇到超长文本时会优先保证信息完整而不是压缩字数；如果你的场景对长度有硬性要求，可以把它改成固定区间。

你可以先在右侧跑一条真实文本看看效果。如果需要补充输入字段、调整输出结构，或者把摘要长度和关键词粒度改成明确规则，告诉我具体要求，我接着改。`
    trace = [
      { tool: 'define_script', connector: '应用引擎', label: '应用引擎 · define_script()', status: 'ok', ms: 120 },
      { tool: 'build_script_app', connector: '应用引擎', label: `应用引擎 · build_script_app(${scriptName})`, status: 'ok', ms: 240 },
      { tool: 'open_preview', connector: '应用引擎', label: '应用引擎 · open_preview()', status: 'ok', ms: 60 },
    ]
  } else if (triggersSkillApp) {
    const skillName = '热点内容探查'
    const skillDescription = '发现并整理近期热点，输出可验证的选题方向与执行步骤。'
    app_preview = {
      type: 'skill',
      name: skillName,
      description: skillDescription,
      folders: ['sop', 'references'],
      files: [
        {
          path: 'SKILL.md',
          content: `---\nname: ${skillName}\ndescription: ${skillDescription}\n---\n\n# ${skillName}\n\n## 作用\n\n这个 Skill 用于发现近期热点，并把零散信息整理成清晰、可执行的选题建议。\n\n## 工作流程\n\n1. 按照 [热点发现步骤](sop/step1.md) 收集候选热点。\n2. 使用 [选题检查清单](references/checklist.md) 进行筛选。\n3. 输出热点结论、证据和下一步行动。\n\n## 输出要求\n\n- 先给结论，再提供依据\n- 标明信息时间范围\n- 不确定的信息需要明确说明`,
        },
        {
          path: 'sop/step1.md',
          content: `# 热点发现步骤\n\n1. 明确用户关注的赛道与时间范围。\n2. 收集多个来源的候选话题。\n3. 对比热度、增长速度与内容供给缺口。\n4. 保留至少一条可核验依据。`,
        },
        {
          path: 'references/checklist.md',
          content: `# 选题检查清单\n\n- 是否与目标用户相关\n- 是否具备明确的新鲜度\n- 是否有可靠依据\n- 是否能转化为可执行内容\n- 是否存在合规风险`,
        },
      ],
    }
    content = `SkillApp 已经创建完成，并且自动保存到了技能库的“我的”分组，你随时可以在技能库里找到它。

右侧可以直接查看和编辑 SKILL.md，这是这个技能的主文件，里面写清楚了它的作用、工作流程和输出要求。通过文件树还能打开它引用的两个附件：sop 目录下是分步执行的操作步骤，references 目录下是筛选用的检查清单。

主文件和附件是分开的：主文件只保留判断逻辑和整体流程，细节放在附件里按需加载。这样技能被调用时占用的上下文更短，执行过程也更稳定，后续想改某个环节，只动对应的附件就行，不必重写整个技能。

输出要求里我特意加了三条约束：先给结论再给依据、标明信息的时间范围、不确定的地方必须显式说明。这几条决定了技能产出的结果能不能被直接采信，建议保留；如果场景对格式有额外要求，比如固定的小标题顺序或者必须附来源链接，也可以补在同一段里。

确认内容没有问题后，点击右上角的发布按钮即可提交为官方技能。如果还想补充执行步骤、增加参考资料，或者调整输出格式的要求，直接告诉我，我继续完善。`
    trace = [
      { tool: 'define_skill', connector: '应用引擎', label: '应用引擎 · define_skill()', status: 'ok', ms: 120 },
      { tool: 'build_skill_app', connector: '应用引擎', label: `应用引擎 · build_skill_app(${skillName})`, status: 'ok', ms: 220 },
      { tool: 'open_preview', connector: '应用引擎', label: '应用引擎 · open_preview()', status: 'ok', ms: 60 },
    ]
  } else if (triggersAgentApp) {
    app_preview = {
      type: 'agent',
      name: '热点探查Agent',
      description: '一个可直接对话测试的 Agent 应用',
      welcome: '发送一条消息开始测试',
      placeholder: '输入消息',
    }

    content = `Agent 应用已经创建完成，我先搭好了一个可以直接对话测试的界面。

右侧预览区输入消息就能立即体验它的回复效果，顶部的发布、切换预览和关闭操作也都保留着，随时可以在配置页和对话页之间来回切换。默认已经按它的定位挂上了几个推荐技能，你可以在配置页里增减，也可以直接改写系统提示词，改完再回到对话页验证效果。

需要注意的是，改动系统提示词或技能配置之后，之前的测试记录是基于旧配置产生的，两边混在一起会看不出改动到底有没有生效，建议清空历史后重新测一轮，对比才有意义。

技能这块的建议是先少后多：先只挂必需的一两个，把主流程跑通，再逐步加。挂得太多时模型容易在选择上摇摆，反而拉低回答的稳定性。

另外，在输入框输入 @ 就能把这个 Agent App 集成到其他对话里使用。集成之后它会带着这里的系统提示词和技能配置一起工作，所以建议先在这里把效果调到满意，再拿出去用。

你可以继续告诉我它的角色、能力边界或回复风格，比如面向谁、遇到不确定的问题怎么处理、回答该给到多细，我接着完善配置。`
    trace = [
      { tool: 'define_agent', connector: '应用引擎', label: '应用引擎 · define_agent()', status: 'ok', ms: 120 },
      { tool: 'build_agent_app', connector: '应用引擎', label: '应用引擎 · build_agent_app(热点探查Agent)', status: 'ok', ms: 240 },
      { tool: 'open_preview', connector: '应用引擎', label: '应用引擎 · open_preview()', status: 'ok', ms: 60 },
    ]
  } else if (triggersSharePage) {
    // ====== 做一个可分享网页 ======
    const today = new Date()
    const todayStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`
    const by = 'AI 运营助手 · Pop Agent'
    const webpageThemes: Array<NonNullable<WebpagePreview['theme']>> = ['sage', 'lilac', 'coral', 'sky']
    const theme = webpageThemes[webpageIdx % webpageThemes.length]

    const WEBPAGE_TEMPLATES: Array<{
      cover: Omit<WebpagePreview['cover'], 'shareMeta'>
      summary: string
      sections: Array<Omit<WebpageSection, 'id'>>
      callout: WebpagePreview['callout']
      footer: Omit<WebpagePreview['footer'], 'share_url'> & { url_tpl: string }
      appName: string
      markdownTitle: string
      markdownIntro: string
      markdownSections: string[]
      markdownCallout: string
    }> = [
      {
        cover: {
          eyebrow: '外部分享 · 公开可见',
          title: '垂类周度增长速递 · 第 1 期',
          subtitle: '面向作者团队的本周趋势解读 + 3 条可落地行动建议',
          tags: ['增长', '周报', '周度行动清单'],
        },
        summary: '本期周报聚焦"结论前置 → 标题/封面冲突性 → 周末激励"三条主线，附作者分层样例与行动清单，可直接转发到飞书群或外部分享给作者协作。',
        sections: [
          {
            accent: theme, title: '本周 TOP 结论', lead: '一句话先讲最大的变化：',
            kpis: [
              { label: '总播放', value: '128.3 亿', delta: '+7.2%', badge: 'up' },
              { label: '中位完播', value: '37.8%', delta: '+0.6pct', badge: 'up' },
              { label: '外部分享', value: '24.6 万次', delta: '+18%', badge: 'up' },
              { label: '跳失率', value: '29%', delta: '−2.1pct', badge: 'up' },
            ],
            body: '本周最大的结构变化是，跨 3 个以上子垂投稿的新人留存率首次超过 60%。反过来，只发 1 条子垂内容的新人 30 日留存掉到 31%。因此本周的全部推荐策略、活动策略、脚本策略都围绕"让新人快速尝试跨 3 个子垂"这一条主线展开。',
            bullets: ['建议 1：作者首条跨域稿件在 48h 内走"拓圈扶持池"', '建议 2：发布页增加「3 个相邻子垂选题卡」模块', '建议 3：任务链设置「跨 3 子垂解锁流量包」奖励'],
          },
          {
            accent: theme, title: '本周 3 条可落地行动', lead: '直接可执行、可被 PM/运营照抄的清单：',
            body: '按 20 人团队口径拆解，3 条动作落地耗时约 3 人天，预计 7 日内中位完播 +2pct、新人 30 日留存 +5pct，且外部分享点击率提升 10% 以上。',
            bullets: ['① 07-28 至 08-03：周末发布激励计划（周末首发额外 +25% 曝光池）', '② 07-29：覆盖 600+ 重点作者的「结论前置」脚本模板私信推送', '③ 08-01：发布页「跨子垂选题卡」模块灰度（10% → 50%）'],
          },
          {
            accent: theme, title: '附：本期分享范围', lead: '外部分享链接的授权与脱敏',
            body: '本期分享链接的外网可见范围：所有包含真实作者昵称的数据点均已做脱敏；内部版本保留完整作者名与任务 id，在飞书内按群成员身份可见。两个版本的结构、图示、顺序一致，仅作者身份信息不同。',
          },
        ],
        callout: { label: '下一步', body: '如果你同意这 3 条主线，我可以直接帮你生成本周的重点作者触达名单与每一位作者的个性化文案。', cta: '生成作者触达名单' },
        footer: { note: '本页面由 Pop Agent 自动生成 · 外部访问无需登录', url_tpl: 'https://popagent.example.com/share/xp_weekly__1__seed', qr_caption: '扫码或复制链接，外部分享访问' },
        appName: '垂类周度增长速递 · 可分享',
        markdownTitle: '**【可分享网页 · 垂类周度增长速递（第 1 期）】**',
        markdownIntro: '已生成一份公开可访问的周报页面，结构为「封面 + 本周 TOP 结论 + 3 条行动清单 + 分享范围」，外部访问无需登录，已自动脱敏。',
        markdownSections: [
          '## 本周 TOP 结论',
          '- 总播放 **128.3 亿**（+7.2%）/ 中位完播 37.8%（+0.6pct）',
          '- 跨 3 个子垂的新人 **30 日留存 60%**，只发 1 条的新人掉到 31%',
          '- 主线：所有推荐/活动/脚本策略都围绕「让新人快速跨 3 个子垂」展开',
          '## 本周 3 条可落地行动',
          '- 07-28~08-03 周末发布激励（周末首发 +25% 曝光池）',
          '- 07-29 重点作者「结论前置」脚本模板私信推送',
          '- 08-01 发布页「跨子垂选题卡」模块灰度 10%→50%',
          '## 外部分享说明',
          '- 外网版本作者信息已做脱敏',
          '- 飞书内部版本保留作者昵称与任务 id',
        ],
        markdownCallout: '**调用 action**：如果你同意这 3 条主线，让我生成本周重点作者的触达名单和每一位作者的个性化文案。',
      },
      {
        cover: {
          eyebrow: '外部分享 · 已发布',
          title: '重点作者健康度画像 · 外部版',
          subtitle: '12 位高潜作者 · 分层诊断 + 单作者 5 项行动建议 + 分享短链',
          tags: ['作者画像', '分层诊断', '可分享'],
        },
        summary: '这份画像面向业务同学/合作作者公开，作者本人也可扫码查看，每个人都能看到自己 5 项问题、5 项建议、与对标作者的差距。',
        sections: [
          {
            accent: theme, title: '12 位重点作者健康度一览', lead: '5 项指标：稳定供给 / 完播 / 封面 CTR / 互动率 / CPM',
            kpis: [
              { label: '覆盖作者', value: '12 位', delta: 'S / A 级' },
              { label: '中位健康度', value: '72/100', delta: '+5 分', badge: 'up' },
              { label: '需重点跟进', value: '3 位', delta: '25%' },
            ],
            body: '12 位作者的中位健康度从上周的 67 分提升到 72 分。封面 CTR 的回升是主要拉动项，因为上周覆盖了 4/12 的作者做了封面 A/B 的回归替换。本周要把剩余 8 位作者的封面替换动作在 48h 内闭环完成。',
            bullets: ['01～04：封面 CTR 低于阈值的 4 位已替换回归，中位 CTR 从 4.8% → 7.1%', '05～08：稳定供给节奏从"一周一更"切到"2+1"，周末增加 1 条跨子垂', '09～12：脚本模板替换为「结论前置」，中位 3s 跳出下降 6pct'],
          },
          {
            accent: theme, title: '每位作者的 5 项行动建议', lead: '作者本人扫码也能看到自己的 5 条建议',
            body: '外部分享页每位作者一个 Tab，每条建议都有「做什么 / 不要做什么 / 预期效果」三段式说明，避免作者误解为"流量分配策略"，而是"一起把内容质量做高"的联合行动。',
            bullets: ['① 首条跨子垂内容走 48h 扶持池', '② 封面回归成品图 + 冲突信息点（不要只放步骤图）', '③ 前 3 秒先把结论抛出来，再铺过程', '④ 首 7 日至少 2 条原垂 + 1 条跨子垂', '⑤ 第 8 天回看自己的对比图：看跳出 & 完播变化'],
          },
        ],
        callout: { label: '你想我下一步做什么？', body: '可以选择：（A）让我生成每位作者独立的分享链接；（B）让我把 12 位作者按健康度优先级排序出 S/A/B。', cta: '生成每位作者独立分享链接' },
        footer: { note: 'Pop Agent 自动生成 · 作者本人访问使用短链无需登录', url_tpl: 'https://popagent.example.com/share/author_health_12p_seed', qr_caption: '扫码打开：作者本人独立版 · 外部可分享' },
        appName: '重点作者健康度画像 · 可分享',
        markdownTitle: '**【可分享网页 · 重点作者健康度画像（外部版）】**',
        markdownIntro: '已生成 12 位重点作者的健康度画像：中位 72/100，3 位需重点跟进。每位作者都能扫码看到自己的 5 项行动建议（外部版已脱敏）。',
        markdownSections: [
          '## 12 位重点作者一览',
          '- 中位健康度 **72/100**（上周 67/100 → +5 分）',
          '- 4/12 封面 CTR 已从 4.8% 回归到 7.1%',
          '- 本周要闭环：剩余 8 位作者封面 48h 内完成回归替换',
          '## 每位作者 5 项行动建议（作者也能看到）',
          '- 首条跨子垂内容走 48h 扶持池',
          '- 封面回归成品图 + 冲突信息点（不要只放步骤图）',
          '- 前 3 秒先抛结论，再铺过程',
          '- 首 7 日 2 条原垂 + 1 条跨子垂',
          '- 第 8 天回看跳出 / 完播对比图',
        ],
        markdownCallout: '**调用 action**：让我生成每位作者独立的分享链接？或者把 12 位作者按优先级 S / A / B 排个序？',
      },
      {
        cover: {
          eyebrow: '外部分享 · 公开链接',
          title: '选题爆款密码 · 本月 TOP 10 复盘',
          subtitle: '把本月 10 条爆款做成可转发的"为什么爆款 + 下次怎么抄"',
          tags: ['爆款复盘', '选题', '本月精选'],
        },
        summary: '选了本月 10 条跨赛道的样本爆款，从"标题冲突 / 封面构图 / 首 2 秒钩子 / 结尾 CTA"四个维度拆解，每一条都附带"下次做同款怎么抄"的脚本模板。',
        sections: [
          {
            accent: theme, title: '本月 TOP 爆款共同点', lead: '先讲"爆款共性"：',
            kpis: [
              { label: '样本数', value: '10 条' },
              { label: '中位 2s 跳出', value: '21%', delta: '比非爆款 −18pct', badge: 'up' },
              { label: '中位收藏率', value: '9.3%', delta: '+4.1pct', badge: 'up' },
              { label: '中位分享率', value: '3.1%', delta: '+1.4pct', badge: 'up' },
            ],
            body: '10 条样本的首 2 秒都使用了"信息密度高的冲突画面 + 一句话冲突标题"。相比对照组，把「过程铺垫」放在第 3 秒以后而不是第 0 秒，这一条动作就带来平均约 12% 的完播提升和 18pct 的 2 秒跳出下降。',
            bullets: ['标题 9/10 条使用了「你以为是 A 其实是 B」的冲突结构', '封面 7/10 条用了「成品主图 + 对比小图」构图', '首 2 秒 9/10 条先抛结论/先抛冲突信息，不是先铺过程', '结尾 CTA 8/10 条明确引导「先收藏再实操」'],
          },
          {
            accent: theme, title: '本月可复用的 3 条模板', lead: '直接写进脚本：',
            body: '这 3 条模板可直接替换到垂类拍摄清单里，建议每个垂类至少准备 1 套"标题 + 封面 + 首 2 秒 + 结尾 CTA"的组合，每次发稿时按固定节奏套。',
            bullets: ['① 「你以为是___？其实是___」冲突标题款（适合知识 / 经验 / 测评类）', '② 「对比主图」款：大图放成品 + 2~3 个小对比图（适合美食 / 穿搭 / 家居）', '③ 「先看结论」款：首 2 秒抛结论，第 3 秒开始切过程（适合绝大多数口播 / 出镜视频）'],
          },
        ],
        callout: { label: '继续下一步？', body: '想让我把这 10 条逐一分条拆成「为什么爆 + 怎么抄」的逐条长文版本吗？或者做成你的垂类版本？', cta: '生成 10 条逐条拆解版' },
        footer: { note: 'Pop Agent · 自动生成 · 公开分享版无需登录', url_tpl: 'https://popagent.example.com/share/viral_10_this_month_seed', qr_caption: '扫码或复制链接：外部分享访问' },
        appName: '选题爆款密码 · 本月 TOP 10 · 可分享',
        markdownTitle: '**【可分享网页 · 选题爆款密码（本月 TOP 10 复盘）】**',
        markdownIntro: '已生成本月 10 条跨赛道爆款的公开分享页面：「为什么爆款 + 下次怎么抄」三段式拆解，可直接转发给作者和团队。',
        markdownSections: [
          '## 本月爆款共性',
          '- 中位 2s 跳出 **21%**（比非爆款低 18pct）',
          '- 中位收藏率 9.3%（+4.1pct）',
          '- 9/10 条首 2 秒先抛冲突信息，不是先铺过程',
          '## 可直接复用的 3 条模板',
          '- 「你以为是 A？其实是 B」冲突标题款',
          '- 「对比主图」封面款',
          '- 「先看结论」首 2 秒款',
        ],
        markdownCallout: '**调用 action**：把 10 条逐条拆解成长文版？或者做成你的垂类专属版？',
      },
      {
        cover: {
          eyebrow: '外部分享 · 公开版本',
          title: '创作者 FAQ · 平台规则常见问题',
          subtitle: '按主题分类的 Q&A，支持二维码分享 + 逐条复制链接',
          tags: ['规则', 'FAQ', '外部分享'],
        },
        summary: '把作者经常问的 12 条规则 FAQ 做成一份可直接扫码转发的公开页面，按「流量处罚 / 推荐机制 / 外部分享 / 合作任务」4 个主题分类，回答里引用规则原文编号。',
        sections: [
          {
            accent: theme, title: 'FAQ · 流量处罚类（TOP 3）', lead: '本周被问 200+ 次：',
            body: '这 3 条提问占全部处罚类咨询的 72%。外部分享页用了"先讲结论 → 再讲规则依据 → 最后给出自助修复步骤"的三段式结构，作者看一遍就能自助解决，不需要进工单。',
            bullets: ['Q1：我的流量突然降了是不是被处罚？→ 先看 3 条自助排查（任务是否违规 / 是否跨时间窗 / 是否最近换了垂类）', 'Q2：一次处罚会影响多长时间？→ 处罚时效 + 7 条稿回归动作清单', 'Q3：申诉怎么通过率高？→ 申诉文案模板 + 必带的 3 条证据'],
          },
          {
            accent: theme, title: 'FAQ · 推荐机制类（TOP 3）', lead: '本周被问 150+ 次：',
            body: '推荐机制类问题反复出现的核心原因是作者把「稿件曝光」和「账号能力」混为一谈。FAQ 把两者拆开成两张图：稿件曝光 ≠ 账号被封，反之账号健康也不代表每条稿都有高曝光。',
            bullets: ['Q1：一条视频的推荐窗口期是多久？→ 3 段式（冷启动 0~30min，扩散 30min~2h，长尾 2h+）', 'Q2：封面 / 标题 / 首 2 秒 / 结尾 CTA 各自影响哪条指标？→ 附一张对照表', 'Q3：为什么相似内容，别人曝光比我高？→ 作者画像差异 + 发布时间窗差异 2 条说明'],
          },
          {
            accent: theme, title: '附：我需要作者做的 5 条配合', lead: '外部分享页最后一部分',
            body: '让作者自己做的 5 条动作，是"降低工单量、减少反复沟通"最有效的杠杆。页面最后用了一个大色块 + 5 条 checkbox，作者也能保存图片当自己的行动清单。',
            bullets: ['① 每条稿先自己回看一遍：首 3 秒你愿不愿意继续看？', '② 封面图先发给朋友看：你能一秒看懂主题和冲突吗？', '③ 发布后 1h 不要反复删 / 改标题 / 下掉再上', '④ 处罚后走申诉通道 + 7 条稿回归，不要重复发同类内容', '⑤ 规则更新时，先对照自己最近 3 条稿看变化点'],
          },
        ],
        callout: { label: '继续升级？', body: '想让我把"你的作者"最近被问最多的问题自动扫描进这份 FAQ，替换成你团队的真实提问 Top 10 吗？', cta: '同步团队真实提问 Top 10' },
        footer: { note: 'Pop Agent · 规则 FAQ 自动生成 · 外部无需登录', url_tpl: 'https://popagent.example.com/share/creator_faq_seed_v1', qr_caption: '扫码：打开规则 FAQ 外部分享页' },
        appName: '创作者 FAQ · 规则问答 · 可分享',
        markdownTitle: '**【可分享网页 · 创作者 FAQ（平台规则常见问题）】**',
        markdownIntro: '已生成 12 条 FAQ 的公开分享版：4 个主题分类 + 三段式回答 + 规则原文引用。作者扫码即可查看，也能逐条复制链接发送给合作作者。',
        markdownSections: [
          '## FAQ · 流量处罚类 Top 3',
          '- Q1：突然降流量是否处罚？→ 自助 3 条排查清单',
          '- Q2：处罚时效多久？→ 时效 + 7 条稿回归动作',
          '- Q3：怎么申诉通过率高？→ 申诉模板 + 3 条必带证据',
          '## FAQ · 推荐机制类 Top 3',
          '- Q1：推荐窗口时长？→ 三段式（冷启 0~30min，扩散 30min~2h，长尾 2h+）',
          '- Q2：封面 / 标题 / 首 2s / 结尾 CTA 各自影响什么？→ 对照表',
          '- Q3：相似内容别人曝光高？→ 画像差异 + 发布时间窗差异',
        ],
        markdownCallout: '**调用 action**：把你团队作者被问最多的真实提问 Top 10 自动同步进这份 FAQ，要不要做？',
      },
    ]

    const W = WEBPAGE_TEMPLATES[webpageIdx % WEBPAGE_TEMPLATES.length]
    const sectionsWithId: WebpageSection[] = W.sections.map((s, i) => ({ ...s, id: 'sec_' + i }))
    const external = true
    const reads = ['1.2 万', '8,340', '3.8 万', '5,620'][webpageIdx % 4]
    const share_url = W.footer.url_tpl + '_' + webpageIdx

    app_preview = {
      type: 'sharepage',
      theme,
      cover: {
        eyebrow: W.cover.eyebrow,
        title: W.cover.title,
        subtitle: W.cover.subtitle,
        tags: W.cover.tags,
        shareMeta: { by, at: todayStr, reads, external },
      },
      summary: W.summary,
      sections: sectionsWithId,
      callout: W.callout,
      footer: { note: W.footer.note, share_url, qr_caption: W.footer.qr_caption },
    }

    content = `对外链接页面已经准备完成，页面名称为「${W.appName}」，右侧正在生成最终预览。

我把原有内容重新整理成了适合外部阅读的结构：保留核心结论、关键数据、分析依据和行动建议，补上页面标题、副标题、摘要和内容分区，并统一了标题层级、正文宽度、段落间距与重点信息样式。较长的段落做了拆分，关键指标单独成块，重点结论加了视觉强调，降低阅读成本。

页面已经适配常见桌面浏览器尺寸和手机端纵向阅读，长标题会自动换行，数据卡片会根据屏幕宽度重新排列。外部访问者只能查看内容，无法修改原始页面，链接也不依赖当前会话窗口，可以独立打开。

原始内容仍然保留在当前 WebApp 里，对外页面是一份独立的只读版本，两边互不影响。之后你继续修改 WebApp 时，线上链接不会被立刻覆盖，需要你确认后再同步。

你可以先在右侧检查内容与展示效果，重点看三处：结论有没有被断章取义、数据有没有缺少口径说明、有没有不该对外的字段。确认没问题后提交分享审核，审批通过就会生成可复制的线上链接。`

    trace = [
      { tool: 'structure_page', connector: '分享引擎', label: '分享引擎 · structure_page()', status: 'run', ms: 0 },
      { tool: 'structure_page', connector: '分享引擎', label: '分享引擎 · structure_page()', status: 'ok', ms: 220 },
      { tool: 'render_webpage', connector: '分享引擎', label: '分享引擎 · render_webpage(' + W.appName + ')', status: 'run', ms: 0 },
      { tool: 'generate_share_token', connector: '分享引擎', label: '分享引擎 · generate_share_token()', status: 'ok', ms: 180 },
      { tool: 'render_webpage', connector: '分享引擎', label: '分享引擎 · render_webpage(' + W.appName + ')', status: 'ok', ms: 310 },
    ]
  } else if (triggersFile) {
    const fileName = 'demo.md'
    app_preview = {
      type: 'file',
      name: fileName,
      format: 'Markdown',
      description: '项目说明文件，包含简介、使用方式和示例代码。',
      content: `# demo.md

这是一份由 XAgent 生成的示例文件，可以直接下载后继续编辑。

## 项目简介

一个用于演示产物预览的最小项目，包含基础的目录结构和一段可运行的示例代码。

## 使用方式

1. 下载本文件到本地
2. 按下面的示例补齐配置
3. 运行后即可看到输出

## 示例代码

- 入口文件：\`src/index.ts\`
- 配置文件：\`config.json\`
- 输出目录：\`dist/\`

## 备注

内容为演示数据，实际使用时请替换为你自己的项目信息。`,
    }

    content = `文件已经生成，文件名为「${fileName}」，右侧可以直接预览。

这份文档包含项目简介、使用方式和一段完整的示例代码，打开后可以直接继续编辑。如果需要换成别的格式或者补充章节，告诉我就行。`
    trace = [
      { tool: 'draft_outline', connector: '文档引擎', label: '文档引擎 · draft_outline()', status: 'ok', ms: 120 },
      { tool: 'write_file', connector: '文档引擎', label: `文档引擎 · write_file(${fileName})`, status: 'ok', ms: 180 },
    ]
  } else if (triggersWebApp) {
    const today = new Date()
    const y0 = today.getFullYear()
    const m0 = String(today.getMonth() - 0).padStart(2, '0')
    const d7 = String(Math.max(1, today.getDate() - 7)).padStart(2, '0')
    const d0 = String(today.getDate()).padStart(2, '0')
    const range = `${y0}-${m0}-${d7} 至 ${y0}-${m0}-${d0}`

    const kpis: KPIData[] = T.kpis
    const insights: Insight[] = T.insights
    const meta = T.meta.map(m => ({ ...m, value: m.value === '__RANGE__' ? range : m.value }))

    app_preview = {
      type: 'webapp',
      subtitle: T.subtitle,
      title: T.title,
      description: T.description,
      meta,
      status_tag: T.status_tag,
      conclusion: { label: T.conclusion.label, summary: T.conclusion.summary },
      kpis,
      insights,
    }

    content = `WebApp 已经生成，页面名称为「${T.appName}」，右侧可以直接预览。

我按“更清晰、可执行”的方向重新组织了内容：顶部是核心指标概览，一眼能看到规模、流量和效率的变化；中间是关键发现，每一条都附上对应的数据依据，而不是只给结论；底部是可落地的改进项，写明具体动作和预期效果。

页面上同时标注了数据口径和统计周期，口径没有完全对齐的地方也做了显式提示，避免这份看板被当成完整口径直接对外引用。重点结论加了视觉强调，扫一眼就能定位到问题所在。

指标之间的关系也做了排序：先看规模够不够，再看效率高不高，最后才看单条内容的表现。按这个顺序读，结论不容易被单一指标的波动带偏。

如果你要把这份看板拿去汇报，建议再补一段结论的适用范围，说明它基于哪段时间、哪批样本得出，避免被跨周期直接引用。这部分我可以帮你写。

你想先继续调整哪个部分？比如换一组指标、把某条关键发现展开讲透、补充对比周期，或者调整整体配色和排版，都可以直接说。`
    trace = [
      { tool: 'author_profile', connector: '创作者数据', label: '创作者数据 · author_profile()', status: 'run', ms: 0 },
      { tool: 'author_profile', connector: '创作者数据', label: '创作者数据 · author_profile()', status: 'ok', ms: 260 },
      { tool: 'traffic_trend', connector: '创作者数据', label: '创作者数据 · traffic_trend()', status: 'run', ms: 0 },
      { tool: 'traffic_trend', connector: '创作者数据', label: '创作者数据 · traffic_trend()', status: 'ok', ms: 310 },
      { tool: 'build_kanban', connector: '应用引擎', label: `应用引擎 · build_kanban(${T.appName})`, status: 'ok', ms: 180 },
    ]
  } else if (message.includes('体检') || message.includes('检查')) {
    content = `## 体检结论\n\n综合评分 **78 分**，推荐推送。\n\n### 亮点\n- 开头 3 秒 hook 到位\n- 封面点击率 8.2%\n- 互动率 3.1%\n\n### 建议\n- 中段节奏可再紧凑\n- 结尾增加明确 CTA`
    trace = [
      { tool: 'check_item', connector: '创作者数据', label: '创作者数据 · check_item()', status: 'run', ms: 0 },
      { tool: 'check_item', connector: '创作者数据', label: '创作者数据 · check_item()', status: 'ok', ms: 120 },
      { tool: 'search_rules', connector: '规则库', label: '规则库 · search_rules()', status: 'ok', ms: 80 },
    ]
  } else if (message.includes('掉量') || message.includes('复盘')) {
    content = `## 掉量归因分析\n\n**核心原因：发布时间窗口不当**\n\n### 数据对比\n- 播放量：12.3万 → 4.7万（-62%）\n- 发布时间：周六 18:00 → 周三 12:00\n- 周三午间流量仅为周六晚间的 35%\n\n### 排除因素\n- 无处罚记录\n- 内容质量稳定\n\n### 建议\n1. 恢复周六 18:00 发布\n2. 备选：周五 20:00`
    trace = [
      { tool: 'analyze_trend', connector: '创作者数据', label: '创作者数据 · analyze_trend()', status: 'run', ms: 0 },
      { tool: 'check_penalty', connector: '创作者数据', label: '创作者数据 · check_penalty()', status: 'ok', ms: 95 },
      { tool: 'analyze_trend', connector: '创作者数据', label: '创作者数据 · analyze_trend()', status: 'ok', ms: 230 },
    ]
  } else if (message.includes('你好') || message.includes('hi') || message.includes('在吗')) {
    content = `你好！我是 ${skillName}，可以帮你处理以下任务：\n\n- 📊 **作品体检**：诊断作品能否推送\n- 📉 **掉量复盘**：分析掉量原因\n- 🔍 **账号诊断**：评估培养价值\n- 🎯 **圈选找人**：筛选目标作者\n- 📋 **规则答疑**：查询平台规则\n- 🔥 **选题热点**：获取赛道热点\n\n直接告诉我你想做什么吧！`
    trace = [{ tool: 'greet', connector: '系统', label: '系统 · greet()', status: 'ok', ms: 5 }]
  } else {
    content = `收到你的消息：「${message.slice(0, 50)}${message.length > 50 ? '…' : ''}」\n\n这是一个纯前端演示版本，AI 回答为模拟生成。\n\n在实际部署中，${skillName}会调用后端连接器获取真实数据，产出可溯源的诊断结论。\n\n你可以尝试以下示例：\n- "帮我体检这条作品"\n- "@某作者 最近掉量帮我复盘"\n- "这个作者值不值得培"`
    trace = [{ tool: 'mock_ai', connector: '本地模拟', label: '本地模拟 · mock_ai()', status: 'ok', ms: 15 }]
  }

  const triggersAppBuilder = triggersScriptApp || triggersSkillApp || triggersAgentApp || triggersSharePage || triggersWebApp || triggersFile
  if (triggersAppBuilder) content = clampSpecialReply(content)

  return { content, trace, sources, app_preview }
}
mockAIResponse.skills = null as Skill[] | null

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export const api = {

  async sidebar(): Promise<SidebarTask[]> {
    const s = loadStore()
    const tasks = [...s.tasks].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updated_at - a.updated_at).map(t => ({
      id: t.id, title: t.title, dot: t.dot, skill_id: t.skill_id, pinned: Boolean(t.pinned),
    }))
    return tasks
  },

  async generatedApps(): Promise<GeneratedApp[]> {
    const s = loadStore()
    const taskById = new Map(s.tasks.map(task => [task.id, task]))
    return s.messages
      .filter(message => message.app_preview?.type === 'webapp' || message.app_preview?.type === 'agent' || message.app_preview?.type === 'skill' || message.app_preview?.type === 'script')
      .map(message => {
        const preview = message.app_preview!
        const task = taskById.get(message.task_id)
        if (preview.type === 'skill') {
          return {
            id: `${message.task_id}:${message.id}`,
            taskId: message.task_id,
            messageId: message.id,
            type: 'skillapp' as const,
            title: preview.name || task?.title || 'SkillApp',
            description: preview.description || '可编辑并发布到技能库的 SkillApp',
            createdAt: message.created_at,
          }
        }
        if (preview.type === 'agent') {
          return {
            id: `${message.task_id}:${message.id}`,
            taskId: message.task_id,
            messageId: message.id,
            type: 'agentapp' as const,
            title: preview.name || task?.title || 'Agent 应用',
            description: preview.description || '可直接对话测试的 Agent 应用',
            createdAt: message.created_at,
          }
        }
        if (preview.type === 'script') {
          return {
            id: `${message.task_id}:${message.id}`,
            taskId: message.task_id,
            messageId: message.id,
            type: 'scriptapp' as const,
            title: preview.name || task?.title || 'Script App',
            description: preview.description || '可直接运行的 Script 应用',
            createdAt: message.created_at,
          }
        }
        const webapp = preview as KanbanPreview
        return {
          id: `${message.task_id}:${message.id}`,
          taskId: message.task_id,
          messageId: message.id,
          type: 'webapp' as const,
          title: webapp.title || task?.title || 'WebApp',
          description: webapp.description || webapp.conclusion?.summary || '会话中生成的 WebApp',
          createdAt: message.created_at,
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  async folders(): Promise<Folder[]> {
    return loadStore().folders
  },

  async createFolder(name: string): Promise<Folder> {
    const s = loadStore()
    const f: Folder = { id: 'f_' + Date.now(), name, is_default: 0, kind: 'local', members: [{ name: '我', color: '#D9DBE1' }], created_at: Date.now(), updated_at: Date.now() }
    s.folders.push(f)
    saveStore(s)
    return f
  },

  async deleteFolder(id: string): Promise<{ ok: boolean }> {
    const s = loadStore()
    s.folders = s.folders.filter(f => f.id !== id)
    s.tasks = s.tasks.filter(t => t.folder_id !== id)
    saveStore(s)
    return { ok: true }
  },

  async task(id: string): Promise<TaskDetail> {
    const s = loadStore()
    const task = s.tasks.find(t => t.id === id)
    if (!task) throw new Error('task not found')
    const msgs = s.messages.filter(m => m.task_id === id).sort((a, b) => a.created_at - b.created_at)
    const skill = task.skill_id ? s.skills.find(sk => sk.id === task.skill_id) : null
    return {
      id: task.id, title: task.title, folder_id: task.folder_id,
      skill_id: task.skill_id, status: task.status, dot: task.dot, pinned: Boolean(task.pinned),
      messages: msgs,
      skill: skill ? { id: skill.id, name: skill.name, color: skill.color, icon: skill.icon } : null,
    }
  },

  async createTask(title: string, skill_id?: string, folder_id?: string): Promise<{ id: string }> {
    const s = loadStore()
    const id = 't_' + Date.now()
    s.tasks.push({ id, title, folder_id: folder_id || 'f_default', skill_id: skill_id || null, status: 'active', dot: '', created_at: Date.now(), updated_at: Date.now() })
    saveStore(s)
    return { id }
  },

  async createTaskWithMessages(title: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<{ id: string }> {
    const s = loadStore()
    const now = Date.now()
    const id = 't_' + now
    s.tasks.push({ id, title, folder_id: 'f_default', skill_id: null, status: 'active', dot: '', created_at: now, updated_at: now })
    s.messages.push(...messages.map((message, index) => ({
      id: `m_${now}_${index}`,
      task_id: id,
      role: message.role,
      content: message.content,
      trace: [],
      sources: [],
      feedback: null,
      created_at: now + index,
    })))
    saveStore(s)
    return { id }
  },

  async deleteTask(id: string): Promise<{ ok: boolean }> {
    const s = loadStore()
    s.tasks = s.tasks.filter(t => t.id !== id)
    s.messages = s.messages.filter(m => m.task_id !== id)
    saveStore(s)
    return { ok: true }
  },

  async renameTask(id: string, title: string): Promise<{ ok: boolean }> {
    const s = loadStore()
    const task = s.tasks.find(task => task.id === id)
    if (!task) throw new Error('task not found')
    task.title = title.trim()
    task.updated_at = Date.now()
    saveStore(s)
    return { ok: true }
  },

  async setTaskPinned(id: string, pinned: boolean): Promise<{ ok: boolean }> {
    const s = loadStore()
    const task = s.tasks.find(task => task.id === id)
    if (!task) throw new Error('task not found')
    task.pinned = pinned
    saveStore(s)
    return { ok: true }
  },

  async readTask(id: string): Promise<{ ok: boolean }> {
    const s = loadStore()
    const t = s.tasks.find(t => t.id === id)
    if (t) { t.dot = ''; saveStore(s) }
    return { ok: true }
  },

  async skills(): Promise<Skill[]> {
    const s = loadStore()
    mockAIResponse.skills = s.skills
    return s.skills
  },

  async connectors(): Promise<Connector[]> {
    return loadStore().connectors
  },

  async me(): Promise<{ authenticated: boolean; name: string; role: string }> {
    return { authenticated: false, name: '本地用户', role: '纯前端演示' }
  },

  async schedules(): Promise<Schedule[]> {
    return loadStore().schedules
  },

  async getPrefs() {
    return loadStore().prefs
  },

  async patchPrefs(patch: any) {
    const s = loadStore()
    s.prefs = { ...s.prefs, ...patch }
    saveStore(s)
    return s.prefs
  },

  async health() {
    return { ok: true, llm: false, model: 'local-mock' }
  },

  async setShare() {
    return { internal: false, external: false, visit_internal: 0, visit_external: 0, internal_url: '', external_url: null }
  },
}

export async function streamChat(
  taskId: string, message: string, skillId: string | undefined,
  h: { onUser?: (d: any) => void; onStart?: (d: any) => void; onTrace?: (d: any) => void; onDelta?: (d: { text: string }) => void; onDone?: (d: any) => void; onError?: (d: { message: string }) => void },
) {
  const s = loadStore()
  const task = s.tasks.find(t => t.id === taskId)
  if (!task) throw new Error('task not found')

  const userMsgId = 'm_' + Date.now()
  s.messages.push({ id: userMsgId, task_id: taskId, role: 'user', content: message, trace: [], sources: [], feedback: null, created_at: Date.now() })
  task.updated_at = Date.now()
  task.dot = 'amb'
  saveStore(s)

  h.onUser?.({ id: userMsgId, content: message })
  h.onStart?.({ id: 'asst_' + Date.now(), skill: { id: skillId || '', name: skillId || 'AI', color: '#2E90FA' } })

  await delay(300)

  let { content, trace, sources, app_preview } = mockAIResponse(message, skillId)

  const previousWebAppForExternalShare = [...s.messages]
    .reverse()
    .find(item => item.task_id === taskId && item.app_preview?.type === 'webapp')

  if (/做一个对外(?:链接|连接)/.test(message)) {
    // “做一个对外链接”始终是 WebApp 的发布动作，不再生成独立的分享页类型。
    // 当前会话已有 WebApp 时继续使用现有预览；从零触发时先补一个标准 WebApp 预览。
    app_preview = previousWebAppForExternalShare
      ? null
      : mockAIResponse('做一个WebApp', skillId).app_preview || null
    content = clampSpecialReply(`已开始为当前 WebApp 准备对外访问，访问范围已经设置为互联网可见。

互联网可见意味着拿到链接的人无需登录就能直接打开页面，因此首次生成链接之前需要走一次分享审核，确认页面里没有不适合对外展示的业务信息、个人隐私或内部标识，也确认数据口径与页面描述之间不存在误导。

请先在下方申请分享权限。提交之后会显示审核中，审批通过会自动进入发布流程，依次完成构建、打包和发布，结束后生成一条可复制的线上链接。在链接生成之前，页面仍然只在内部可见，不会有任何外部访问入口。

链接生成后地址是稳定的，同一版本可以反复分享，访问者打开后看到的是只读页面，不会进入当前这个对话。你也可以随时把访问范围切回企业内可见或指定人可见。

如果之后你改了 WebApp，右侧会出现提示卡片，询问是否把最新修改同步到线上；确认后会重新走一遍发布流程，页面内容更新，但链接不用重发。

审批结果出来我会第一时间同步给你。等待期间你可以继续调整页面内容，后续修改再同步到线上版本即可。`)
    trace = [
      { tool: 'prepare_external_access', connector: '分享引擎', label: '分享引擎 · prepare_external_access()', status: 'ok', ms: 180 },
    ]
  }

  if (!app_preview && /修改/.test(message)) {
    const previousWebApp = [...s.messages]
      .reverse()
      .find(item => item.task_id === taskId && item.app_preview?.type === 'webapp')
      ?.app_preview as KanbanPreview | undefined
    if (previousWebApp) {
      const nextTheme = previousWebApp.theme === 'violet' ? 'sand' : 'violet'
      app_preview = {
        ...previousWebApp,
        theme: nextTheme,
        revision: (previousWebApp.revision || 0) + 1,
      }
      content = `WebApp 已完成修改，我调整了整体主题色，右侧预览已更新。\n\n分享版本尚未同步，可在“分享产物”中确认并同步最新修改。`
      trace = [
        { tool: 'update_theme', connector: '应用引擎', label: `应用引擎 · update_theme(${nextTheme})`, status: 'ok', ms: 160 },
        { tool: 'render_preview', connector: '应用引擎', label: '应用引擎 · render_preview()', status: 'ok', ms: 120 },
      ]
    }
  }

  if (trace.length > 0) {
    for (const step of trace) {
      h.onTrace?.(step)
      await delay(200)
    }
  }

  for (let i = 0; i < content.length; i += 3) {
    h.onDelta?.({ text: content.slice(i, i + 3) })
    await delay(15)
  }

  const asstMsgId = 'm_' + (Date.now() + 1)
  s.messages.push({ id: asstMsgId, task_id: taskId, role: 'assistant', content, trace, sources, feedback: null, created_at: Date.now(), app_preview: app_preview || null })
  task.dot = 'blu'
  saveStore(s)

  h.onDone?.({ id: asstMsgId, content, trace, sources, app_preview: app_preview || null })
}

export async function streamQuickChat(
  messages: { role: string; content: string }[],
  h: { onDelta?: (t: string) => void; onDone?: (content: string) => void; onError?: (m: string) => void },
) {
  const lastMsg = messages[messages.length - 1]?.content || '你好'
  const { content } = mockAIResponse(lastMsg)
  for (let i = 0; i < content.length; i += 3) {
    h.onDelta?.(content.slice(i, i + 3))
    await delay(15)
  }
  h.onDone?.(content)
}

export class StreamDroppedError extends Error {
  constructor() { super('stream dropped'); this.name = 'StreamDroppedError' }
}

export interface Prefs { model: string; defaultMode: 'fast' | 'deep'; notifyEnabled: boolean; mutedScheduleIds: string[]; memoryEnabled: boolean }
