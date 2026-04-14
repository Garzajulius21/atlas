import { useState, useRef } from 'react';

const FEATURES = [
  { label: 'Campaign Detection',          desc: 'DBSCAN clustering groups related incidents into coordinated attack campaigns' },
  { label: 'MITRE ATT&CK Mapping',        desc: 'Full kill-chain coverage analysis with gap identification' },
  { label: 'Correlation Engine',          desc: 'Scores incident pairs across entities, techniques, time, and severity' },
  { label: 'Risk Heatmap',                desc: 'Department-level exposure with severity-weighted risk scoring' },
  { label: 'Hardening Recommendations',   desc: 'Prioritised, ownership-mapped remediation actions' },
  { label: 'PDF Export',                  desc: 'Two-page boardroom report — executive briefing + technical detail' },
];

export default function UploadPanel({ onUpload, loading, stats, error }) {
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Only CSV files are supported.');
      return;
    }
    setFilename(file.name);
    onUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const hasResult = stats && !error;

  // ── After upload: compact status bar ──────────────────────────────────────
  if (hasResult) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#34d399', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
            {filename?.length > 36 ? filename.slice(0, 33) + '…' : filename}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: stats.total,   color: 'var(--text-secondary)' },
            { label: 'Valid', value: stats.valid,   color: '#34d399' },
            { label: 'Skipped', value: stats.skipped, color: stats.skipped > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' },
          ].map(({ label, value, color }) => (
            <span key={label} style={{ fontSize: '12px', fontFamily: 'monospace', color }}>
              <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>{label}</span>{value}
            </span>
          ))}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            marginLeft: 'auto', padding: '4px 12px', borderRadius: '5px', fontSize: '11px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace',
            border: '1px solid var(--border)', backgroundColor: 'transparent',
            color: 'var(--text-secondary)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          Load new file
        </button>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

        {stats?.errors?.length > 0 && (
          <div style={{ width: '100%', marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {stats.errors.slice(0, 2).map((e, i) => (
              <span key={i} style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>· {e}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Landing state ─────────────────────────────────────────────────────────
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>

      {/* Top section: value prop + privacy badge */}
      <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
              Analyse your Microsoft Defender incidents
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '520px' }}>
              Upload an incident export to automatically detect attack campaigns, map MITRE ATT&CK
              coverage gaps, score incident correlations, and generate boardroom-ready reports — entirely
              offline, with no data leaving your machine.
            </div>
          </div>

          {/* Privacy trust badge */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '7px 12px', borderRadius: '6px',
              backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#34d399', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#34d399', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.03em' }}>
                Local · Private · Offline
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
              PII is SHA-256 hashed before processing
            </span>
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FEATURES.map(({ label }) => (
            <span key={label} style={{
              padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
              color: 'var(--text-secondary)', border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-elevated)',
              transition: 'border-color 0.15s, color 0.15s',
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Drop zone section */}
      <div style={{ padding: '24px 32px' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !loading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-hi)'}`,
            borderRadius: '8px',
            padding: '36px 24px',
            textAlign: 'center',
            cursor: loading ? 'default' : 'pointer',
            backgroundColor: dragging ? 'var(--accent-dim)' : 'transparent',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!loading && !dragging) e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { if (!dragging) e.currentTarget.style.borderColor = 'var(--border-hi)'; }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {loading ? (
            <>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Analysing incidents…</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clustering · correlating · building MITRE map</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Drop your CSV here, or{' '}
                <span style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationColor: 'var(--accent-border)' }}>
                  browse to select
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Microsoft Defender incident export &nbsp;·&nbsp; CSV format &nbsp;·&nbsp; Max 10 MB
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: '6px', fontSize: '12px', color: '#f87171',
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}
