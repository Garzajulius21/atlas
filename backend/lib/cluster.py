"""
DBSCAN clustering for ATLAS.
Takes the correlation matrix (as a distance/dissimilarity matrix) and groups
incidents into attack campaign clusters.

DBSCAN chosen because:
  - No need to specify K upfront
  - Naturally identifies noise (outliers, isolated incidents)
  - Handles non-convex cluster shapes common in attack campaigns
"""

import os
import numpy as np
from typing import List, Dict
from sklearn.cluster import DBSCAN

MIN_CLUSTER_SIZE = int(os.getenv('MIN_CLUSTER_SIZE', 3))
CORRELATION_THRESHOLD = float(os.getenv('CORRELATION_THRESHOLD', 0.65))


def _similarity_to_distance(matrix: List[List[float]]) -> np.ndarray:
    arr = np.array(matrix, dtype=float)
    # Clamp to [0,1] to avoid floating-point noise
    arr = np.clip(arr, 0.0, 1.0)
    return 1.0 - arr


def cluster_incidents(records: List[Dict], matrix: List[List[float]]) -> Dict:
    """
    Run DBSCAN on the precomputed similarity matrix.

    Returns:
        {
          'clusters': [
            {
              'id': 0,
              'label': 'Cluster 0',
              'incident_ids': [...],
              'size': N,
              'severity_breakdown': {'High': N, ...},
              'top_techniques': [...],
              'time_span_hours': float,
              'cohesion': float,   # mean intra-cluster similarity
            },
            ...
          ],
          'noise': [incident_ids of unclustered incidents],
          'total_clusters': N,
          'total_noise': N,
        }
    """
    n = len(records)
    if n == 0:
        return {'clusters': [], 'noise': [], 'total_clusters': 0, 'total_noise': 0}

    if n == 1:
        return {
            'clusters': [],
            'noise': [records[0].get('IncidentId', '0')],
            'total_clusters': 0,
            'total_noise': 1
        }

    dist_matrix = _similarity_to_distance(matrix)

    # eps = 1 - threshold: points closer than eps (more similar than threshold) are neighbours
    eps = 1.0 - CORRELATION_THRESHOLD

    db = DBSCAN(
        eps=eps,
        min_samples=MIN_CLUSTER_SIZE,
        metric='precomputed'
    ).fit(dist_matrix)

    labels = db.labels_  # -1 = noise

    clusters = {}
    noise_ids = []

    for idx, label in enumerate(labels):
        inc = records[idx]
        inc_id = inc.get('IncidentId', str(idx))
        if label == -1:
            noise_ids.append(inc_id)
        else:
            if label not in clusters:
                clusters[label] = {'indices': [], 'incidents': []}
            clusters[label]['indices'].append(idx)
            clusters[label]['incidents'].append(inc)

    cluster_list = []
    for label, data in sorted(clusters.items()):
        indices = data['indices']
        incidents = data['incidents']

        # Severity breakdown
        sev_breakdown = {}
        for inc in incidents:
            s = inc.get('Severity', 'Unknown')
            sev_breakdown[s] = sev_breakdown.get(s, 0) + 1

        # Top MITRE techniques (by frequency)
        tech_counts = {}
        for inc in incidents:
            raw = inc.get('MitreTechniques', '') or ''
            for t in raw.split(','):
                t = t.strip().upper()
                if t:
                    tech_counts[t] = tech_counts.get(t, 0) + 1
        top_techs = sorted(tech_counts, key=tech_counts.get, reverse=True)[:8]

        # Time span
        time_span = _cluster_time_span(incidents)

        # Cohesion: mean pairwise similarity within cluster
        cohesion = _cluster_cohesion(indices, matrix)

        cluster_list.append({
            'id': int(label),
            'label': f'Campaign {label + 1}',
            'incident_ids': [inc.get('IncidentId', str(i)) for i, inc in zip(indices, incidents)],
            'size': len(incidents),
            'severity_breakdown': sev_breakdown,
            'top_techniques': top_techs,
            'time_span_hours': time_span,
            'cohesion': round(cohesion, 3),
        })

    # Sort by size descending
    cluster_list.sort(key=lambda c: c['size'], reverse=True)

    return {
        'clusters': cluster_list,
        'noise': noise_ids,
        'total_clusters': len(cluster_list),
        'total_noise': len(noise_ids),
    }


def _cluster_time_span(incidents: List[Dict]) -> float:
    from datetime import datetime, timezone
    times = []
    for inc in incidents:
        ts = inc.get('CreatedTime', '')
        for fmt in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S',
                    '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%SZ',
                    '%Y-%m-%dT%H:%M:%S.%f'):
            try:
                dt = datetime.strptime(str(ts)[:26], fmt).replace(tzinfo=timezone.utc)
                times.append(dt)
                break
            except (ValueError, TypeError):
                continue
    if len(times) < 2:
        return 0.0
    span = (max(times) - min(times)).total_seconds() / 3600
    return round(span, 1)


def _cluster_cohesion(indices: List[int], matrix: List[List[float]]) -> float:
    if len(indices) < 2:
        return 1.0
    scores = []
    for i in range(len(indices)):
        for j in range(i + 1, len(indices)):
            scores.append(matrix[indices[i]][indices[j]])
    return sum(scores) / len(scores) if scores else 0.0
