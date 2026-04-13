import { useState } from 'react';
import UploadPanel from './components/UploadPanel.jsx';
import IncidentTable from './components/IncidentTable.jsx';
import CampaignsTab from './components/CampaignsTab.jsx';
import HeatmapPanel from './components/HeatmapPanel.jsx';
import MitrePanel from './components/MitrePanel.jsx';
import RecommendPanel from './components/RecommendPanel.jsx';
import ExportButton from './components/ExportButton.jsx';
import CorrelationExplorer from './components/CorrelationExplorer.jsx';
import SkeletonLoader from './components/SkeletonLoader.jsx';

const TABS = ['Incidents', 'Campaigns', 'MITRE', 'Correlations', 'Risk Heatmap', 'Recommendations'];

// ── Logo mark ─────────────────────────────────────────────────────────────────
function AtlasLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="6" fill="var(--accent)" fillOpacity="0.15" />
      <rect width="28" height="28" rx="6" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="1" />
      {/* Two nodes connected — correlation motif */}
      <circle cx="9" cy="14" r="2.5" fill="var(--accent)" />
      <circle cx="19" cy="9"  r="2.5" fill="var(--accent)" fillOpacity="0.7" />
      <circle cx="19" cy="19" r="2.5" fill="var(--accent)" fillOpacity="0.7" />
      <line x1="11.2" y1="12.7" x2="17" y2="10.2" stroke="var(--accent)" strokeOpacity="0.5" strokeWidth="1" />
      <line x1="11.2" y1="15.3" x2="17" y2="17.8" stroke="var(--accent)" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
  );
}

// ── Tab badge ─────────────────────────────────────────────────────────────────
function TabBadge({ count, color }) {
  return (
    <span style={{
      marginLeft: '6px',
      fontSize: '10px',
      fontFamily: 'monospace',
      fontWeight: 600,
      color,
      backgroundColor: color + '18',
      padding: '1px 5px',
      borderRadius: '3px',
      border: `1px solid ${color}30`,
    }}>
      {count}
    </span>
  );
}

export default function App() {
  const [incidents, setIncidents]           = useState([]);
  const [stats, setStats]                   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [activeTab, setActiveTab]           = useState('Incidents');
  const [loadedFilename, setLoadedFilename] = useState(null);

  const [clusters, setClusters]             = useState(null);
  const [correlations, setCorrelations]     = useState(null);
  const [clusterMapPoints, setClusterMapPoints] = useState(null);
  const [mitre, setMitre]                   = useState(null);
  const [heatmap, setHeatmap]               = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  const handleUpload = async (file) => {
    setLoading(true);
    setError(null);
    setIncidents([]);
    setStats(null);
    setClusters(null);
    setCorrelations(null);
    setClusterMapPoints(null);
    setMitre(null);
    setHeatmap(null);
    setRecommendations(null);
    setLoadedFilename(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      setStats(data.stats);

      const [incRes, clusterRes, corrRes, mapRes, mitreRes, heatmapRes, recRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/clusters'),
        fetch('/api/correlations'),
        fetch('/api/cluster-map'),
        fetch('/api/mitre'),
        fetch('/api/heatmap'),
        fetch('/api/recommendations'),
      ]);

      const [incData, clusterData, corrData, mapData, mitreData, heatmapData, recData] = await Promise.all([
        incRes.json(),
        clusterRes.json(),
        corrRes.json(),
        mapRes.json(),
        mitreRes.json(),
        heatmapRes.json(),
        recRes.json(),
      ]);

      setIncidents(incData.records || []);
      setClusters(clusterData);
      setCorrelations(corrData);
      setClusterMapPoints(mapData.points || []);
      setMitre(mitreData);
      setHeatmap(heatmapData);
      setRecommendations(recData);
      setLoadedFilename(file.name);
      setActiveTab('Incidents');

    } catch (err) {
      setError('Could not connect to ATLAS backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const hasData = incidents.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AtlasLogo />
          <div>
            <div style={{
              fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '0.08em', lineHeight: 1.2,
            }}>
              ATLAS
            </div>
            <div style={{
              fontSize: '10px', color: 'var(--text-secondary)',
              letterSpacing: '0.04em', lineHeight: 1,
            }}>
              Threat Correlation & Clustering
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', flexShrink: 0 }} />

        {/* File status */}
        {hasData && loadedFilename ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {loadedFilename.length > 28 ? loadedFilename.slice(0, 25) + '…' : loadedFilename}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {incidents.length} incidents
            </span>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: 'var(--accent)', flexShrink: 0,
              animation: 'pulse 1.2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Analysing…</span>
          </div>
        ) : null}

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasData && (
            <ExportButton
              incidents={incidents}
              clusters={clusters}
              correlations={correlations}
              mitre={mitre}
              heatmap={heatmap}
              recommendations={recommendations}
            />
          )}
          <span style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            padding: '3px 8px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
          }}>
            Local · Offline
          </span>
        </div>
      </header>

      {/* ── Tab shelf — only visible when data loaded ── */}
      {(hasData || loading) && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          flexShrink: 0,
          overflowX: 'auto',
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => !loading && setActiveTab(tab)}
                style={{
                  padding: '10px 14px',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 500,
                  cursor: loading ? 'default' : 'pointer',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  opacity: loading ? 0.5 : 1,
                  transition: 'color var(--transition-fast), border-color var(--transition-fast)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '-1px', // overlap the shelf border so underline sits flush
                }}
                onMouseEnter={e => {
                  if (!active && !loading) e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {tab}
                {!loading && tab === 'Campaigns' && clusters?.total_clusters > 0 &&
                  <TabBadge count={clusters.total_clusters} color="var(--accent)" />}
                {!loading && tab === 'Correlations' && correlations?.total > 0 &&
                  <TabBadge count={correlations.total} color="#38bdf8" />}
                {!loading && tab === 'Recommendations' && recommendations?.total > 0 &&
                  <TabBadge count={recommendations.total} color="#f87171" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main content ── */}
      <main style={{
        flex: 1,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%',
      }}>

        <UploadPanel onUpload={handleUpload} loading={loading} stats={stats} error={error} />

        {(hasData || loading) && (
          loading ? (
            <SkeletonLoader tab={activeTab} />
          ) : (
            <div key={activeTab} className="tab-content">
              {activeTab === 'Incidents'        && <IncidentTable incidents={incidents} clusters={clusters} correlations={correlations} />}
              {activeTab === 'Campaigns'        && <CampaignsTab points={clusterMapPoints} clusters={clusters} correlations={correlations} allIncidents={incidents} />}
              {activeTab === 'MITRE'            && <MitrePanel data={mitre} allIncidents={incidents} clusters={clusters} correlations={correlations} />}
              {activeTab === 'Correlations'     && <CorrelationExplorer correlations={correlations} allIncidents={incidents} clusters={clusters} />}
              {activeTab === 'Risk Heatmap'     && <HeatmapPanel data={heatmap} allIncidents={incidents} clusters={clusters} />}
              {activeTab === 'Recommendations'  && <RecommendPanel data={recommendations} />}
            </div>
          )
        )}

      </main>
    </div>
  );
}
