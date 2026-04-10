// Skeleton placeholders shown while ATLAS is processing the uploaded file

function Bone({ w = '100%', h = 14, mb = 0, style = {} }) {
  return (
    <div
      className="skeleton-block"
      style={{ width: w, height: h, marginBottom: mb, borderRadius: 4, flexShrink: 0, ...style }}
    />
  );
}

function SkeletonCard({ children, style = {} }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '16px',
      ...style,
    }}>
      {children}
    </div>
  );
}

// --- Tab-specific skeletons ---

function IncidentsSkeleton() {
  return (
    <SkeletonCard>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <Bone w="220px" h={32} />
        <Bone w="120px" h={32} />
        <Bone w="120px" h={32} />
        <Bone w="80px" h={32} style={{ marginLeft: 'auto' }} />
      </div>
      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 80px 100px 120px', gap: '12px', marginBottom: '10px', padding: '0 4px' }}>
        {['60px','90%','50px','60px','80px'].map((w, i) => <Bone key={i} w={w} h={10} />)}
      </div>
      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 80px 100px 120px', gap: '12px', marginBottom: '10px', padding: '8px 4px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
          <Bone w="70px" h={11} />
          <Bone w={`${65 + (i % 4) * 8}%`} h={11} />
          <Bone w="50px" h={20} style={{ borderRadius: 3 }} />
          <Bone w="60px" h={11} />
          <Bone w="80px" h={11} />
        </div>
      ))}
    </SkeletonCard>
  );
}

function CampaignMapSkeleton() {
  return (
    <SkeletonCard>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
        <Bone w="120px" h={12} />
        <Bone w="100px" h={26} style={{ marginLeft: 'auto', borderRadius: 4 }} />
        <Bone w="100px" h={26} style={{ borderRadius: 4 }} />
      </div>
      <Bone w="100%" h={480} style={{ borderRadius: 8 }} />
    </SkeletonCard>
  );
}

function CampaignsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Bone w="140px" h={14} mb={8} />
              <Bone w="80%" h={11} mb={6} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                {Array.from({ length: 3 }).map((_, j) => <Bone key={j} w="60px" h={20} style={{ borderRadius: 3 }} />)}
              </div>
            </div>
            <div style={{ width: '140px' }}>
              <Bone w="100%" h={80} style={{ borderRadius: 6 }} />
            </div>
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

function MitreSkeleton() {
  return (
    <SkeletonCard>
      <Bone w="160px" h={12} mb={16} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '20px' }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <Bone key={i} w="100%" h={64} style={{ borderRadius: 6 }} />
        ))}
      </div>
      <Bone w="180px" h={12} mb={12} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
          <Bone w="70px" h={11} />
          <Bone w={`${30 + (i % 5) * 12}%`} h={8} style={{ borderRadius: 2 }} />
          <Bone w="30px" h={11} style={{ marginLeft: 'auto' }} />
        </div>
      ))}
    </SkeletonCard>
  );
}

function CorrelationsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <SkeletonCard style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div>
          <Bone w="140px" h={10} mb={8} />
          <Bone w="80px" h={28} />
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <Bone w="40px" h={20} mb={4} />
              <Bone w="60px" h={10} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <Bone w="160px" h={30} style={{ borderRadius: 5 }} />
          <Bone w="200px" h={30} style={{ borderRadius: 5 }} />
        </div>
      </SkeletonCard>
      {/* Pair rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: 72 }}>
              <Bone w="50px" h={22} mb={4} />
              <Bone w="72px" h={3} style={{ borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Bone w="55px" h={9} mb={5} />
                <Bone w={`${50 + (i % 4) * 10}%`} h={12} />
              </div>
              <Bone w="24px" h={14} />
              <div style={{ flex: 1 }}>
                <Bone w="55px" h={9} mb={5} />
                <Bone w={`${45 + (i % 3) * 12}%`} h={12} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Bone w="80px" h={22} style={{ borderRadius: 3 }} />
              <Bone w="70px" h={22} style={{ borderRadius: 3 }} />
            </div>
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

function HeatmapSkeleton() {
  return (
    <SkeletonCard>
      <Bone w="140px" h={12} mb={20} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <Bone w="100px" h={11} />
            <Bone w="40px" h={11} />
          </div>
          <Bone w={`${40 + (i % 4) * 15}%`} h={20} style={{ borderRadius: 3 }} />
        </div>
      ))}
    </SkeletonCard>
  );
}

function RecommendationsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Bone w="60px" h={22} style={{ borderRadius: 4, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Bone w="200px" h={13} mb={8} />
              <Bone w="90%" h={10} mb={5} />
              <Bone w="75%" h={10} mb={5} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <Bone w="80px" h={20} style={{ borderRadius: 3 }} />
                <Bone w="80px" h={20} style={{ borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

const SKELETON_MAP = {
  'Incidents':      <IncidentsSkeleton />,
  'Campaign Map':   <CampaignMapSkeleton />,
  'Campaigns':      <CampaignsSkeleton />,
  'MITRE':          <MitreSkeleton />,
  'Correlations':   <CorrelationsSkeleton />,
  'Risk Heatmap':   <HeatmapSkeleton />,
  'Recommendations':<RecommendationsSkeleton />,
};

export default function SkeletonLoader({ tab }) {
  return (
    <div className="tab-content">
      {SKELETON_MAP[tab] || <IncidentsSkeleton />}
    </div>
  );
}
