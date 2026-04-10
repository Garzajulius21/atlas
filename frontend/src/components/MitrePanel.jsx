import { useState } from 'react';
import IncidentDrawer from './IncidentDrawer.jsx';

const TACTIC_ORDER = [
  'TA0001', 'TA0002', 'TA0003', 'TA0004', 'TA0005', 'TA0006',
  'TA0007', 'TA0008', 'TA0009', 'TA0010', 'TA0011', 'TA0040',
];

function tacticUrl(id) {
  return `https://attack.mitre.org/tactics/${id}/`;
}

function techniqueUrl(tech) {
  // T1059.001 → /techniques/T1059/001/
  return `https://attack.mitre.org/techniques/${tech.replace('.', '/')}/`;
}

function TacticCell({ tactic, onDrillDown, isDrilled }) {
  const covered = tactic.count > 0;
  const intensity = covered ? Math.min(tactic.count / 10, 1) : 0;

  return (
    <div
      onClick={() => covered && onDrillDown(tactic)}
      style={{
        padding: '10px',
        borderRadius: '6px',
        border: isDrilled
          ? '2px solid rgba(168,85,247,0.8)'
          : covered
            ? `1px solid rgba(168,85,247,${0.25 + intensity * 0.5})`
            : '1px solid var(--border)',
        backgroundColor: isDrilled
          ? 'rgba(168,85,247,0.18)'
          : covered
            ? `rgba(168,85,247,${0.06 + intensity * 0.18})`
            : 'var(--bg-primary)',
        cursor: covered ? 'pointer' : 'default',
        transition: 'all 0.15s',
        minWidth: 0,
        position: 'relative',
      }}
      onMouseEnter={e => { if (covered) e.currentTarget.style.borderColor = 'rgba(168,85,247,0.7)'; }}
      onMouseLeave={e => {
        if (covered && !isDrilled) e.currentTarget.style.borderColor = `rgba(168,85,247,${0.25 + intensity * 0.5})`;
        if (!covered) e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* External link icon — top right */}
      {covered && (
        <a
          href={tacticUrl(tactic.id)}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          title={`View ${tactic.id} on MITRE ATT&CK`}
          style={{
            position: 'absolute', top: '6px', right: '6px',
            fontSize: '9px', color: 'rgba(168,85,247,0.5)',
            textDecoration: 'none', lineHeight: 1,
          }}
        >↗</a>
      )}

      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: covered ? '#a855f7' : 'var(--border-hi)', marginBottom: '4px' }}>
        {tactic.id}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: covered ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: '6px', lineHeight: 1.3 }}>
        {tactic.name}
      </div>
      {covered ? (
        <>
          <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#a855f7' }}>
            {tactic.count}
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '4px' }}>incidents</span>
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(168,85,247,0.6)', marginTop: '4px' }}>
            {isDrilled ? 'Click to close ▲' : 'Click to explore ▾'}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '11px', color: 'var(--border-hi)', fontStyle: 'italic' }}>No coverage</div>
      )}
      {tactic.techniques.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {tactic.techniques.slice(0, 4).map(t => (
            <span key={t} style={{
              padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontFamily: 'monospace',
              backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7'
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function TacticDrillDown({ tactic, allIncidents, clusters, correlations, onClose }) {
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Find incidents mapped to this tactic's techniques
  const tacticIncidents = (allIncidents || []).filter(inc => {
    const techs = (inc.MitreTechniques || '').split(',').map(t => t.trim().toUpperCase());
    return tactic.techniques.some(t => techs.includes(t.toUpperCase()));
  });

  const SEVERITY_COLORS = {
    High:    { bg: 'rgba(255,68,68,0.15)',  border: 'rgba(255,68,68,0.4)',  text: '#ff7b7b' },
    Medium:  { bg: 'rgba(255,149,0,0.15)',  border: 'rgba(255,149,0,0.4)',  text: '#ffaa33' },
    Low:     { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
    Informational: { bg: 'rgba(90,122,154,0.15)', border: 'rgba(90,122,154,0.4)', text: '#5a7a9a' },
  };

  return (
    <>
      <div style={{
        marginTop: '12px',
        backgroundColor: 'var(--bg-primary)',
        border: '2px solid rgba(168,85,247,0.4)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '12px',
          backgroundColor: 'rgba(168,85,247,0.06)',
        }}>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#a855f7' }}>{tactic.id}</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{tactic.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
            — {tacticIncidents.length} incident{tacticIncidents.length !== 1 ? 's' : ''}
          </div>
          <a
            href={tacticUrl(tactic.id)}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '11px', color: '#a855f7', textDecoration: 'none',
              padding: '2px 8px', borderRadius: '4px',
              border: '1px solid rgba(168,85,247,0.3)',
              backgroundColor: 'rgba(168,85,247,0.08)',
            }}
          >
            View on MITRE ↗
          </a>

          {/* Techniques in this tactic */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: '4px' }}>
            {tactic.techniques.map(t => (
              <a
                key={t}
                href={techniqueUrl(t)}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '1px 6px', borderRadius: '3px', fontSize: '10px',
                  fontFamily: 'monospace', textDecoration: 'none',
                  backgroundColor: 'rgba(168,85,247,0.12)',
                  border: '1px solid rgba(168,85,247,0.3)',
                  color: '#a855f7',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.7)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'}
              >
                {t} ↗
              </a>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'none', border: '1px solid var(--border)',
              borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: '12px', padding: '2px 8px',
            }}
          >✕</button>
        </div>

        {/* Incident list */}
        {tacticIncidents.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
            No incidents directly mapped to this tactic's techniques.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)' }}>
                  {['ID', 'Title', 'Severity', 'Status', 'Created', 'Techniques', 'Department'].map(h => (
                    <th key={h} style={{
                      fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-secondary)',
                      padding: '8px 12px', textAlign: 'left',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tacticIncidents.map((inc, i) => {
                  const sev = SEVERITY_COLORS[inc.Severity] || SEVERITY_COLORS.Informational;
                  const techs = (inc.MitreTechniques || '').split(',').map(t => t.trim()).filter(Boolean);
                  return (
                    <tr
                      key={inc.IncidentId || i}
                      onClick={() => setSelectedIncident(inc)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(168,85,247,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                    >
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-mono)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                        {inc.IncidentId}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '12px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                        {inc.Title}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{
                          padding: '1px 7px', borderRadius: '3px', fontSize: '10px',
                          fontWeight: 700, fontFamily: 'monospace',
                          backgroundColor: sev.bg, border: `1px solid ${sev.border}`, color: sev.text,
                        }}>{inc.Severity}</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                        {inc.Status}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                        {inc.CreatedTime ? inc.CreatedTime.slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                          {techs.slice(0, 4).map(t => (
                            <a
                              key={t}
                              href={techniqueUrl(t)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{
                                padding: '1px 5px', borderRadius: '3px', fontSize: '9px',
                                fontFamily: 'monospace', textDecoration: 'none',
                                backgroundColor: 'rgba(168,85,247,0.12)',
                                border: '1px solid rgba(168,85,247,0.3)',
                                color: '#a855f7',
                              }}
                            >{t} ↗</a>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                        {inc.Department || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedIncident && (
        <IncidentDrawer
          incident={selectedIncident}
          clusters={clusters}
          correlations={correlations}
          allIncidents={allIncidents}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </>
  );
}

export default function MitrePanel({ data, allIncidents, clusters, correlations }) {
  const [drilledTactic, setDrilledTactic] = useState(null);

  if (!data) return null;
  const { tactic_coverage, top_techniques, covered_tactics, gap_tactics, total_unique_techniques } = data;

  const tacticMap = Object.fromEntries((tactic_coverage || []).map(t => [t.id, t]));

  const handleDrillDown = (tactic) => {
    setDrilledTactic(prev => prev?.id === tactic.id ? null : tactic);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
          MITRE ATT&CK Coverage
        </div>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#a855f7' }}>{covered_tactics?.length || 0} tactics covered</span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ff7b7b' }}>{gap_tactics?.length || 0} gaps</span>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{total_unique_techniques} unique techniques</span>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Click any covered tactic to explore its incidents · ↗ links open MITRE ATT&CK
        </div>

        {/* Tactic grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '12px' }}>
          {TACTIC_ORDER.map(id => {
            const tactic = tacticMap[id];
            return tactic ? (
              <TacticCell
                key={id}
                tactic={tactic}
                onDrillDown={handleDrillDown}
                isDrilled={drilledTactic?.id === id}
              />
            ) : null;
          })}
        </div>

        {/* Drill-down panel */}
        {drilledTactic && (
          <TacticDrillDown
            tactic={drilledTactic}
            allIncidents={allIncidents}
            clusters={clusters}
            correlations={correlations}
            onClose={() => setDrilledTactic(null)}
          />
        )}

        {/* Top techniques table */}
        {top_techniques?.length > 0 && (
          <div style={{ marginTop: drilledTactic ? '20px' : '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Top Techniques by Frequency
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {top_techniques.map((item, i) => {
                const barPct = top_techniques[0].count > 0 ? (item.count / top_techniques[0].count) * 100 : 0;
                return (
                  <div key={item.technique} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 10px', backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'transparent', borderRadius: '4px' }}>
                    <a
                      href={techniqueUrl(item.technique)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontFamily: 'monospace', fontSize: '11px', color: '#a855f7',
                        minWidth: '60px', textDecoration: 'none', fontWeight: 600,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#c084fc'}
                      onMouseLeave={e => e.currentTarget.style.color = '#a855f7'}
                    >
                      {item.technique} ↗
                    </a>
                    <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px' }}>
                      <div style={{ width: `${barPct}%`, height: '100%', backgroundColor: '#a855f7', borderRadius: '2px', opacity: 0.7 }} />
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', minWidth: '24px', textAlign: 'right' }}>{item.count}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', minWidth: '140px' }}>{item.tactic_name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
