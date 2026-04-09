"""
Correlation matrix builder for ATLAS.
Produces pairwise similarity scores between incidents based on:
  - Shared MITRE techniques (Jaccard)
  - Time proximity (exponential decay within TIME_WINDOW_HOURS)
  - Shared hashed entities (user, host, IP overlap)
  - Severity weighting
"""

import os
import math
from datetime import datetime, timezone
from typing import List, Dict

TIME_WINDOW_HOURS = float(os.getenv('TIME_WINDOW_HOURS', 72))


def _parse_time(ts: str) -> datetime | None:
    for fmt in ('%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%d %H:%M:%SZ', '%Y-%m-%dT%H:%M:%S.%f'):
        try:
            dt = datetime.strptime(ts[:26], fmt)
            return dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
    return None


def _mitre_set(record: dict) -> set:
    raw = record.get('MitreTechniques', '') or ''
    return {t.strip().upper() for t in raw.split(',') if t.strip()}


def _entity_set(record: dict) -> set:
    entities = set()
    for field in ('AccountUpn', 'AccountName', 'DeviceName', 'HostName',
                  'IpAddress', 'RemoteIP', 'SourceIp', 'DestinationIp'):
        v = record.get(field)
        if v and v != 'None':
            entities.add(v)
    return entities


SEVERITY_WEIGHT = {'High': 1.0, 'Medium': 0.7, 'Low': 0.4, 'Informational': 0.2}


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    union = a | b
    return len(a & b) / len(union)


def _time_score(ts_a: datetime | None, ts_b: datetime | None) -> float:
    if ts_a is None or ts_b is None:
        return 0.0
    diff_hours = abs((ts_a - ts_b).total_seconds()) / 3600
    # exponential decay: score=1 at 0h, ~0.37 at TIME_WINDOW, ~0 beyond 2x
    return math.exp(-diff_hours / max(TIME_WINDOW_HOURS, 1))


def build_correlation_matrix(records: List[Dict]) -> List[List[float]]:
    """
    Returns an N×N symmetric float matrix of similarity scores [0, 1].
    """
    n = len(records)
    if n == 0:
        return []

    # Pre-compute per-record values
    mitre_sets = [_mitre_set(r) for r in records]
    entity_sets = [_entity_set(r) for r in records]
    times = [_parse_time(r.get('CreatedTime', '')) for r in records]
    sev_w = [SEVERITY_WEIGHT.get(r.get('Severity', ''), 0.4) for r in records]

    matrix = [[0.0] * n for _ in range(n)]

    for i in range(n):
        matrix[i][i] = 1.0
        for j in range(i + 1, n):
            # Component scores
            mitre_sim  = _jaccard(mitre_sets[i], mitre_sets[j])
            entity_sim = _jaccard(entity_sets[i], entity_sets[j])
            time_sim   = _time_score(times[i], times[j])
            sev_sim    = 1.0 - abs(sev_w[i] - sev_w[j])

            # Weighted combination
            # MITRE overlap is strongest signal; entity overlap second
            score = (
                0.45 * mitre_sim +
                0.30 * entity_sim +
                0.15 * time_sim +
                0.10 * sev_sim
            )
            matrix[i][j] = round(score, 4)
            matrix[j][i] = round(score, 4)

    return matrix


def top_correlations(records: List[Dict], matrix: List[List[float]],
                     threshold: float = 0.35, limit: int = 50) -> List[Dict]:
    """
    Return a list of the strongest incident pairs above threshold.
    Used for the correlation explorer in the UI.
    """
    pairs = []
    n = len(records)
    for i in range(n):
        for j in range(i + 1, n):
            score = matrix[i][j]
            if score >= threshold:
                pairs.append({
                    'a': records[i].get('IncidentId', str(i)),
                    'b': records[j].get('IncidentId', str(j)),
                    'score': score,
                    'shared_mitre': list(_mitre_set(records[i]) & _mitre_set(records[j])),
                    'shared_entities': list(_entity_set(records[i]) & _entity_set(records[j])),
                })
    pairs.sort(key=lambda x: x['score'], reverse=True)
    return pairs[:limit]
