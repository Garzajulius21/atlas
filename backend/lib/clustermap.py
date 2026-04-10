"""
2D cluster map generator for ATLAS.
Uses Multidimensional Scaling (MDS) to project the correlation matrix
into 2D space so incidents can be plotted as a scatter chart.

MDS chosen over PCA because it works directly on precomputed
distance/dissimilarity matrices — no feature vectors needed.
"""

import numpy as np
from typing import List, Dict
from sklearn.manifold import MDS


def build_cluster_map(records: List[Dict], matrix: List[List[float]], cluster_result: Dict) -> List[Dict]:
    """
    Returns a list of point objects, one per incident:
        [
            {
                'x': float,
                'y': float,
                'incidentId': str,
                'title': str,
                'severity': str,
                'clusterId': int | None,   # None = noise
                'clusterLabel': str,
                'department': str,
            },
            ...
        ]
    """
    n = len(records)
    if n == 0:
        return []

    # Build incident → cluster lookup
    inc_to_cluster = {}
    for cluster in cluster_result.get('clusters', []):
        for inc_id in cluster['incident_ids']:
            inc_to_cluster[inc_id] = {
                'id': cluster['id'],
                'label': cluster['label'],
            }

    # Single point — return at origin
    if n == 1:
        rec = records[0]
        inc_id = rec.get('IncidentId', '0')
        c = inc_to_cluster.get(inc_id)
        return [{
            'x': 0.0, 'y': 0.0,
            'incidentId': inc_id,
            'title': rec.get('Title', ''),
            'severity': rec.get('Severity', 'Informational'),
            'clusterId': c['id'] if c else None,
            'clusterLabel': c['label'] if c else 'Isolated',
            'department': rec.get('Department', ''),
        }]

    # Convert similarity → distance
    sim = np.array(matrix, dtype=float)
    sim = np.clip(sim, 0.0, 1.0)
    dist = 1.0 - sim
    # Ensure diagonal is exactly 0
    np.fill_diagonal(dist, 0.0)

    # MDS projection to 2D
    try:
        mds = MDS(
            n_components=2,
            dissimilarity='precomputed',
            random_state=42,
            normalized_stress='auto',
            n_init=4,
            max_iter=300,
        )
        coords = mds.fit_transform(dist)
    except Exception:
        # Fallback: random layout if MDS fails (e.g. degenerate matrix)
        rng = np.random.default_rng(42)
        coords = rng.uniform(-1, 1, (n, 2))

    # Normalise to [-100, 100] range for the chart
    for axis in range(2):
        col = coords[:, axis]
        span = col.max() - col.min()
        if span > 0:
            coords[:, axis] = ((col - col.min()) / span) * 200 - 100

    points = []
    for i, rec in enumerate(records):
        inc_id = rec.get('IncidentId', str(i))
        c = inc_to_cluster.get(inc_id)
        points.append({
            'x': round(float(coords[i, 0]), 2),
            'y': round(float(coords[i, 1]), 2),
            'incidentId': inc_id,
            'title': rec.get('Title', ''),
            'severity': rec.get('Severity', 'Informational'),
            'clusterId': c['id'] if c else None,
            'clusterLabel': c['label'] if c else 'Isolated',
            'department': rec.get('Department', ''),
        })

    return points
