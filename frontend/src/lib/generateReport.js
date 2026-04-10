/**
 * ATLAS Report Generator
 * Produces a two-tier text report from analysis state:
 *   - Executive Summary (CISO level, plain English)
 *   - Technical Report (SOC/analyst level, full detail)
 */

// Technique → plain English for executive summary
const TECHNIQUE_PLAIN = {
  T1003: 'credential theft',
  T1566: 'phishing attacks',
  T1059: 'malicious script execution',
  T1486: 'ransomware / file encryption',
  T1110: 'brute-force attacks',
  T1021: 'lateral movement via remote services',
  T1078: 'compromised account usage',
  T1055: 'process injection',
  T1562: 'security tool tampering',
  T1190: 'exploitation of internet-facing systems',
  T1490: 'backup deletion',
  T1489: 'service disruption',
  T1074: 'data staging for exfiltration',
  T1041: 'data exfiltration',
  T1071: 'command & control communication',
  T1053: 'scheduled task persistence',
  T1047: 'WMI abuse',
  T1036: 'process masquerading',
  T1027: 'obfuscated payload execution',
  T1068: 'privilege escalation exploit',
  T1548: 'privilege escalation via elevated controls',
  T1087: 'account enumeration',
  T1082: 'system reconnaissance',
  T1083: 'file system enumeration',
  T1555: 'credential harvesting from password stores',
};

// Priority ordering for recommendations
const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function techToPlain(tech) {
  return TECHNIQUE_PLAIN[tech] || tech;
}

function repeat(char, n) {
  return char.repeat(n);
}

function box(text, char = '═') {
  const width = 60;
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return [
    '╔' + repeat(char, width) + '╗',
    '║' + ' '.repeat(pad) + text + ' '.repeat(width - pad - text.length) + '║',
    '╚' + repeat(char, width) + '╝',
  ].join('\n');
}

function section(title) {
  return `\n${'─'.repeat(60)}\n${title.toUpperCase()}\n${'─'.repeat(60)}`;
}

function humanTime(hours) {
  if (hours < 1) return 'less than 1 hour';
  if (hours < 24) return `${Math.round(hours)} hour${Math.round(hours) !== 1 ? 's' : ''}`;
  if (hours < 168) return `${Math.round(hours / 24)} day${Math.round(hours / 24) !== 1 ? 's' : ''}`;
  return `${Math.round(hours / 168)} week${Math.round(hours / 168) !== 1 ? 's' : ''}`;
}

function overallRiskLevel(clusters, recommendations) {
  const hasCriticalCampaign = clusters?.clusters?.some(c =>
    (c.severity_breakdown?.High || 0) >= 2
  );
  const criticalRecs = recommendations?.recommendations?.filter(r => r.priority === 'Critical').length || 0;
  if (hasCriticalCampaign || criticalRecs >= 3) return 'CRITICAL';
  if (criticalRecs >= 1) return 'HIGH';
  return 'MEDIUM';
}

function campaignVerb(techniques) {
  const plains = techniques.slice(0, 2).map(techToPlain);
  if (!plains.length) return 'coordinated malicious activity';
  return plains.join(' and ');
}

// ─── EXECUTIVE SUMMARY ───────────────────────────────────────────────────────

function buildExecutiveSummary(date, incidents, clusters, mitre, heatmap, recommendations) {
  const totalIncidents = incidents?.length || 0;
  const totalCampaigns = clusters?.total_clusters || 0;
  const totalIsolated = clusters?.total_noise || 0;
  const criticalRecs = recommendations?.recommendations?.filter(r => r.priority === 'Critical') || [];
  const highRecs = recommendations?.recommendations?.filter(r => r.priority === 'High') || [];
  const riskLevel = overallRiskLevel(clusters, recommendations);
  const topDepts = heatmap?.departments?.filter(d => d.name !== 'Unassigned').slice(0, 3) || [];
  const gapTactics = mitre?.gap_tactics || [];

  const lines = [];

  lines.push(box('ATLAS  —  EXECUTIVE THREAT REPORT'));
  lines.push('');
  lines.push(`  Date:        ${date}`);
  lines.push(`  Risk Level:  ${riskLevel}`);
  lines.push(`  CONFIDENTIAL — FOR LEADERSHIP USE`);
  lines.push('');

  // Situation
  lines.push(section('Situation'));
  lines.push('');
  if (totalCampaigns > 0) {
    lines.push(`  ${totalCampaigns} coordinated attack campaign${totalCampaigns > 1 ? 's were' : ' was'} identified`);
    lines.push(`  across ${totalIncidents} security incidents. ${totalIsolated} additional isolated`);
    lines.push(`  incidents were recorded.`);
  } else {
    lines.push(`  ${totalIncidents} security incidents were analysed. No coordinated`);
    lines.push(`  attack campaigns were detected — incidents appear isolated.`);
  }

  if (topDepts.length > 0) {
    lines.push('');
    lines.push(`  Highest-risk departments:`);
    topDepts.forEach((d, i) => {
      const highCount = d.severity_breakdown?.High || 0;
      lines.push(`    ${i + 1}. ${d.name} — ${d.total} incident${d.total !== 1 ? 's' : ''}${highCount > 0 ? `, ${highCount} High severity` : ''}`);
    });
  }

  // Key findings
  lines.push(section('Key Findings'));
  lines.push('');

  const campaigns = clusters?.clusters || [];
  campaigns.slice(0, 4).forEach((c, i) => {
    const verb = campaignVerb(c.top_techniques);
    const highCount = c.severity_breakdown?.High || 0;
    const cohesionLabel = c.cohesion >= 0.7 ? 'likely a single threat actor'
      : c.cohesion >= 0.5 ? 'possibly coordinated activity'
      : 'loosely related activity';
    lines.push(`  ${i + 1}. ${c.label} — ${c.size} incidents over ${humanTime(c.time_span_hours)}`);
    lines.push(`     Involved ${verb}.`);
    if (highCount > 0) lines.push(`     ${highCount} High-severity incident${highCount > 1 ? 's' : ''} — ${cohesionLabel}.`);
    lines.push('');
  });

  if (gapTactics.length > 0) {
    lines.push(`  • Detection gaps exist across ${gapTactics.length} of 12 MITRE ATT&CK tactic${gapTactics.length > 1 ? 's' : ''}.`);
    lines.push(`    Attackers could operate undetected in these areas.`);
    lines.push('');
  }

  // Actions for leadership
  lines.push(section('Recommended Actions for Leadership'));
  lines.push('');

  const topActions = [...criticalRecs, ...highRecs].slice(0, 5);
  if (topActions.length === 0) {
    lines.push('  No immediate critical actions identified.');
  } else {
    topActions.forEach((r, i) => {
      lines.push(`  ${i + 1}. [${r.priority}] ${r.title}`);
    });
  }

  lines.push('');
  lines.push(`  The security team has been provided with a full technical`);
  lines.push(`  breakdown and step-by-step remediation guidance.`);

  lines.push('');
  lines.push(section('Overall Risk Assessment'));
  lines.push('');
  const riskDesc = {
    CRITICAL: 'Active campaigns with High-severity incidents require immediate containment.',
    HIGH:     'Significant threat activity detected. Prioritise critical recommendations.',
    MEDIUM:   'Moderate activity detected. Address recommendations in order of priority.',
  };
  lines.push(`  ${riskLevel} — ${riskDesc[riskLevel]}`);
  lines.push('');

  return lines.join('\n');
}

// ─── TECHNICAL REPORT ────────────────────────────────────────────────────────

function buildTechnicalReport(incidents, clusters, correlations, mitre, heatmap, recommendations) {
  const lines = [];

  lines.push(section('Technical Report — Campaign Analysis'));

  const campaigns = clusters?.clusters || [];
  if (campaigns.length === 0) {
    lines.push('\n  No campaigns detected.');
  } else {
    campaigns.forEach(c => {
      lines.push('');
      lines.push(`  ┌─ ${c.label} ${'─'.repeat(Math.max(0, 46 - c.label.length))}`);
      lines.push(`  │  Size:       ${c.size} incidents`);
      lines.push(`  │  Time span:  ${humanTime(c.time_span_hours)}`);
      lines.push(`  │  Cohesion:   ${Math.round(c.cohesion * 100)}%`);
      if (c.top_techniques.length > 0) {
        lines.push(`  │  Techniques: ${c.top_techniques.join(', ')}`);
      }
      const sevParts = ['High', 'Medium', 'Low', 'Informational']
        .filter(s => c.severity_breakdown?.[s] > 0)
        .map(s => `${s}: ${c.severity_breakdown[s]}`);
      lines.push(`  │  Severity:   ${sevParts.join('  ·  ')}`);
      lines.push(`  │  Incidents:  ${c.incident_ids.join(', ')}`);
      lines.push(`  └${'─'.repeat(50)}`);
    });
  }

  // MITRE
  lines.push(section('MITRE ATT&CK Coverage'));
  lines.push('');
  const covered = mitre?.tactic_coverage?.filter(t => t.count > 0) || [];
  const gaps = mitre?.gap_tactics || [];
  lines.push(`  Covered tactics (${covered.length}):`);
  covered.forEach(t => {
    lines.push(`    ✓  ${t.id}  ${t.name}  (${t.count} incident${t.count !== 1 ? 's' : ''})`);
  });
  lines.push('');
  lines.push(`  Coverage gaps (${gaps.length}):`);
  const tacticNames = {
    TA0001:'Initial Access', TA0002:'Execution', TA0003:'Persistence',
    TA0004:'Privilege Escalation', TA0005:'Defense Evasion', TA0006:'Credential Access',
    TA0007:'Discovery', TA0008:'Lateral Movement', TA0009:'Collection',
    TA0010:'Exfiltration', TA0011:'Command and Control', TA0040:'Impact',
  };
  gaps.forEach(t => lines.push(`    ✗  ${t}  ${tacticNames[t] || ''}`));

  lines.push('');
  lines.push(`  Top techniques by frequency:`);
  (mitre?.top_techniques || []).slice(0, 10).forEach(t => {
    lines.push(`    ${t.technique.padEnd(12)} ${t.count.toString().padStart(3)} incident${t.count !== 1 ? 's' : ''}  —  ${t.tactic_name}`);
  });

  // Department heatmap
  lines.push(section('Departmental Risk Heatmap'));
  lines.push('');
  lines.push('  Department'.padEnd(24) + 'Risk Score'.padEnd(12) + 'Incidents'.padEnd(12) + 'High');
  lines.push('  ' + '─'.repeat(52));
  (heatmap?.departments || []).forEach(d => {
    const h = d.severity_breakdown?.High || 0;
    lines.push(
      `  ${d.name.slice(0, 22).padEnd(22)}  ${String(d.risk_score).padEnd(12)}${String(d.total).padEnd(12)}${h > 0 ? h : '—'}`
    );
  });

  // Recommendations
  lines.push(section('Hardening Recommendations'));
  lines.push('');
  const recs = recommendations?.recommendations || [];
  recs.forEach((r, i) => {
    lines.push(`  ${i + 1}. [${r.priority}] ${r.title}`);
    lines.push(`     Control: ${r.control}`);
    lines.push(`     Source:  ${r.source} — ${r.evidence}`);
    lines.push(`     ${r.detail}`);
    lines.push('');
  });

  // Top correlations
  const pairs = correlations?.pairs || [];
  if (pairs.length > 0) {
    lines.push(section('Top Correlated Incident Pairs'));
    lines.push('');
    pairs.slice(0, 10).forEach(p => {
      lines.push(`  ${p.a}  ↔  ${p.b}   ${Math.round(p.score * 100)}% match`);
      if (p.shared_mitre?.length > 0) {
        lines.push(`     Shared techniques: ${p.shared_mitre.join(', ')}`);
      }
      if (p.shared_entities?.length > 0) {
        lines.push(`     Shared entities:   ${p.shared_entities.join(', ')}`);
      }
    });
  }

  lines.push('');
  lines.push('─'.repeat(60));
  lines.push('Generated by ATLAS — Threat Correlation & Clustering Framework');
  lines.push('Local · Privacy-First · All PII SHA-256 hashed');
  lines.push('─'.repeat(60));

  return lines.join('\n');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateTextReport({ incidents, clusters, correlations, mitre, heatmap, recommendations }) {
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const exec = buildExecutiveSummary(date, incidents, clusters, mitre, heatmap, recommendations);
  const tech = buildTechnicalReport(incidents, clusters, correlations, mitre, heatmap, recommendations);

  return [exec, tech].join('\n\n' + '═'.repeat(60) + '\n\n');
}

export function generateJsonReport({ incidents, clusters, correlations, mitre, heatmap, recommendations }) {
  return JSON.stringify({
    generated: new Date().toISOString(),
    tool: 'ATLAS — Threat Correlation & Clustering Framework',
    privacy: 'All PII SHA-256 hashed. No raw usernames, hostnames, or IPs.',
    summary: {
      total_incidents: incidents?.length || 0,
      total_campaigns: clusters?.total_clusters || 0,
      total_isolated: clusters?.total_noise || 0,
      total_recommendations: recommendations?.total || 0,
      covered_tactics: mitre?.covered_tactics?.length || 0,
      gap_tactics: mitre?.gap_tactics?.length || 0,
    },
    campaigns: clusters?.clusters || [],
    mitre_analysis: mitre || {},
    departmental_risk: heatmap?.departments || [],
    recommendations: recommendations?.recommendations || [],
    top_correlations: correlations?.pairs || [],
  }, null, 2);
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
