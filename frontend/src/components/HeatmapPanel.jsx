import { useState, useMemo } from 'react';

const SEVERITY_ORDER = ['High', 'Medium', 'Low', 'Informational'];
const SEVERITY_COLORS = {
  High:          '#ff7b7b',
  Medium:        '#ffaa33',
  Low:           '#f59e0b',
  Informational: '#5a7a9a',
};

function riskLevel(pct) {
  if (pct >= 75) return { label: 'Critical', color: '#ff4444' };
  if (pct >= 50) return { label: 'High',     color: '#ff7b7b' };
  if (pct >= 25) return { label: 'Medium',   color: '#ffaa33' };
  return              { label: 'Low',      color: '#f59e0b' };
}

function RiskBar({ score, maxScore }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const { color } = riskLevel(pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '11px', fontFamily: 'monospace', color, minWidth: '28px', textAlign: 'right' }}>{score}</span>
    </div>
  );
}

function SevPips({ breakdown }) {
  return (
    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
      {SEVERITY_ORDER.map(sev => {
        const count = breakdown[sev] || 0;
        if (count === 0) return null;
        return (
          <span key={sev} style={{
            padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
            backgroundColor: `${SEVERITY_COLORS[sev]}18`,
            border: `1px solid ${SEVERITY_COLORS[sev]}44`,
            color: SEVERITY_COLORS[sev],
          }}>
            {sev[0]} {count}
          </span>
        );
      })}
    </div>
  );
}

function SortHeader({ label, col, sortCol, sortDir, onSort, style }) {
  const active = sortCol === col;
  return (
    <button
      onClick={() => onSort(col)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: '4px',
        ...style,
      }}
    >
      {label}
      <span style={{ fontSize: '9px', opacity: active ? 1 : 0.3 }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '▾'}
      </span>
    </button>
  );
}

function DeptRow({ dept, rank, maxScore, allIncidents, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const pct = maxScore > 0 ? (dept.risk_score / maxScore) * 100 : 0;
  const { label: riskLabel, color: riskColor } = riskLevel(pct);

  const deptIncidents = useMemo(() => {
    if (!allIncidents) return [];
    const ids = new Set(dept.incident_ids);
    return allIncidents.filter(inc => ids.has(inc.IncidentId));
  }, [allIncidents, dept.incident_ids]);

  return (
    <>
      {/* Main row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 190px 48px 1fr 220px 200px 28px',
          alignItems: 'center',
          gap: '14px',
          padding: '10px 16px',
          borderBottom: isLast && !expanded ? 'none' : '1px solid var(--border)',
          transition: 'background 0.12s',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = riskColor + '08'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {/* Rank */}
        <span style={{
          width: '22px', height: '22px', borderRadius: '4px',
          fontSize: '10px', fontWeight: 700, fontFamily: 'monospace',
          backgroundColor: rank === 1 ? 'rgba(255,68,68,0.15)' : rank <= 3 ? 'rgba(255,170,51,0.12)' : 'var(--border)',
          color: rank === 1 ? '#ff4444' : rank <= 3 ? '#ffaa33' : 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{rank}</span>

        {/* Dept name + risk level label */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dept.name}
          </div>
          <div style={{ fontSize: '10px', color: riskColor, fontWeight: 600, marginTop: '1px' }}>{riskLabel} risk</div>
        </div>

        {/* Total incidents */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', lineHeight: 1 }}>{dept.total}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '1px' }}>incidents</div>
        </div>

        {/* Risk bar */}
        <RiskBar score={dept.risk_score} maxScore={maxScore} />

        {/* Severity pips */}
        <SevPips breakdown={dept.severity_breakdown} />

        {/* Top techniques */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {dept.top_techniques.slice(0, 3).map(t => (
            <span key={t} style={{
              padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontFamily: 'monospace',
              backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7',
            }}>{t}</span>
          ))}
        </div>

        {/* Expand toggle */}
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
          {expanded ? '▲' : '▾'}
        </span>
      </div>

      {/* Expanded: incident list */}
      {expanded && (
        <div style={{
          borderBottom: isLast ? 'none' : '1px solid var(--border)',
          padding: '12px 16px 16px',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Incidents in {dept.name} ({deptIncidents.length})
          </div>
          {deptIncidents.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No incident details available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {deptIncidents
                .sort((a, b) => {
                  const order = { High: 0, Medium: 1, Low: 2, Informational: 3 };
                  return (order[a.Severity] ?? 4) - (order[b.Severity] ?? 4);
                })
                .map(inc => {
                  const sc = SEVERITY_COLORS[inc.Severity] || '#6b7280';
                  return (
                    <div key={inc.IncidentId} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '6px 10px', borderRadius: '6px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)',
                    }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, fontFamily: 'monospace',
                        color: sc, backgroundColor: sc + '18',
                        padding: '1px 6px', borderRadius: '3px', flexShrink: 0,
                      }}>{inc.Severity}</span>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', flexShrink: 0 }}>{inc.IncidentId}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.Title || '—'}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function HeatmapPanel({ data, allIncidents }) {
  const [sortCol, setSortCol] = useState('risk');
  const [sortDir, setSortDir] = useState('desc');

  if (!data) return null;
  const { departments, max_risk_score, total_departments, unassigned_count } = data;

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir(col === 'name' ? 'asc' : 'desc'); }
  };

  const sorted = useMemo(() => {
    return [...departments].sort((a, b) => {
      let av, bv;
      if (sortCol === 'risk')      { av = a.risk_score; bv = b.risk_score; }
      else if (sortCol === 'total') { av = a.total;      bv = b.total; }
      else                          { av = a.name;       bv = b.name; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [departments, sortCol, sortDir]);

  // Summary stats
  const totalIncidents = departments.reduce((s, d) => s + d.total, 0);
  const highRiskDepts  = departments.filter(d => (d.risk_score / max_risk_score) >= 0.5).length;
  const topDept        = departments[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          {
            label: 'Highest Risk',
            value: topDept?.name ?? '—',
            sub: topDept ? `Risk score ${topDept.risk_score}` : '',
            color: '#ff7b7b',
          },
          {
            label: 'Departments',
            value: total_departments,
            sub: highRiskDepts > 0 ? `${highRiskDepts} high or critical` : 'All low risk',
            color: highRiskDepts > 0 ? '#ffaa33' : '#38bdf8',
          },
          {
            label: 'Total Incidents',
            value: totalIncidents,
            sub: unassigned_count > 0 ? `${unassigned_count} unassigned` : 'All assigned',
            color: 'var(--text-primary)',
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '14px 16px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              {label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'monospace', color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 190px 48px 1fr 220px 200px 28px',
          gap: '14px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <span />
          <SortHeader label="Department" col="name" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
          <SortHeader label="Total"      col="total" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ justifyContent: 'flex-end' }} />
          <SortHeader label="Risk Score" col="risk"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
          <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Severity</span>
          <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Top Techniques</span>
          <span />
        </div>

        {/* Rows */}
        {departments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No department data. Add a "Department" column to your CSV to enable this view.
          </div>
        ) : (
          sorted.map((dept, i) => (
            <DeptRow
              key={dept.name}
              dept={dept}
              rank={i + 1}
              maxScore={max_risk_score}
              allIncidents={allIncidents}
              isLast={i === sorted.length - 1}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', paddingBottom: '4px' }}>
        {[
          { label: 'Critical (≥75% of max)', color: '#ff4444' },
          { label: 'High (50–74%)',           color: '#ff7b7b' },
          { label: 'Medium (25–49%)',         color: '#ffaa33' },
          { label: 'Low (<25%)',              color: '#f59e0b' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: color }} />
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          · Risk score = High×4 + Medium×2 + Low×1
        </span>
      </div>

    </div>
  );
}
