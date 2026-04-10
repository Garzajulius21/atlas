import { useState, useMemo } from 'react';
import IncidentDrawer from './IncidentDrawer.jsx';

const SEVERITY_COLORS = {
  High:          { bg: 'rgba(255,68,68,0.15)',  border: 'rgba(255,68,68,0.4)',  text: '#ff7b7b' },
  Medium:        { bg: 'rgba(255,149,0,0.15)',  border: 'rgba(255,149,0,0.4)',  text: '#ffaa33' },
  Low:           { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
  Informational: { bg: 'rgba(90,122,154,0.15)', border: 'rgba(90,122,154,0.4)', text: '#5a7a9a' },
};

const STATUS_COLORS = {
  Active:        { text: '#ff7b7b' },
  New:           { text: '#ff7b7b' },
  InProgress:    { text: '#ffaa33' },
  'In Progress': { text: '#ffaa33' },
  Resolved:      { text: '#00ff88' },
  Closed:        { text: '#5a7a9a' },
};

const SEV_ORDER = { High: 0, Medium: 1, Low: 2, Informational: 3 };

const CLUSTER_COLORS = [
  '#f59e0b','#a855f7','#00ff88','#ff7b7b','#38bdf8',
  '#fb7185','#34d399','#fbbf24','#c084fc','#f97316',
];

function getClusterColor(clusterId) {
  if (clusterId === null || clusterId === undefined) return '#4b5563';
  return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length];
}

function SeverityBadge({ severity }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Informational;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 600, fontFamily: 'monospace',
      backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: 'nowrap'
    }}>
      {severity}
    </span>
  );
}

function StatusDot({ status }) {
  const c = STATUS_COLORS[status] || { text: 'var(--text-secondary)' };
  return <span style={{ color: c.text, fontSize: '12px', fontFamily: 'monospace' }}>{status}</span>;
}

function MitreTags({ techniques }) {
  if (!techniques) return <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>—</span>;
  const all = techniques.split(',').map(t => t.trim()).filter(Boolean);
  const shown = all.slice(0, 3);
  const extra = all.length - shown.length;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
      {shown.map(t => (
        <span key={t} style={{
          padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontFamily: 'monospace',
          backgroundColor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
          color: '#a855f7', whiteSpace: 'nowrap'
        }}>{t}</span>
      ))}
      {extra > 0 && (
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          +{extra} more
        </span>
      )}
    </div>
  );
}

const CELL = {
  padding: '10px 12px', borderBottom: '1px solid var(--border)',
  fontSize: '12px', color: 'var(--text-primary)', verticalAlign: 'middle',
};

const PAGE_SIZE = 25;

// Columns: { label, field, sortable }
const COLUMNS = [
  { label: 'ID',         field: 'IncidentId',  sortable: true  },
  { label: 'Title',      field: 'Title',        sortable: true  },
  { label: 'Severity',   field: 'Severity',     sortable: true  },
  { label: 'Status',     field: 'Status',       sortable: true  },
  { label: 'Created',    field: 'CreatedTime',  sortable: true  },
  { label: 'Campaign',   field: '_campaign',    sortable: false },
  { label: 'MITRE',      field: null,           sortable: false },
  { label: 'Department', field: 'Department',   sortable: true  },
];

function sortRows(rows, col, dir, campaignLookup) {
  return [...rows].sort((a, b) => {
    let va, vb;
    if (col === 'Severity') {
      va = SEV_ORDER[a.Severity] ?? 99;
      vb = SEV_ORDER[b.Severity] ?? 99;
    } else if (col === 'CreatedTime') {
      va = a.CreatedTime || '';
      vb = b.CreatedTime || '';
    } else if (col === '_campaign') {
      va = campaignLookup[a.IncidentId] || 'zzz';
      vb = campaignLookup[b.IncidentId] || 'zzz';
    } else {
      va = String(a[col] || '').toLowerCase();
      vb = String(b[col] || '').toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

export default function IncidentTable({ incidents, clusters, correlations }) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [sortCol, setSortCol] = useState('CreatedTime');
  const [sortDir, setSortDir] = useState('desc');

  // Build campaign lookup: incidentId → { label, id }
  const campaignLookup = useMemo(() => {
    const map = {};
    for (const c of (clusters?.clusters || [])) {
      for (const id of (c.incident_ids || [])) {
        map[id] = { label: c.label, id: c.id };
      }
    }
    return map;
  }, [clusters]);

  const handleSort = (col) => {
    if (!col) return;
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir(col === 'CreatedTime' ? 'desc' : 'asc');
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    const base = incidents.filter(inc => {
      if (severityFilter !== 'All' && inc.Severity !== severityFilter) return false;
      if (statusFilter !== 'All' && inc.Status !== statusFilter && inc.Status !== statusFilter.replace('InProgress', 'In Progress')) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          String(inc.IncidentId || '').toLowerCase().includes(q) ||
          String(inc.Title || '').toLowerCase().includes(q) ||
          String(inc.MitreTechniques || '').toLowerCase().includes(q) ||
          String(inc.Department || '').toLowerCase().includes(q) ||
          (campaignLookup[inc.IncidentId]?.label || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
    return sortRows(base, sortCol, sortDir, Object.fromEntries(
      Object.entries(campaignLookup).map(([k, v]) => [k, v.label])
    ));
  }, [incidents, search, severityFilter, statusFilter, sortCol, sortDir, campaignLookup]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (v) => { setSearch(v); setPage(0); };
  const handleSev = (v) => { setSeverityFilter(v); setPage(0); };
  const handleStatus = (v) => { setStatusFilter(v); setPage(0); };

  const filterBtnStyle = (active) => ({
    padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
    fontFamily: 'monospace', cursor: 'pointer',
    border: active ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
    backgroundColor: active ? 'rgba(245,158,11,0.1)' : 'transparent',
    color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
    transition: 'all 0.15s'
  });

  const sortIndicator = (field) => {
    if (!field || sortCol !== field) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ marginLeft: '4px', color: 'var(--accent-blue)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Severity counts across ALL incidents (not filtered) for the summary bar
  const sevCounts = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0, Informational: 0 };
    for (const inc of incidents) {
      if (counts[inc.Severity] !== undefined) counts[inc.Severity]++;
    }
    return counts;
  }, [incidents]);

  return (
    <>
      {/* Severity summary bar */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
      }}>
        <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginRight: '4px' }}>
          Risk Profile
        </span>
        {[
          { label: 'High',          color: '#ff7b7b', bg: 'rgba(255,68,68,0.12)',   border: 'rgba(255,68,68,0.3)'   },
          { label: 'Medium',        color: '#ffaa33', bg: 'rgba(255,149,0,0.12)',   border: 'rgba(255,149,0,0.3)'   },
          { label: 'Low',           color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)' },
          { label: 'Informational', color: '#5a7a9a', bg: 'rgba(90,122,154,0.12)', border: 'rgba(90,122,154,0.25)' },
        ].map(({ label, color, bg, border }) => (
          <button
            key={label}
            onClick={() => handleSev(severityFilter === label ? 'All' : label)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '5px', cursor: 'pointer',
              backgroundColor: severityFilter === label ? bg : 'transparent',
              border: `1px solid ${severityFilter === label ? border : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = bg; e.currentTarget.style.borderColor = border; }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = severityFilter === label ? bg : 'transparent';
              e.currentTarget.style.borderColor = severityFilter === label ? border : 'var(--border)';
            }}
          >
            <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color, lineHeight: 1 }}>
              {sevCounts[label]}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{label}</span>
          </button>
        ))}
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: 'auto', fontStyle: 'italic' }}>
          Click to filter
        </span>
      </div>

      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginRight: '4px' }}>
            Incidents
          </div>
          <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-blue)' }}>
            {filtered.length} / {incidents.length}
          </span>

          <input
            type="text"
            placeholder="Search ID, title, MITRE, dept, campaign…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{
              flex: 1, minWidth: '180px', maxWidth: '320px', padding: '5px 10px',
              borderRadius: '5px', border: '1px solid var(--border-hi)',
              backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)',
              fontSize: '12px', outline: 'none', fontFamily: 'inherit'
            }}
          />

          <div style={{ display: 'flex', gap: '4px' }}>
            {['All', 'Active', 'In Progress', 'Resolved', 'Closed'].map(s => (
              <button key={s} style={filterBtnStyle(statusFilter === s)} onClick={() => handleStatus(s)}>{s}</button>
            ))}
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: 'auto' }}>
            Sorted by newest · click any row to inspect
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-primary)' }}>
                {COLUMNS.map(col => (
                  <th
                    key={col.label}
                    onClick={() => col.sortable && handleSort(col.field)}
                    style={{
                      fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-secondary)',
                      padding: '10px 12px', textAlign: 'left',
                      borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                      userSelect: 'none',
                      cursor: col.sortable ? 'pointer' : 'default',
                    }}
                    onMouseEnter={e => { if (col.sortable) e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    {col.label}
                    {col.sortable && sortIndicator(col.field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...CELL, textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                    No incidents match the current filters.
                  </td>
                </tr>
              ) : pageData.map((inc, i) => {
                const isSelected = selectedIncident?.IncidentId === inc.IncidentId;
                const campaign = campaignLookup[inc.IncidentId];
                const campColor = campaign ? getClusterColor(campaign.id) : null;

                return (
                  <tr
                    key={inc.IncidentId || i}
                    onClick={() => setSelectedIncident(inc)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected
                        ? 'rgba(245,158,11,0.06)'
                        : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      transition: 'background 0.1s',
                      outline: isSelected ? '1px solid rgba(245,158,11,0.3)' : 'none',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'; }}
                  >
                    {/* ID */}
                    <td style={{ ...CELL, fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-mono)', whiteSpace: 'nowrap' }}>
                      {inc.IncidentId || '—'}
                    </td>
                    {/* Title */}
                    <td style={{ ...CELL, maxWidth: '260px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.Title || '—'}
                      </div>
                    </td>
                    {/* Severity */}
                    <td style={CELL}><SeverityBadge severity={inc.Severity} /></td>
                    {/* Status */}
                    <td style={CELL}><StatusDot status={inc.Status} /></td>
                    {/* Created */}
                    <td style={{ ...CELL, fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {inc.CreatedTime ? inc.CreatedTime.slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                    {/* Campaign */}
                    <td style={CELL}>
                      {campaign ? (
                        <span style={{
                          fontSize: '10px', fontFamily: 'monospace', fontWeight: 600,
                          color: campColor, backgroundColor: campColor + '18',
                          padding: '2px 7px', borderRadius: '3px', whiteSpace: 'nowrap',
                          border: `1px solid ${campColor}40`,
                        }}>
                          {campaign.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </td>
                    {/* MITRE */}
                    <td style={{ ...CELL, maxWidth: '200px' }}>
                      <MitreTags techniques={inc.MitreTechniques} />
                    </td>
                    {/* Department */}
                    <td style={{ ...CELL, fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {inc.Department || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginRight: 'auto' }}>
              Page {page + 1} of {totalPages} · rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)}
            </span>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ ...filterBtnStyle(false), opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ ...filterBtnStyle(false), opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →</button>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedIncident && (
        <IncidentDrawer
          incident={selectedIncident}
          clusters={clusters}
          correlations={correlations}
          allIncidents={incidents}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </>
  );
}
