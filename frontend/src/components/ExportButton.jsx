import { useState, useRef, useEffect } from 'react';
import { generateJsonReport, downloadFile } from '../lib/generateReport.js';
import { openPdfReport } from '../lib/generatePdfReport.js';

export default function ExportButton({ incidents, clusters, correlations, mitre, heatmap, recommendations }) {
  const [open, setOpen] = useState(false);
  const [exported, setExported] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const data = { incidents, clusters, correlations, mitre, heatmap, recommendations };
  const datestamp = new Date().toISOString().slice(0, 10);

  const handleExport = (type) => {
    setOpen(false);
    if (type === 'pdf') {
      openPdfReport(data);
    } else {
      const content = generateJsonReport(data);
      downloadFile(content, `atlas-report-${datestamp}.json`, 'application/json');
    }
    setExported(type);
    setTimeout(() => setExported(null), 2000);
  };

  const btnStyle = {
    padding: '5px 14px', borderRadius: '5px', fontSize: '11px',
    fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer',
    border: '1px solid var(--accent-border)',
    backgroundColor: open ? 'var(--accent-dim)' : 'transparent',
    color: 'var(--accent)', transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', gap: '6px',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button style={btnStyle} onClick={() => setOpen(o => !o)}>
        {exported ? '✓ Exported' : '↓ Export Report'}
        <span style={{ fontSize: '9px', opacity: 0.7 }}>{open ? '▲' : '▾'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '6px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--accent-border)',
          borderRadius: '8px', overflow: 'hidden', zIndex: 200,
          minWidth: '280px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>

          {/* PDF */}
          <button
            onClick={() => handleExport('pdf')}
            style={{
              width: '100%', padding: '12px 16px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-dim)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
              📊 PDF Report
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Two-page designed report — executive summary<br />
              for leadership + full technical breakdown.
            </div>
          </button>

          {/* JSON */}
          <button
            onClick={() => handleExport('json')}
            style={{
              width: '100%', padding: '12px 16px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-dim)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
              {'{ }'} JSON Export (.json)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Machine-readable full dataset.<br />
              Feed into ticketing systems, SIEMs, or other tools.
            </div>
          </button>

          <div style={{
            padding: '8px 16px', borderTop: '1px solid var(--border)',
            fontSize: '10px', color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-elevated)',
          }}>
            🔒 All PII remains SHA-256 hashed in exports
          </div>
        </div>
      )}
    </div>
  );
}
