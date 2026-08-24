import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'

type SecurityLevel = 'L1' | 'L2' | 'L3'

interface DataField {
  label: string
  meaning: string
}

interface BusinessDomain {
  id: string
  name: string
  level: SecurityLevel
  fields: DataField[]
}

interface DataEntity {
  id: string
  name: string
  domains: BusinessDomain[]
}

const ENTITIES: DataEntity[] = [
  {
    id: 'author',
    name: '作者',
    domains: [
      {
        id: 'author-profile',
        name: '基础身份',
        level: 'L1',
        fields: [
          { label: '抖音号', meaning: '作者在抖音使用的公开账号标识。' },
          { label: '头像', meaning: '作者在抖音展示的头像。' },
          { label: '账号类型', meaning: '作者账号所属的内容类型。' },
        ],
      },
      {
        id: 'author-performance',
        name: '粉丝与播放表现',
        level: 'L2',
        fields: [
          { label: '活跃粉丝', meaning: '近期与作者内容产生互动的粉丝规模。' },
          { label: '活跃粉丝占比', meaning: '活跃粉丝占全部粉丝的比例。' },
          { label: '平均播放量', meaning: '作者近期作品的平均播放表现。' },
          { label: '评论量', meaning: '作者近期收到的评论总量。' },
        ],
      },
      {
        id: 'author-operation',
        name: '运营分层',
        level: 'L3',
        fields: [
          { label: '运营垂类', meaning: '作者当前归属的运营垂类。' },
          { label: '质量等级', meaning: '平台对作者内容质量的综合分层。' },
          { label: '二确状态', meaning: '作者当前的二次确认状态。' },
          { label: '二确操作人', meaning: '最近完成二次确认的运营人员。' },
        ],
      },
    ],
  },
  {
    id: 'item',
    name: '作品',
    domains: [
      {
        id: 'item-content',
        name: '内容基础',
        level: 'L1',
        fields: [
          { label: '内容类型', meaning: '作品所属的内容形态。' },
          { label: '封面', meaning: '作品对外展示的封面。' },
          { label: '参与话题', meaning: '作品参与的话题或挑战。' },
        ],
      },
      {
        id: 'item-engagement',
        name: '互动表现',
        level: 'L2',
        fields: [
          { label: '当日评论量', meaning: '作品当天获得的评论量。' },
          { label: '累计评论量', meaning: '作品发布后累计获得的评论量。' },
          { label: '评论人数', meaning: '对作品发表评论的用户数量。' },
          { label: '点赞量', meaning: '作品累计获得的点赞量。' },
        ],
      },
      {
        id: 'item-governance',
        name: '内容治理',
        level: 'L3',
        fields: [
          { label: '广告状态', meaning: '作品是否含有广告及其当前状态。' },
          { label: '版权风险', meaning: '作品可能存在的版权风险程度。' },
          { label: '作者质量', meaning: '投稿作者的内容质量分层。' },
          { label: '实验分组', meaning: '作品作者所在的平台实验分组。' },
        ],
      },
    ],
  },
  {
    id: 'category',
    name: '垂类',
    domains: [
      {
        id: 'category-label',
        name: '公开分类',
        level: 'L1',
        fields: [
          { label: '垂类名称', meaning: '内容垂类对外使用的名称。' },
          { label: '垂类说明', meaning: '内容垂类的业务范围说明。' },
        ],
      },
      {
        id: 'category-operation',
        name: '运营结构',
        level: 'L3',
        fields: [
          { label: '上级垂类', meaning: '当前垂类在分类体系中的上级节点。' },
          { label: '垂类层级', meaning: '垂类在分类体系中的层级。' },
          { label: '重点垂类', meaning: '该垂类是否属于重点运营范围。' },
        ],
      },
    ],
  },
  {
    id: 'grid',
    name: '格子',
    domains: [
      {
        id: 'grid-operation',
        name: '格子运营',
        level: 'L3',
        fields: [
          { label: '格子名称', meaning: '精细化运营单元的名称。' },
          { label: '所属垂类', meaning: '格子当前归属的内容垂类。' },
          { label: '运营状态', meaning: '格子当前是否处于正常运营状态。' },
        ],
      },
    ],
  },
]

export function DataOverviewView() {
  const [entityId, setEntityId] = useState(ENTITIES[0].id)
  const [query, setQuery] = useState('')
  const [expandedDomainId, setExpandedDomainId] = useState('')
  const [fieldDetail, setFieldDetail] = useState<{ domain: BusinessDomain; field: DataField } | null>(null)
  const [applyingDomain, setApplyingDomain] = useState<BusinessDomain | null>(null)

  const entity = ENTITIES.find(item => item.id === entityId) ?? ENTITIES[0]
  const domains = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return entity.domains
    return entity.domains.filter(domain =>
      domain.name.toLowerCase().includes(keyword)
      || domain.fields.some(field => field.label.toLowerCase().includes(keyword) || field.meaning.toLowerCase().includes(keyword)),
    )
  }, [entity, query])

  const selectEntity = (id: string) => {
    setEntityId(id)
    setExpandedDomainId('')
  }

  return (
    <section className="view on data-overview-view">
      <header className="apps-page-top"><h1>数据概览</h1></header>
      <div className="data-page-scroll">
        <div className="data-page-content">
          <label className="data-search">
            <Icon name="magnifying-glass" cls="ic" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索业务域或字段" />
          </label>

          <nav className="data-entities" aria-label="数据实体">
            {ENTITIES.map(item => (
              <button key={item.id} type="button" className={item.id === entity.id ? 'on' : ''} onClick={() => selectEntity(item.id)}>
                {item.name}
              </button>
            ))}
          </nav>

          <div className="data-domain-table">
            <div className="data-domain-head" aria-hidden="true">
              <span>业务域</span><span>密级</span><span>权限</span>
            </div>
            {domains.map(domain => {
              const expanded = expandedDomainId === domain.id
              return (
                <article className="data-domain" key={domain.id}>
                  <div className="data-domain-row">
                    <button
                      type="button"
                      className="data-domain-toggle"
                      aria-expanded={expanded}
                      onClick={() => setExpandedDomainId(expanded ? '' : domain.id)}
                    >
                      <Icon name={expanded ? 'caret-down' : 'caret-right'} cls="ic-s ic" />
                      <strong>{domain.name}</strong>
                    </button>
                    <span className={'data-level ' + domain.level.toLowerCase()}>{domain.level}</span>
                    {domain.level === 'L1' ? (
                      <span className="data-access available"><Icon name="shield-check" cls="ic-s ic" />可用</span>
                    ) : (
                      <button type="button" className="data-access apply" onClick={() => setApplyingDomain(domain)}>
                        <Icon name="lock" cls="ic-s ic" />申请
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <div className="data-fields">
                      {domain.fields.map(field => (
                        <button type="button" key={field.label} onClick={() => setFieldDetail({ domain, field })}>
                          {field.label}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
            {!domains.length && <div className="data-empty">没有匹配的数据</div>}
          </div>
        </div>
      </div>

      {fieldDetail && (
        <div className="data-modal-mask" onMouseDown={event => { if (event.target === event.currentTarget) setFieldDetail(null) }}>
          <div className="data-modal" role="dialog" aria-modal="true" aria-labelledby="data-field-title">
            <header>
              <h2 id="data-field-title">{fieldDetail.field.label}</h2>
              <button type="button" aria-label="关闭" onClick={() => setFieldDetail(null)}><Icon name="x" cls="ic" /></button>
            </header>
            <div className="data-modal-content">
              <span>字段含义</span><p>{fieldDetail.field.meaning}</p>
              <span>所属业务域</span><p>{fieldDetail.domain.name}</p>
            </div>
            <footer><button type="button" className="data-primary" onClick={() => setFieldDetail(null)}>知道了</button></footer>
          </div>
        </div>
      )}

      {applyingDomain && (
        <div className="data-modal-mask" onMouseDown={event => { if (event.target === event.currentTarget) setApplyingDomain(null) }}>
          <div className="data-modal" role="dialog" aria-modal="true" aria-labelledby="data-apply-title">
            <header>
              <h2 id="data-apply-title">申请 {applyingDomain.level} 数据权限</h2>
              <button type="button" aria-label="关闭" onClick={() => setApplyingDomain(null)}><Icon name="x" cls="ic" /></button>
            </header>
            <div className="data-modal-content">
              <span>数据范围</span><p>{entity.name} · {applyingDomain.name}</p>
              <span>审批方式</span><p>{applyingDomain.level === 'L2' ? '告知直属负责人' : '直属负责人审批'}</p>
            </div>
            <footer>
              <button type="button" className="data-secondary" onClick={() => setApplyingDomain(null)}>取消</button>
              <button type="button" className="data-primary" onClick={() => setApplyingDomain(null)}>确认范围</button>
            </footer>
          </div>
        </div>
      )}
    </section>
  )
}
