import { useMemo, useState } from 'react'
import { Icon, useToast } from '../components/Icon'

type SecurityLevel = 'L1' | 'L2' | 'L3'

interface DataField {
  label: string
  meaning: string
  level: SecurityLevel
}

interface DataEntity {
  id: string
  name: string
  fields: DataField[]
}

const ENTITIES: DataEntity[] = [
  {
    id: 'author',
    name: '作者',
    fields: [
      { label: '抖音号', level: 'L1', meaning: '作者在抖音使用的公开账号标识。' },
      { label: '头像', level: 'L1', meaning: '作者在抖音展示的头像。' },
      { label: '账号类型', level: 'L1', meaning: '作者账号所属的内容类型。' },
      { label: '活跃粉丝', level: 'L2', meaning: '近期与作者内容产生互动的粉丝规模。' },
      { label: '活跃粉丝占比', level: 'L2', meaning: '活跃粉丝占全部粉丝的比例。' },
      { label: '平均播放量', level: 'L2', meaning: '作者近期作品的平均播放表现。' },
      { label: '评论量', level: 'L2', meaning: '作者近期收到的评论总量。' },
      { label: '运营垂类', level: 'L3', meaning: '作者当前归属的运营垂类。' },
      { label: '质量等级', level: 'L3', meaning: '平台对作者内容质量的综合分层。' },
      { label: '二确状态', level: 'L3', meaning: '作者当前的二次确认状态。' },
      { label: '二确操作人', level: 'L3', meaning: '最近完成二次确认的运营人员。' },
    ],
  },
  {
    id: 'item',
    name: '作品',
    fields: [
      { label: '内容类型', level: 'L1', meaning: '作品所属的内容形态。' },
      { label: '封面', level: 'L1', meaning: '作品对外展示的封面。' },
      { label: '参与话题', level: 'L1', meaning: '作品参与的话题或挑战。' },
      { label: '当日评论量', level: 'L2', meaning: '作品当天获得的评论量。' },
      { label: '累计评论量', level: 'L2', meaning: '作品发布后累计获得的评论量。' },
      { label: '评论人数', level: 'L2', meaning: '对作品发表评论的用户数量。' },
      { label: '点赞量', level: 'L2', meaning: '作品累计获得的点赞量。' },
      { label: '广告状态', level: 'L3', meaning: '作品是否含有广告及其当前状态。' },
      { label: '版权风险', level: 'L3', meaning: '作品可能存在的版权风险程度。' },
      { label: '作者质量', level: 'L3', meaning: '投稿作者的内容质量分层。' },
      { label: '实验分组', level: 'L3', meaning: '作品作者所在的平台实验分组。' },
    ],
  },
  {
    id: 'category',
    name: '垂类',
    fields: [
      { label: '垂类名称', level: 'L1', meaning: '内容垂类对外使用的名称。' },
      { label: '垂类说明', level: 'L1', meaning: '内容垂类的业务范围说明。' },
      { label: '上级垂类', level: 'L3', meaning: '当前垂类在分类体系中的上级节点。' },
      { label: '垂类层级', level: 'L3', meaning: '垂类在分类体系中的层级。' },
      { label: '重点垂类', level: 'L3', meaning: '该垂类是否属于重点运营范围。' },
    ],
  },
  {
    id: 'grid',
    name: '格子',
    fields: [
      { label: '格子名称', level: 'L3', meaning: '精细化运营单元的名称。' },
      { label: '所属垂类', level: 'L3', meaning: '格子当前归属的内容垂类。' },
      { label: '运营状态', level: 'L3', meaning: '格子当前是否处于正常运营状态。' },
    ],
  },
]

const DESC_LIMIT = 15
const MAX_SELECT = 10

const fieldKey = (entity: DataEntity, field: DataField) => entity.id + ':' + field.label

function shortDesc(text: string) {
  return text.length > DESC_LIMIT ? text.slice(0, DESC_LIMIT) + '...' : text
}

export function DataOverviewView() {
  const [entityId, setEntityId] = useState(ENTITIES[0].id)
  const [query, setQuery] = useState('')
  const [fieldDetail, setFieldDetail] = useState<DataField | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyQuery, setApplyQuery] = useState('')
  const [pending, setPending] = useState<string[]>([])
  const [granted, setGranted] = useState<string[]>([])
  const toast = useToast()

  const entity = ENTITIES.find(item => item.id === entityId) ?? ENTITIES[0]
  const fields = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return entity.fields
    return entity.fields.filter(field =>
      field.label.toLowerCase().includes(keyword) || field.meaning.toLowerCase().includes(keyword),
    )
  }, [entity, query])

  const isGranted = (key: string) => granted.includes(key)
  const addPending = (key: string) => {
    setPending(current => {
      if (current.includes(key)) return current
      if (current.length >= MAX_SELECT) {
        toast(`一次最多选择 ${MAX_SELECT} 个字段`)
        return current
      }
      return [...current, key]
    })
  }
  const removePending = (key: string) => setPending(current => current.filter(item => item !== key))
  const openApply = (field: DataField) => {
    setApplyQuery('')
    setPending([fieldKey(entity, field)])
    setApplyOpen(true)
  }
  const closeApply = () => { setApplyOpen(false); setPending([]); setApplyQuery('') }

  const pendingGroups = useMemo(() => ENTITIES
    .map(item => ({ entity: item, fields: item.fields.filter(field => pending.includes(fieldKey(item, field))) }))
    .filter(group => group.fields.length > 0), [pending])

  const applyResults = useMemo(() => {
    const keyword = applyQuery.trim().toLowerCase()
    if (!keyword) return []
    const hits: Array<{ entity: DataEntity; field: DataField; key: string }> = []
    ENTITIES.forEach(item => item.fields.forEach(field => {
      if (field.level === 'L1') return
      const key = fieldKey(item, field)
      if (isGranted(key) || pending.includes(key)) return
      if (field.label.toLowerCase().includes(keyword) || field.meaning.toLowerCase().includes(keyword) || item.name.includes(keyword)) {
        hits.push({ entity: item, field, key })
      }
    }))
    return hits.slice(0, 20)
  }, [applyQuery, pending, granted])

  const atLimit = pending.length >= MAX_SELECT

  return (
    <section className="view on data-overview-view">
      <header className="apps-page-top"><h1>数据概览</h1></header>
      <div className="data-page-scroll">
        <div className="data-page-content">
          <label className="data-search">
            <Icon name="magnifying-glass" cls="ic" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索字段" />
          </label>

          <nav className="data-entities" aria-label="数据实体">
            {ENTITIES.map(item => (
              <button key={item.id} type="button" className={item.id === entity.id ? 'on' : ''} onClick={() => setEntityId(item.id)}>
                {item.name}
              </button>
            ))}
          </nav>

          <div className="data-domain-table">
            <div className="data-domain-head" aria-hidden="true">
              <span>字段</span><span>描述</span><span>密级</span><span>权限</span>
            </div>
            {fields.map(field => (
              <article className="data-domain" key={field.label}>
                <div
                  className="data-domain-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setFieldDetail(field)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setFieldDetail(field)
                    }
                  }}
                >
                  <span className="data-field-name"><strong>{field.label}</strong></span>
                  <span className="data-field-desc" title={field.meaning}>{shortDesc(field.meaning)}</span>
                  <span className={'data-level ' + field.level.toLowerCase()}>{field.level}</span>
                  {field.level === 'L1' || isGranted(fieldKey(entity, field)) ? (
                    <span className="data-access available"><Icon name="shield-check" cls="ic-s ic" />可用</span>
                  ) : (
                    <button
                      type="button"
                      className="data-access apply"
                      onClick={event => { event.stopPropagation(); openApply(field) }}
                    >
                      <Icon name="lock" cls="ic-s ic" />申请
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!fields.length && <div className="data-empty">没有匹配的数据</div>}
          </div>
        </div>
      </div>

      {fieldDetail && (
        <div className="data-modal-mask" onMouseDown={event => { if (event.target === event.currentTarget) setFieldDetail(null) }}>
          <div className="data-modal" role="dialog" aria-modal="true" aria-labelledby="data-field-title">
            <header>
              <h2 id="data-field-title">{fieldDetail.label}</h2>
              <button type="button" aria-label="关闭" onClick={() => setFieldDetail(null)}><Icon name="x" cls="ic" /></button>
            </header>
            <div className="data-modal-content">
              <span>字段含义</span><p>{fieldDetail.meaning}</p>
              <span>数据密级</span><p>{fieldDetail.level}</p>
            </div>
            <footer><button type="button" className="data-primary" onClick={() => setFieldDetail(null)}>知道了</button></footer>
          </div>
        </div>
      )}

      {applyOpen && (
        <div className="data-modal-mask" onMouseDown={event => { if (event.target === event.currentTarget) closeApply() }}>
          <div className="data-modal data-apply-dialog" role="dialog" aria-modal="true" aria-labelledby="data-apply-title">
            <header>
              <span className="data-apply-lock"><Icon name="lock" cls="ic" /></span>
              <h2 id="data-apply-title">{pending.length} 个字段需要申请权限</h2>
              <span className="data-apply-count">{pending.length}/{MAX_SELECT}</span>
              <button type="button" aria-label="关闭" onClick={closeApply}><Icon name="x" cls="ic" /></button>
            </header>

            <div className="data-apply-groups">
              {pendingGroups.map(group => (
                <div className="data-apply-group" key={group.entity.id}>
                  <span className="data-apply-entity">{group.entity.name}</span>
                  <div className="data-apply-chips">
                    {group.fields.map(field => (
                      <button
                        type="button"
                        key={field.label}
                        title="移除"
                        onClick={() => removePending(fieldKey(group.entity, field))}
                      >
                        {field.label}<Icon name="x" cls="ic-s ic" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!pendingGroups.length && <div className="data-apply-blank">还没有选择字段，搜索并添加</div>}
            </div>

            <div className="data-apply-picker">
              <label className="data-search">
                <Icon name="magnifying-glass" cls="ic" />
                <input
                  value={applyQuery}
                  onChange={event => setApplyQuery(event.target.value)}
                  placeholder={atLimit ? `已达上限 ${MAX_SELECT} 个字段` : '搜索并添加其他字段'}
                  disabled={atLimit}
                />
              </label>
              {applyQuery.trim() && (
                <div className="data-apply-results">
                  {applyResults.map(item => (
                    <button type="button" key={item.key} onClick={() => addPending(item.key)}>
                      <span className="data-apply-result-entity">{item.entity.name}</span>
                      <strong>{item.field.label}</strong>
                      <span className={'data-level ' + item.field.level.toLowerCase()}>{item.field.level}</span>
                      <Icon name="plus" cls="ic-s ic" />
                    </button>
                  ))}
                  {!applyResults.length && <div className="data-apply-blank">没有可添加的字段</div>}
                </div>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="data-primary"
                onClick={() => {
                  setGranted(current => Array.from(new Set([...current, ...pending])))
                  toast(`已提交 ${pending.length} 个字段的权限申请`)
                  closeApply()
                }}
                disabled={!pending.length}
              >
                申请权限<Icon name="export" cls="ic-s ic" />
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}
