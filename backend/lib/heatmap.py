"""
Departmental risk heatmap for ATLAS.
Aggregates incidents by department and severity to produce a risk matrix.
"""

from typing import List, Dict
from collections import defaultdict

SEVERITY_SCORE = {'High': 4, 'Medium': 2, 'Low': 1, 'Informational': 0}


def build_heatmap(records: List[Dict]) -> Dict:
    """
    Returns:
        {
          'departments': [
            {
              'name': str,
              'total': int,
              'risk_score': float,
              'severity_breakdown': {'High': N, 'Medium': N, 'Low': N, 'Informational': N},
              'top_techniques': [str, ...],
              'incident_ids': [str, ...],
            },
            ...  sorted by risk_score desc
          ],
          'max_risk_score': float,
          'total_departments': int,
          'unassigned_count': int,
        }
    """
    dept_data: Dict[str, Dict] = defaultdict(lambda: {
        'total': 0,
        'severity_breakdown': {'High': 0, 'Medium': 0, 'Low': 0, 'Informational': 0},
        'tech_counts': defaultdict(int),
        'incident_ids': [],
    })

    unassigned = 0

    for rec in records:
        dept = (rec.get('Department') or '').strip()
        if not dept or dept == 'None':
            dept = 'Unassigned'
            unassigned += 1

        sev = rec.get('Severity', 'Informational')
        inc_id = rec.get('IncidentId', '')

        dept_data[dept]['total'] += 1
        if sev in dept_data[dept]['severity_breakdown']:
            dept_data[dept]['severity_breakdown'][sev] += 1

        dept_data[dept]['incident_ids'].append(inc_id)

        raw_techs = rec.get('MitreTechniques', '') or ''
        for t in raw_techs.split(','):
            t = t.strip().upper()
            if t:
                dept_data[dept]['tech_counts'][t] += 1

    departments = []
    for name, data in dept_data.items():
        sev_bd = data['severity_breakdown']
        risk_score = (
            sev_bd['High'] * SEVERITY_SCORE['High'] +
            sev_bd['Medium'] * SEVERITY_SCORE['Medium'] +
            sev_bd['Low'] * SEVERITY_SCORE['Low'] +
            sev_bd['Informational'] * SEVERITY_SCORE['Informational']
        )
        top_techs = sorted(data['tech_counts'], key=data['tech_counts'].get, reverse=True)[:5]
        departments.append({
            'name': name,
            'total': data['total'],
            'risk_score': risk_score,
            'severity_breakdown': sev_bd,
            'top_techniques': top_techs,
            'incident_ids': data['incident_ids'],
        })

    departments.sort(key=lambda d: d['risk_score'], reverse=True)
    max_risk = departments[0]['risk_score'] if departments else 0

    return {
        'departments': departments,
        'max_risk_score': max_risk,
        'total_departments': len(departments),
        'unassigned_count': unassigned,
    }
