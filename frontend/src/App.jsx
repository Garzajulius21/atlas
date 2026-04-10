import { useState } from 'react';
import UploadPanel from './components/UploadPanel.jsx';
import IncidentTable from './components/IncidentTable.jsx';
import ClusterPanel from './components/ClusterPanel.jsx';
import ClusterMap from './components/ClusterMap.jsx';
import HeatmapPanel from './components/HeatmapPanel.jsx';
import MitrePanel from './components/MitrePanel.jsx';
import RecommendPanel from './components/RecommendPanel.jsx';
import ExportButton from './components/ExportButton.jsx';
import CorrelationExplorer from './components/CorrelationExplorer.jsx';
import SkeletonLoader from './components/SkeletonLoader.jsx';

const TABS = ['Incidents', 'Campaign Map', 'Campaigns', 'MITRE', 'Correlations', 'Risk Heatmap', 'Recommendations'];

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Incidents');

  const [clusters, setClusters] = useState(null);
  const [correlations, setCorrelations] = useState(null);
  const [clusterMapPoints, setClusterMapPoints] = useState(null);
  const [mitre, setMitre] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
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

      // Fetch all analysis data in parallel
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
      setActiveTab('Incidents');

    } catch (err) {
      setError('Could not connect to ATLAS backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const hasData = incidents.length > 0;

  const tabStyle = (tab) => ({
    padding: '7px 16px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    border: activeTab === tab ? '1px solid var(--accent-blue)' : '1px solid transparent',
    backgroundColor: activeTab === tab ? 'rgba(245,158,11,0.1)' : 'transparent',
    color: activeTab === tab ? 'var(--accent-blue)' : 'var(--text-secondary)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: '12px',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            backgroundColor: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'monospace'
          }}>A</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
              ATLAS
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
              Threat Correlation & Clustering Framework
            </div>
          </div>
        </div>
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
            fontSize: '11px', color: 'var(--text-secondary)',
            padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '4px',
            fontFamily: 'monospace'
          }}>
            Local · Privacy-First · Offline
          </span>
        </div>
      </header>

      {/* Main */}
      <main style={{
        flex: 1, padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '20px',
        maxWidth: '1400px', margin: '0 auto', width: '100%'
      }}>

        <UploadPanel onUpload={handleUpload} loading={loading} stats={stats} error={error} />

        {(hasData || loading) && (
          <>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {TABS.map(tab => (
                <button
                  key={tab}
                  style={{ ...tabStyle(tab), opacity: loading ? 0.5 : 1 }}
                  onClick={() => !loading && setActiveTab(tab)}
                >
                  {tab}
                  {!loading && tab === 'Campaigns' && clusters?.total_clusters > 0 &&
                    <span style={{ marginLeft: '6px', fontSize: '10px', fontFamily: 'monospace',
                      backgroundColor: 'rgba(168,85,247,0.2)', color: '#a855f7',
                      padding: '1px 5px', borderRadius: '3px' }}>
                      {clusters.total_clusters}
                    </span>}
                  {!loading && tab === 'Correlations' && correlations?.total > 0 &&
                    <span style={{ marginLeft: '6px', fontSize: '10px', fontFamily: 'monospace',
                      backgroundColor: 'rgba(56,189,248,0.2)', color: '#38bdf8',
                      padding: '1px 5px', borderRadius: '3px' }}>
                      {correlations.total}
                    </span>}
                  {!loading && tab === 'Recommendations' && recommendations?.total > 0 &&
                    <span style={{ marginLeft: '6px', fontSize: '10px', fontFamily: 'monospace',
                      backgroundColor: 'rgba(255,68,68,0.2)', color: '#ff7b7b',
                      padding: '1px 5px', borderRadius: '3px' }}>
                      {recommendations.total}
                    </span>}
                </button>
              ))}
            </div>

            {/* Tab content — skeleton while loading, real content when ready */}
            {loading ? (
              <SkeletonLoader tab={activeTab} />
            ) : (
              <div key={activeTab} className="tab-content">
                {activeTab === 'Incidents' && <IncidentTable incidents={incidents} clusters={clusters} correlations={correlations} />}
                {activeTab === 'Campaign Map' && <ClusterMap points={clusterMapPoints} clusters={clusters} correlations={correlations} allIncidents={incidents} />}
                {activeTab === 'Campaigns' && <ClusterPanel data={clusters} correlations={correlations} />}
                {activeTab === 'MITRE' && <MitrePanel data={mitre} allIncidents={incidents} clusters={clusters} correlations={correlations} />}
                {activeTab === 'Correlations' && <CorrelationExplorer correlations={correlations} allIncidents={incidents} clusters={clusters} />}
                {activeTab === 'Risk Heatmap' && <HeatmapPanel data={heatmap} />}
                {activeTab === 'Recommendations' && <RecommendPanel data={recommendations} />}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
