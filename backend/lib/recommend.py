"""
Hardening recommendations engine for ATLAS.
Generates prioritised, actionable recommendations based on:
  - Cluster analysis (recurring campaigns)
  - MITRE gap analysis (uncovered tactics)
  - Departmental risk (top offenders)
  - High-frequency techniques
"""

from typing import List, Dict

# Recommendation templates keyed by technique or tactic
TECHNIQUE_RECS = {
    'T1078': {
        'title': 'Enforce MFA for all accounts with Valid Account abuse',
        'detail': 'Privileged accounts are being used in suspicious contexts. Enable MFA on all accounts, review guest/service account permissions, and alert on impossible travel or unfamiliar location sign-ins.',
        'priority': 'Critical',
        'control': 'Identity & Access Management',
    },
    'T1566': {
        'title': 'Harden email filtering and phishing simulation training',
        'detail': 'Phishing is the dominant initial access vector. Enable Defender for Office 365 Safe Links & Attachments, run Attack Simulator campaigns monthly, and enforce DMARC/DKIM/SPF.',
        'priority': 'Critical',
        'control': 'Email Security',
    },
    'T1059': {
        'title': 'Restrict script interpreter usage via AppLocker / WDAC',
        'detail': 'PowerShell, CMD, and WScript are being abused. Enable PowerShell Constrained Language Mode for non-admin users, block unsigned scripts, and deploy AMSI-aware AV.',
        'priority': 'High',
        'control': 'Endpoint Hardening',
    },
    'T1003': {
        'title': 'Enable Credential Guard and restrict LSASS access',
        'detail': 'Credential dumping is active. Enable Windows Credential Guard, configure RunAsPPL for LSASS, and alert on suspicious access to lsass.exe.',
        'priority': 'Critical',
        'control': 'Credential Protection',
    },
    'T1110': {
        'title': 'Enforce account lockout and review legacy auth protocols',
        'detail': 'Brute force activity detected. Set lockout threshold ≤10 attempts, disable NTLM/Basic auth where possible, and block legacy authentication in Entra ID Conditional Access.',
        'priority': 'High',
        'control': 'Identity & Access Management',
    },
    'T1021': {
        'title': 'Restrict lateral movement via RDP and remote services',
        'detail': 'Lateral movement via remote services is present. Limit RDP exposure, require JIT access, enforce network segmentation, and enable Defender for Endpoint network protection.',
        'priority': 'High',
        'control': 'Network Segmentation',
    },
    'T1486': {
        'title': 'Implement and test immutable backups for ransomware resilience',
        'detail': 'Data encryption for impact (ransomware) has been observed. Validate offline/immutable backup coverage, test restore procedures, and ensure EDR tamper protection is enabled.',
        'priority': 'Critical',
        'control': 'Data Protection',
    },
    'T1562': {
        'title': 'Protect security tooling from tampering',
        'detail': 'Defenders are being disabled or evaded. Enable Defender tamper protection, alert on service termination of security tools, and use Privileged Identity Management for admin roles.',
        'priority': 'High',
        'control': 'Endpoint Hardening',
    },
    'T1055': {
        'title': 'Enable Attack Surface Reduction rules for process injection',
        'detail': 'Process injection techniques are in use. Enable ASR rules: Block process creations from PSExec/WMI, block injection into lsass, and enable kernel DMA protection.',
        'priority': 'High',
        'control': 'Endpoint Hardening',
    },
    'T1190': {
        'title': 'Patch internet-facing services and enable WAF',
        'detail': 'Public-facing application exploitation detected. Prioritise patching for internet-exposed services, deploy a WAF, and review VPN/Citrix/Exchange exposure.',
        'priority': 'Critical',
        'control': 'Vulnerability Management',
    },
}

TACTIC_GAP_RECS = {
    'TA0007': {
        'title': 'Deploy deception technology to detect discovery activity',
        'detail': 'Limited visibility into Discovery-phase activity. Deploy honeypot accounts/files, enable AD object auditing, and alert on mass enumeration of users/groups/shares.',
        'priority': 'Medium',
        'control': 'Detection Engineering',
    },
    'TA0008': {
        'title': 'Increase lateral movement detection coverage',
        'detail': 'Lateral Movement tactic has low detection coverage. Deploy Defender for Identity, enable advanced hunting for PtH/PtT, and monitor for anomalous admin share access.',
        'priority': 'High',
        'control': 'Detection Engineering',
    },
    'TA0010': {
        'title': 'Implement data loss prevention for exfiltration vectors',
        'detail': 'No exfiltration detections — coverage gap or no incidents yet. Deploy Microsoft Purview DLP, monitor large outbound transfers, and restrict USB/cloud upload channels.',
        'priority': 'Medium',
        'control': 'Data Protection',
    },
    'TA0009': {
        'title': 'Alert on bulk file access and staging behaviour',
        'detail': 'Collection-phase activity is not covered. Enable Defender for Cloud Apps file policy alerts, and create custom KQL rules for bulk SharePoint/OneDrive downloads.',
        'priority': 'Medium',
        'control': 'Detection Engineering',
    },
}


def generate_recommendations(
    mitre_analysis: Dict,
    cluster_result: Dict,
    heatmap: Dict,
) -> List[Dict]:
    """
    Returns a prioritised list of recommendation objects:
        [{'title', 'detail', 'priority', 'control', 'source', 'evidence'}, ...]
    """
    seen_titles = set()
    recs = []

    def add_rec(template: Dict, source: str, evidence: str):
        if template['title'] in seen_titles:
            return
        seen_titles.add(template['title'])
        recs.append({**template, 'source': source, 'evidence': evidence})

    # 1. High-frequency technique recommendations
    for item in mitre_analysis.get('top_techniques', []):
        tech = item['technique']
        count = item['count']
        if tech in TECHNIQUE_RECS:
            add_rec(
                TECHNIQUE_RECS[tech],
                source='Technique Frequency',
                evidence=f'{tech} seen in {count} incident{"s" if count > 1 else ""}'
            )

    # 2. Recurring campaign recommendations (if clusters exist)
    clusters = cluster_result.get('clusters', [])
    if len(clusters) >= 2:
        add_rec({
            'title': 'Investigate recurring campaign patterns across clusters',
            'detail': f'{len(clusters)} distinct attack campaigns identified. Review shared infrastructure, TTPs, and timing for threat actor attribution. Prioritise containment of the largest cluster.',
            'priority': 'Critical',
            'control': 'Incident Response',
        }, source='Cluster Analysis', evidence=f'{len(clusters)} campaigns detected')

    if clusters:
        largest = clusters[0]
        if largest['size'] >= 5:
            techs = ', '.join(largest['top_techniques'][:3]) or 'unknown'
            add_rec({
                'title': f'Prioritise containment of Campaign 1 ({largest["size"]} incidents)',
                'detail': f'Largest campaign spans {largest["time_span_hours"]:.0f} hours with techniques: {techs}. Conduct focused threat hunt, isolate affected assets, and reset compromised credentials.',
                'priority': 'Critical',
                'control': 'Incident Response',
            }, source='Cluster Analysis',
               evidence=f'Campaign 1: {largest["size"]} incidents, cohesion {largest["cohesion"]}')

    # 3. Tactic gap recommendations
    gap_tactics = mitre_analysis.get('gap_tactics', [])
    for tac in gap_tactics:
        if tac in TACTIC_GAP_RECS:
            add_rec(
                TACTIC_GAP_RECS[tac],
                source='MITRE Gap',
                evidence=f'No incidents mapped to {tac}'
            )

    # 4. High-risk department
    depts = heatmap.get('departments', [])
    if depts and depts[0]['name'] != 'Unassigned':
        top_dept = depts[0]
        add_rec({
            'title': f'Focus hardening efforts on {top_dept["name"]} (highest risk)',
            'detail': f'{top_dept["name"]} accounts for a risk score of {top_dept["risk_score"]} with {top_dept["total"]} incidents. Conduct a targeted security review: MFA coverage, endpoint posture, and privileged account hygiene.',
            'priority': 'High',
            'control': 'Risk Management',
        }, source='Departmental Risk',
           evidence=f'Risk score: {top_dept["risk_score"]}, {top_dept["total"]} incidents')

    # Sort: Critical → High → Medium → Low
    priority_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
    recs.sort(key=lambda r: priority_order.get(r.get('priority', 'Low'), 3))

    return recs
