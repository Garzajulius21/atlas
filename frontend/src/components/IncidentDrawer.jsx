import { useEffect } from 'react';

const SEVERITY_COLORS = {
  High:          { bg: 'rgba(255,68,68,0.15)',  border: 'rgba(255,68,68,0.4)',  text: '#ff7b7b' },
  Medium:        { bg: 'rgba(255,149,0,0.15)',  border: 'rgba(255,149,0,0.4)',  text: '#ffaa33' },
  Low:           { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
  Informational: { bg: 'rgba(90,122,154,0.15)', border: 'rgba(90,122,154,0.4)', text: '#5a7a9a' },
};

const STATUS_COLORS = {
  Active:        '#ff7b7b',
  New:           '#ff7b7b',
  InProgress:    '#ffaa33',
  'In Progress': '#ffaa33',
  Resolved:      '#00ff88',
  Closed:        '#5a7a9a',
};

function mitreTacticUrl(technique) {
  // T1059.001 → https://attack.mitre.org/techniques/T1059/001
  const normalised = technique.trim().replace('.', '/');
  return `https://attack.mitre.org/techniques/${normalised}`;
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--text-secondary)',
        marginBottom: '10px', paddingBottom: '6px',
        borderBottom: '1px solid var(--border)'
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, mono = false }) {
  if (!value || value === 'None' || value === '') return null;
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>{label}</div>
      <div style={{
        fontSize: '12px',
        color: 'var(--text-primary)',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all'
      }}>{value}</div>
    </div>
  );
}

export default function IncidentDrawer({ incident, clusters, correlations, allIncidents, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!incident) return null;

  const sev = SEVERITY_COLORS[incident.Severity] || SEVERITY_COLORS.Informational;
  const incId = incident.IncidentId;

  // Find which campaign this incident belongs to
  const campaign = clusters?.clusters?.find(c => c.incident_ids.includes(incId));

  // Find correlated incidents involving this one
  const relatedPairs = (correlations?.pairs || [])
    .filter(p => p.a === incId || p.b === incId)
    .slice(0, 5);

  // Look up the other incident's title for each pair
  const incidentMap = Object.fromEntries((allIncidents || []).map(i => [i.IncidentId, i]));

  // Parse MITRE techniques
  const techniques = (incident.MitreTechniques || '')
    .split(',').map(t => t.trim().toUpperCase()).filter(Boolean);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '460px',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 101,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0,
          backgroundColor: 'var(--bg-surface)',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '11px', fontFamily: 'monospace',
                color: 'var(--text-secondary)', marginBottom: '4px'
              }}>{incId}</div>
              <div style={{
                fontSize: '14px', fontWeight: 600,
                color: 'var(--text-primary)', lineHeight: 1.4
              }}>{incident.Title}</div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: '5px', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '16px', lineHeight: 1,
                padding: '4px 8px', flexShrink: 0
              }}
            >✕</button>
          </div>

          {/* Severity + Status row */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
            <span style={{
              padding: '2px 10px', borderRadius: '4px', fontSize: '11px',
              fontWeight: 700, fontFamily: 'monospace',
              backgroundColor: sev.bg, border: `1px solid ${sev.border}`, color: sev.text
            }}>{incident.Severity}</span>
            <span style={{
              fontSize: '12px', fontFamily: 'monospace',
              color: STATUS_COLORS[incident.Status] || 'var(--text-secondary)'
            }}>{incident.Status}</span>
            {incident.CreatedTime && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                {String(incident.CreatedTime).slice(0, 16).replace('T', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', flex: 1 }}>

          {/* Campaign membership */}
          {campaign ? (
            <Section title="Campaign">
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(168,85,247,0.08)',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: '6px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#a855f7', marginBottom: '4px' }}>
                  {campaign.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {campaign.size} incidents · {campaign.time_span_hours.toFixed(0)}h span · cohesion {Math.round(campaign.cohesion * 100)}%
                </div>
              </div>
            </Section>
          ) : (
            <Section title="Campaign">
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Not part of a detected campaign — isolated incident.
              </div>
            </Section>
          )}

          {/* MITRE Techniques */}
          {techniques.length > 0 && (
            <Section title="MITRE ATT&CK Techniques">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {techniques.map(t => (
                  <a
                    key={t}
                    href={mitreTacticUrl(t)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(168,85,247,0.08)',
                      border: '1px solid rgba(168,85,247,0.25)',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.25)'}
                  >
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#a855f7' }}>{t}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>attack.mitre.org ↗</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Correlated incidents */}
          {relatedPairs.length > 0 && (
            <Section title={`Correlated Incidents (${relatedPairs.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {relatedPairs.map((pair, i) => {
                  const otherId = pair.a === incId ? pair.b : pair.a;
                  const other = incidentMap[otherId];
                  const pct = Math.round(pair.score * 100);
                  return (
                    <div key={i} style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-mono)' }}>{otherId}</span>
                        <span style={{
                          marginLeft: 'auto', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700,
                          color: pct >= 70 ? '#ff7b7b' : pct >= 50 ? '#ffaa33' : '#f59e0b'
                        }}>{pct}% match</span>
                      </div>
                      {other && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          {other.Title}
                        </div>
                      )}
                      {pair.shared_mitre?.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {pair.shared_mitre.map(t => (
                            <span key={t} style={{
                              fontSize: '9px', fontFamily: 'monospace', padding: '1px 5px',
                              borderRadius: '3px', backgroundColor: 'rgba(168,85,247,0.12)',
                              border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7'
                            }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Incident details */}
          <Section title="Details">
            <Field label="Department" value={incident.Department} />
            <Field label="Classification" value={incident.Classification} />
            <Field label="Investigation State" value={incident.InvestigationState} />
            <Field label="Assigned To" value={incident.AssignedTo} />
            <Field label="Last Updated" value={incident.LastUpdatedTime} mono />
          </Section>

          {/* Hashed entities */}
          <Section title="Entities (SHA-256 anonymised)">
            <Field label="Account UPN" value={incident.AccountUpn} mono />
            <Field label="Account Name" value={incident.AccountName} mono />
            <Field label="Device Name" value={incident.DeviceName} mono />
            <Field label="Hostname" value={incident.HostName} mono />
            <Field label="IP Address" value={incident.IpAddress} mono />
            <Field label="Remote IP" value={incident.RemoteIP} mono />
          </Section>

        </div>
      </div>
    </>
  );
}
