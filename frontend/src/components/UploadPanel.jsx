import { useState, useRef } from 'react';

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

  const cardStyle = {
    backgroundColor: 'var(--bg-surface)',
    border: `1px solid ${dragging ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '10px',
    padding: '24px',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Upload Defender Incident Export
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-hi)'}`,
          borderRadius: '8px',
          padding: '32px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragging ? 'var(--accent-dim)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
        <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {loading ? 'Processing…' : 'Drop your CSV here or click to browse'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Microsoft Defender incident export · Max 10MB
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '12px', padding: '10px 14px',
          backgroundColor: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)',
          borderRadius: '6px', fontSize: '13px', color: '#ff7b7b'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stats */}
      {stats && !error && (
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'File', value: filename, color: 'var(--text-secondary)' },
            { label: 'Total rows', value: stats.total, color: 'var(--accent-blue)' },
            { label: 'Valid', value: stats.valid, color: 'var(--accent-green)' },
            { label: 'Skipped', value: stats.skipped, color: stats.skipped > 0 ? 'var(--accent-amber)' : 'var(--text-secondary)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '6px', flex: 1, minWidth: '100px'
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color, fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Validation errors */}
      {stats?.errors?.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--accent-amber)', marginBottom: '6px' }}>
            Validation warnings ({stats.errors.length} row{stats.errors.length > 1 ? 's' : ''} skipped):
          </div>
          {stats.errors.slice(0, 3).map((e, i) => (
            <div key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginBottom: '2px' }}>
              · {e}
            </div>
          ))}
        </div>
      )}

      {/* Privacy notice */}
      <div style={{
        marginTop: '14px', padding: '8px 12px',
        backgroundColor: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
        borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)',
      }}>
        🔒 PII is hashed locally before any processing. Usernames, hostnames, and IPs are SHA-256 anonymized. Comments and payload fields are dropped.
      </div>
    </div>
  );
}
