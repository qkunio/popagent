import type { WebpagePreview, WebpageSection } from '../types'

const THEME: Record<NonNullable<WebpagePreview['theme']>, {
  pageBg: string
  cardBg: string
  cardFg: string
  coverBg: string
  coverFg: string
  accentBg: string
  accentBgSoft: string
  accentFg: string
  accentFgSoft: string
  accentTagBg: string
  accentTagFg: string
  border: string
  divider: string
  kpiBadgeUp: string
  kpiBadgeDown: string
  calloutBg: string
  footerBg: string
}> = {
  sage: {
    pageBg: '#F3F8F4', cardBg: '#FFFFFF', cardFg: '#1F2937',
    coverBg: 'linear-gradient(135deg, #116548 0%, #1F8A61 55%, #43B17E 100%)',
    coverFg: '#FFFFFF',
    accentBg: '#1F8A61', accentBgSoft: '#E3F2E9', accentFg: '#116548', accentFgSoft: '#2F7F58',
    accentTagBg: '#1F8A61', accentTagFg: '#FFFFFF',
    border: '#DDEAE1', divider: '#E5EDE8',
    kpiBadgeUp: '#1F8A61', kpiBadgeDown: '#C2410C',
    calloutBg: '#E8F3EC',
    footerBg: '#EAF4ED',
  },
  lilac: {
    pageBg: '#F7F4FD', cardBg: '#FFFFFF', cardFg: '#1F2937',
    coverBg: 'linear-gradient(135deg, #4C28B5 0%, #6E3CE0 55%, #9B78F0 100%)',
    coverFg: '#FFFFFF',
    accentBg: '#6E3CE0', accentBgSoft: '#EEE7FB', accentFg: '#4C28B5', accentFgSoft: '#5B3BB9',
    accentTagBg: '#6E3CE0', accentTagFg: '#FFFFFF',
    border: '#E7E0F7', divider: '#EEE8FA',
    kpiBadgeUp: '#5B3BB9', kpiBadgeDown: '#C2410C',
    calloutBg: '#EEE9FB',
    footerBg: '#F0EBFC',
  },
  coral: {
    pageBg: '#FCF3EC', cardBg: '#FFFFFF', cardFg: '#1F2937',
    coverBg: 'linear-gradient(135deg, #C2410C 0%, #EA580C 55%, #FB923C 100%)',
    coverFg: '#FFFFFF',
    accentBg: '#EA580C', accentBgSoft: '#FCE7D3', accentFg: '#9A3412', accentFgSoft: '#C2410C',
    accentTagBg: '#EA580C', accentTagFg: '#FFFFFF',
    border: '#F3DFCB', divider: '#F7E7D6',
    kpiBadgeUp: '#15803D', kpiBadgeDown: '#C2410C',
    calloutBg: '#FCE9D7',
    footerBg: '#FBEEDD',
  },
  sky: {
    pageBg: '#EFF5FA', cardBg: '#FFFFFF', cardFg: '#1F2937',
    coverBg: 'linear-gradient(135deg, #0E62A7 0%, #0B82C9 55%, #38BDF8 100%)',
    coverFg: '#FFFFFF',
    accentBg: '#0B82C9', accentBgSoft: '#DEEDF9', accentFg: '#0C4A6E', accentFgSoft: '#076AA8',
    accentTagBg: '#0B82C9', accentTagFg: '#FFFFFF',
    border: '#D7E5F0', divider: '#E2EDF5',
    kpiBadgeUp: '#0B82C9', kpiBadgeDown: '#C2410C',
    calloutBg: '#DDEBF7',
    footerBg: '#E5EFF7',
  },
}

export function SharePagePreview({ data }: { data: WebpagePreview }) {
  const t = THEME[data.theme] || THEME.sky
  return (
    <div className="sp-wrap" style={{ background: t.pageBg }}>
      <article className="sp-card" style={{ background: t.cardBg, color: t.cardFg }}>
        {/* 封面 */}
        <header className="sp-cover" style={{ background: t.coverBg, color: t.coverFg }}>
          <div className="sp-cover-row">
            <span className="sp-eyebrow" style={{ background: 'rgba(255,255,255,.16)', color: t.coverFg }}>
              {data.cover.eyebrow}
            </span>
            <span className="sp-external-badge" style={{ background: 'rgba(255,255,255,.20)', color: t.coverFg }}>
              {data.cover.shareMeta.external ? '🌐 外部可访问' : '🔒 仅内部'}
            </span>
          </div>
          <h1 className="sp-title" style={{ color: t.coverFg }}>{data.cover.title}</h1>
          <p className="sp-subtitle" style={{ color: 'rgba(255,255,255,.88)' }}>
            {data.cover.subtitle}
          </p>
          <div className="sp-tags">
            {data.cover.tags.map((tg, i) => (
              <span key={i} className="sp-tag" style={{
                background: 'rgba(255,255,255,.14)',
                color: t.coverFg,
                border: '1px solid rgba(255,255,255,.20)',
              }}>#{tg}</span>
            ))}
          </div>
          <div className="sp-meta" style={{ color: 'rgba(255,255,255,.86)' }}>
            <span>✍ {data.cover.shareMeta.by}</span>
            <span>·</span>
            <span>{data.cover.shareMeta.at}</span>
            <span>·</span>
            <span>👁 阅读 {data.cover.shareMeta.reads}</span>
          </div>
        </header>

        {/* 摘要 */}
        <section className="sp-summary" style={{ borderColor: t.border }}>
          <div className="sp-summary-mark" style={{ background: t.accentBg }} />
          <p className="sp-summary-text" style={{ color: t.accentFg }}>{data.summary}</p>
        </section>

        {/* KPI 区（从第一个 section 取 kpis，如果有） */}
        {data.sections.some(s => s.kpis && s.kpis.length > 0) && (
          <section className="sp-kpis">
            {(data.sections.find(s => s.kpis && s.kpis.length > 0)?.kpis || []).map((k, i) => (
              <div key={i} className="sp-kpi" style={{ borderColor: t.border, background: t.cardBg }}>
                <div className="sp-kpi-label" style={{ color: '#646A73' }}>{k.label}</div>
                <div className="sp-kpi-value" style={{ color: t.cardFg }}>{k.value}</div>
                {k.delta && (
                  <div className={'sp-kpi-badge ' + (k.badge === 'down' ? 'down' : 'up')}
                    style={{
                      color: k.badge === 'down' ? '#FFFFFF' : '#FFFFFF',
                      background: k.badge === 'down' ? t.kpiBadgeDown : t.kpiBadgeUp,
                    }}>
                    {k.badge === 'down' ? '↓' : '↑'} {k.delta}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* 分节 */}
        <div className="sp-sections">
          {data.sections.map((s) => <ShareSection key={s.id} s={s} theme={t} />)}
        </div>

        {/* Callout */}
        <section className="sp-callout" style={{ background: t.calloutBg, borderColor: t.accentBg }}>
          <div className="sp-callout-head" style={{ color: t.accentFg }}>
            <span className="sp-callout-ic" style={{ background: t.accentBg, color: '#FFFFFF' }}>✦</span>
            <span className="sp-callout-label">{data.callout.label}</span>
          </div>
          <p className="sp-callout-body" style={{ color: t.cardFg }}>{data.callout.body}</p>
          <button type="button" className="sp-callout-cta"
            style={{ background: t.accentBg, color: '#FFFFFF' }}>
            {data.callout.cta}
            <span className="sp-callout-arrow">→</span>
          </button>
        </section>

        {/* Footer + 二维码占位 */}
        <footer className="sp-footer" style={{ background: t.footerBg, borderColor: t.border }}>
          <div className="sp-foot-main">
            <div className="sp-foot-logo" style={{
              background: t.accentBg, color: '#FFFFFF',
              boxShadow: `0 0 0 6px ${t.accentBgSoft}`,
            }}>🅿</div>
            <div className="sp-foot-texts">
              <div className="sp-foot-note" style={{ color: t.accentFgSoft }}>{data.footer.note}</div>
              <a href={data.footer.share_url} target="_blank" rel="noreferrer noopener"
                className="sp-foot-url" style={{ color: t.accentFg }}>
                {data.footer.share_url}
              </a>
            </div>
          </div>
          <div className="sp-foot-qr">
            <div className="sp-qr-box" style={{ borderColor: t.border, background: '#FFFFFF' }}>
              <div className="sp-qr-grid"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, ${t.accentBg} 0 2px, transparent 2px 4px), repeating-linear-gradient(90deg, ${t.accentBg} 0 2px, transparent 2px 4px)`,
                  backgroundBlendMode: 'multiply',
                  opacity: 0.85,
                }}
              />
              <div className="sp-qr-center" style={{ background: '#FFFFFF', color: t.accentFg }}>🅿</div>
            </div>
            <div className="sp-qr-cap" style={{ color: t.accentFgSoft }}>{data.footer.qr_caption}</div>
          </div>
        </footer>
      </article>
    </div>
  )
}

function ShareSection({ s, theme: t }: { s: WebpageSection; theme: typeof THEME['sage'] }) {
  const accentBg = s.accent && THEME[s.accent] ? THEME[s.accent].accentBg : t.accentBg
  const accentBgSoft = s.accent && THEME[s.accent] ? THEME[s.accent].accentBgSoft : t.accentBgSoft
  const accentFg = s.accent && THEME[s.accent] ? THEME[s.accent].accentFg : t.accentFg
  return (
    <section className="sp-section" style={{ borderColor: t.border }}>
      <header className="sp-sec-head">
        <span className="sp-sec-pill" style={{ background: accentBgSoft, color: accentFg }}>
          <span className="sp-sec-dot" style={{ background: accentBg }} />
          章节
        </span>
        <h3 className="sp-sec-title" style={{ color: t.cardFg }}>{s.title}</h3>
        {s.lead && <p className="sp-sec-lead" style={{ color: '#4E5969' }}>{s.lead}</p>}
      </header>

      {s.kpis && s.kpis.length > 0 && (
        <div className="sp-sec-kpis">
          {s.kpis.map((k, i) => (
            <div key={i} className="sp-sec-kpi" style={{ borderColor: t.divider }}>
              <div className="sp-sec-kpi-label" style={{ color: '#646A73' }}>{k.label}</div>
              <div className="sp-sec-kpi-value" style={{ color: accentFg }}>{k.value}</div>
              {k.delta && (
                <div className={'sp-kpi-badge sm ' + (k.badge === 'down' ? 'down' : 'up')}
                  style={{
                    color: '#FFFFFF',
                    background: k.badge === 'down' ? t.kpiBadgeDown : t.kpiBadgeUp,
                  }}>
                  {k.badge === 'down' ? '↓' : '↑'} {k.delta}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {s.body && <p className="sp-sec-body" style={{ color: '#272E3B' }}>{s.body}</p>}

      {s.bullets && s.bullets.length > 0 && (
        <ul className="sp-sec-bullets">
          {s.bullets.map((b, i) => (
            <li key={i} className="sp-sec-bullet-row" style={{ color: '#272E3B' }}>
              <span className="sp-bullet-mark" style={{ background: accentBg, color: '#FFFFFF' }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
