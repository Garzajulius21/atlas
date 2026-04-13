"""
MITRE ATT&CK gap analysis for ATLAS.
Identifies which tactics and techniques are present in the incident data,
surfaces coverage gaps, and flags high-frequency techniques.
"""

from typing import List, Dict
from collections import Counter

# ATT&CK Enterprise tactics in kill-chain order
TACTICS = [
    'TA0001',  # Initial Access
    'TA0002',  # Execution
    'TA0003',  # Persistence
    'TA0004',  # Privilege Escalation
    'TA0005',  # Defense Evasion
    'TA0006',  # Credential Access
    'TA0007',  # Discovery
    'TA0008',  # Lateral Movement
    'TA0009',  # Collection
    'TA0010',  # Exfiltration
    'TA0011',  # Command and Control
    'TA0040',  # Impact
]

TACTIC_NAMES = {
    'TA0001': 'Initial Access',
    'TA0002': 'Execution',
    'TA0003': 'Persistence',
    'TA0004': 'Privilege Escalation',
    'TA0005': 'Defense Evasion',
    'TA0006': 'Credential Access',
    'TA0007': 'Discovery',
    'TA0008': 'Lateral Movement',
    'TA0009': 'Collection',
    'TA0010': 'Exfiltration',
    'TA0011': 'Command and Control',
    'TA0040': 'Impact',
}

# Technique → primary tactic mapping (subset of common Defender-reported techniques)
TECHNIQUE_TACTIC_MAP = {
    'T1078': 'TA0001',  # Valid Accounts
    'T1190': 'TA0001',  # Exploit Public-Facing Application
    'T1566': 'TA0001',  # Phishing
    'T1133': 'TA0001',  # External Remote Services
    'T1059': 'TA0002',  # Command and Scripting Interpreter
    'T1204': 'TA0002',  # User Execution
    'T1047': 'TA0002',  # Windows Management Instrumentation
    'T1053': 'TA0003',  # Scheduled Task/Job
    'T1547': 'TA0003',  # Boot/Logon Autostart Execution
    'T1543': 'TA0003',  # Create/Modify System Process
    'T1068': 'TA0004',  # Exploitation for Privilege Escalation
    'T1548': 'TA0004',  # Abuse Elevation Control Mechanism
    'T1055': 'TA0004',  # Process Injection
    'T1036': 'TA0005',  # Masquerading
    'T1070': 'TA0005',  # Indicator Removal
    'T1027': 'TA0005',  # Obfuscated Files or Information
    'T1562': 'TA0005',  # Impair Defenses
    'T1003': 'TA0006',  # OS Credential Dumping
    'T1110': 'TA0006',  # Brute Force
    'T1555': 'TA0006',  # Credentials from Password Stores
    'T1087': 'TA0007',  # Account Discovery
    'T1082': 'TA0007',  # System Information Discovery
    'T1083': 'TA0007',  # File and Directory Discovery
    'T1021': 'TA0008',  # Remote Services
    'T1570': 'TA0008',  # Lateral Tool Transfer
    'T1534': 'TA0008',  # Internal Spearphishing
    'T1005': 'TA0009',  # Data from Local System
    'T1074': 'TA0009',  # Data Staged
    'T1041': 'TA0010',  # Exfiltration Over C2 Channel
    'T1048': 'TA0010',  # Exfiltration Over Alternative Protocol
    'T1071': 'TA0011',  # Application Layer Protocol
    'T1095': 'TA0011',  # Non-Application Layer Protocol
    'T1572': 'TA0011',  # Protocol Tunneling
    'T1486': 'TA0040',  # Data Encrypted for Impact
    'T1489': 'TA0040',  # Service Stop
    'T1490': 'TA0040',  # Inhibit System Recovery
    'T1485': 'TA0040',  # Data Destruction
}


def _extract_techniques(records: List[Dict]) -> List[str]:
    techs = []
    for rec in records:
        raw = rec.get('MitreTechniques', '') or ''
        for t in raw.split(','):
            t = t.strip().upper()
            # Accept TXXXXs and TXXXX.XXX sub-techniques
            if t and (t.startswith('T') and len(t) >= 5):
                # Normalise sub-technique separators
                base = t.split('.')[0]
                techs.append(base)
    return techs


def analyse_mitre(records: List[Dict]) -> Dict:
    """
    Returns:
        {
          'technique_counts': {T1059: 12, ...},
          'tactic_coverage': [
            {
              'id': 'TA0001', 'name': 'Initial Access', 'count': 5,
              'techniques': [...],
              'total_known_techniques': 4,     # techniques in our map for this tactic
              'severity_breakdown': {'High': 2, 'Medium': 2, 'Low': 1, 'Informational': 0},
            },
            ...
          ],
          'top_techniques': [{technique, count, tactic_id, tactic_name}, ...],
          'covered_tactics': [...tactic IDs],
          'gap_tactics': [...tactic IDs],
          'total_unique_techniques': N,
        }
    """
    all_techs = _extract_techniques(records)
    tech_counts = Counter(all_techs)

    # Pre-compute severity breakdown per tactic:
    # For each record, find which tactics its techniques belong to and bucket the severity.
    SEVER_KEYS = ['High', 'Medium', 'Low', 'Informational']
    tactic_severity: Dict[str, Dict[str, int]] = {
        tac: {k: 0 for k in SEVER_KEYS} for tac in TACTICS
    }
    for rec in records:
        raw = rec.get('MitreTechniques', '') or ''
        sev = rec.get('Severity', 'Informational')
        if sev not in SEVER_KEYS:
            sev = 'Informational'
        seen_tacs = set()
        for t in raw.split(','):
            t = t.strip().upper().split('.')[0]
            tac = TECHNIQUE_TACTIC_MAP.get(t)
            if tac and tac not in seen_tacs:
                tactic_severity[tac][sev] += 1
                seen_tacs.add(tac)  # count each tactic once per incident

    # Count known techniques per tactic from our mapping table
    known_per_tactic: Dict[str, int] = {tac: 0 for tac in TACTICS}
    for tac in TECHNIQUE_TACTIC_MAP.values():
        if tac in known_per_tactic:
            known_per_tactic[tac] += 1

    # Build tactic coverage
    tactic_coverage = []
    covered = set()
    for tac_id in TACTICS:
        tac_techs = [t for t in tech_counts if TECHNIQUE_TACTIC_MAP.get(t) == tac_id]
        count = sum(tech_counts[t] for t in tac_techs)
        if count > 0:
            covered.add(tac_id)
        tactic_coverage.append({
            'id': tac_id,
            'name': TACTIC_NAMES[tac_id],
            'count': count,
            'techniques': tac_techs,
            'total_known_techniques': known_per_tactic[tac_id],
            'severity_breakdown': tactic_severity[tac_id],
        })

    gap_tactics = [t for t in TACTICS if t not in covered]

    # Top 15 techniques
    top_techs = []
    for tech, count in tech_counts.most_common(15):
        tac = TECHNIQUE_TACTIC_MAP.get(tech)
        top_techs.append({
            'technique': tech,
            'count': count,
            'tactic_id': tac,
            'tactic_name': TACTIC_NAMES.get(tac, 'Unknown') if tac else 'Unknown',
        })

    return {
        'technique_counts': dict(tech_counts),
        'tactic_coverage': tactic_coverage,
        'top_techniques': top_techs,
        'covered_tactics': list(covered),
        'gap_tactics': gap_tactics,
        'total_unique_techniques': len(tech_counts),
    }
