import { useState, useMemo } from 'react';

const PRIORITY_STYLES = {
  Critical: { bg: 'rgba(255,68,68,0.12)',   border: 'rgba(255,68,68,0.35)',   text: '#ff7b7b', dot: '#ff4444' },
  High:     { bg: 'rgba(255,149,0,0.12)',   border: 'rgba(255,149,0,0.35)',   text: '#ffaa33', dot: '#ff9500' },
  Medium:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)', text: '#f59e0b', dot: '#f59e0b' },
  Low:      { bg: 'rgba(90,122,154,0.1)',   border: 'rgba(90,122,154,0.25)', text: '#5a7a9a', dot: '#5a7a9a' },
};


const ALL_SOURCES = ['Technique Frequency', 'Cluster Analysis', 'MITRE Gap', 'Departmental Risk'];

function RecommendCard({ rec, index }) {
  const [expanded, setExpanded] = useState(false);
  const p = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.Low;

  return (
    <div style={{
      border: `1px solid ${expanded ? p.border : 'var(--border)'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
      backgroundColor: expanded ? p.bg : 'var(--bg-primary)',
    }}>
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px',
          textAlign: 'left',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.backgroundColor = p.bg; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {/* Index badge */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '5px', flexShrink: 0,
          backgroundColor: p.bg, border: `1px solid ${p.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: p.text, fontFamily: 'monospace',
        }}>
          {index + 1}
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {rec.title}
          </div>
          {/* Evidence line — visible even collapsed */}
          {rec.evidence && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-mono)' }}>{rec.source}</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span>{rec.evidence}</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
          <span style={{
            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace',
            backgroundColor: p.bg, border: `1px solid ${p.border}`, color: p.text,
          }}>{rec.priority}</span>
          <span style={{
            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace',
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}>{rec.control}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '2px' }}>
            {expanded ? '▲' : '▾'}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: `1px solid ${p.border}`,
          padding: '12px 14px 14px 54px',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {rec.detail}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecommendPanel({ data }) {
  const [priorityFilter, setPriorityFilter] = useState(null);
  const [sourceFilter, setSourceFilter]     = useState(null);

  if (!data) return null;
  const { recommendations, total } = data;
  const recs = recommendations || [];

  const counts = recs.reduce((acc, r) => {
    acc[r.priority] = (acc[r.priority] || 0) + 1;
    return acc;
  }, {});

  const sourceCounts = recs.reduce((acc, r) => {
    acc[r.source] = (acc[r.source] || 0) + 1;
    return acc;
  }, {});

  const filtered = useMemo(() => {
    return recs.filter(r => {
      if (priorityFilter && r.priority !== priorityFilter) return false;
      if (sourceFilter   && r.source   !== sourceFilter)   return false;
      return true;
    });
  }, [recs, priorityFilter, sourceFilter]);

  const criticalCount = counts.Critical || 0;
  const campaignCount = recs.filter(r => r.source === 'Cluster Analysis').length;
  const hasFilters = priorityFilter || sourceFilter;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header card */}
      <div style={{
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap',
      }}>
        {/* Title + summary sentence */}
        <div style={{ flex: 1, minWidth: '200px', paddingLeft: '12px', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Hardening Recommendations
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>
            {filtered.length}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
              action{filtered.length !== 1 ? 's' : ''}{hasFilters ? ' shown' : ''}
            </span>
          </div>
          {!hasFilters && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              {criticalCount > 0
                ? <><span style={{ color: '#ff7b7b', fontWeight: 600 }}>{criticalCount} critical action{criticalCount !== 1 ? 's' : ''}</span> require immediate attention.</>
                : 'No critical actions — review High priority items next.'
              }
              {campaignCount > 0 && <> {campaignCount} driven by active campaign analysis.</>}
            </div>
          )}
        </div>

        {/* Priority filter buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {['Critical', 'High', 'Medium', 'Low'].map(p => {
            const count = counts[p] || 0;
            if (!count) return null;
            const s = PRIORITY_STYLES[p];
            const active = priorityFilter === p;
            return (
              <button key={p}
                onClick={() => setPriorityFilter(active ? null : p)}
                style={{
                  textAlign: 'center', cursor: 'pointer', padding: '6px 12px',
                  borderRadius: '6px', border: `1px solid ${active ? s.border : 'var(--border)'}`,
                  backgroundColor: active ? s.bg : 'transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = s.border; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: s.text }}>{count}</div>
                <div style={{ fontSize: '10px', color: active ? s.text : 'var(--text-secondary)' }}>{p}</div>
              </button>
            );
          })}
        </div>

        {/* Source filter + clear */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {ALL_SOURCES.filter(s => sourceCounts[s] > 0).map(src => {
            const active = sourceFilter === src;
            return (
              <button key={src}
                onClick={() => setSourceFilter(active ? null : src)}
                style={{
                  fontSize: '10px', padding: '4px 9px', borderRadius: '5px', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(56,189,248,0.5)' : 'var(--border)'}`,
                  backgroundColor: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                  color: active ? '#38bdf8' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {src}
              </button>
            );
          })}
          {hasFilters && (
            <button
              onClick={() => { setPriorityFilter(null); setSourceFilter(null); }}
              style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '5px', cursor: 'pointer',
                border: '1px solid var(--border)', backgroundColor: 'transparent',
                color: 'var(--text-secondary)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b80'; e.currentTarget.style.color = '#f59e0b'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Recommendation cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '32px', textAlign: 'center',
            fontSize: '13px', color: 'var(--text-secondary)',
          }}>
            {recs.length === 0
              ? 'No recommendations generated. Upload incident data to run analysis.'
              : 'No recommendations match the current filters.'}
          </div>
        ) : (
          filtered.map((rec, i) => <RecommendCard key={i} rec={rec} index={i} />)
        )}
      </div>

    </div>
  );
}
