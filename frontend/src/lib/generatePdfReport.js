/**
 * ATLAS PDF Report Generator — v2
 * Stephen Few's Information Dashboard Design principles throughout.
 * Two-page report: Executive Briefing (CISO) + Technical Detail (SOC).
 */

// ── Lookup tables ─────────────────────────────────────────────────────────────

const SEVERITY_COLOR = {
  High: '#dc2626', Medium: '#ea580c', Low: '#d97706', Informational: '#64748b',
};

const PRIORITY_COLOR = {
  Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#64748b',
};

const CONTROL_OWNER = {
  'Identity & Access Management': 'Identity / IT Team',
  'Email Security':               'Email / IT Team',
  'Endpoint Hardening':           'Endpoint / SOC Team',
  'Credential Protection':        'Identity / SOC Team',
  'Network Segmentation':         'Network / IT Team',
  'Data Protection':              'IT / Compliance Team',
  'Detection Engineering':        'SOC / Detection Team',
  'Vulnerability Management':     'IT / Security Team',
  'Incident Response':            'SOC / CISO',
  'Risk Management':              'CISO / Risk Team',
};

const PRIORITY_TIMEFRAME = {
  Critical: '24–48 hours', High: 'This week', Medium: 'This month', Low: 'Next quarter',
};

const TACTIC_NAMES = {
  TA0001:'Initial Access', TA0002:'Execution', TA0003:'Persistence',
  TA0004:'Privilege Escalation', TA0005:'Defense Evasion', TA0006:'Credential Access',
  TA0007:'Discovery', TA0008:'Lateral Movement', TA0009:'Collection',
  TA0010:'Exfiltration', TA0011:'Command & Control', TA0040:'Impact',
};

const TECHNIQUE_PLAIN = {
  T1003:'credential theft', T1566:'phishing', T1059:'malicious script execution',
  T1486:'ransomware and file encryption', T1110:'brute-force attacks',
  T1021:'lateral movement via remote services', T1078:'compromised account usage',
  T1055:'process injection', T1562:'security tool tampering',
  T1190:'exploitation of internet-facing systems', T1490:'backup deletion',
  T1489:'service disruption', T1074:'data staging for exfiltration',
  T1041:'data exfiltration over C2', T1071:'command and control communication',
  T1053:'persistence via scheduled tasks', T1047:'WMI abuse',
  T1036:'process masquerading', T1027:'obfuscated payload execution',
  T1068:'privilege escalation exploit', T1555:'credential harvesting',
  T1087:'account enumeration', T1082:'system reconnaissance',
};

function techPlain(t) { return TECHNIQUE_PLAIN[t] || t; }

function cohesionVerdict(score) {
  if (score >= 0.85) return 'Confirmed campaign';
  if (score >= 0.68) return 'Highly likely';
  if (score >= 0.50) return 'Probable';
  if (score >= 0.30) return 'Possible';
  return 'Weak signal';
}

function analysisDateRange(incidents) {
  if (!incidents?.length) return null;
  const dates = incidents.map(i => i.CreatedTime).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d));
  if (!dates.length) return null;
  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return min.toDateString() === max.toDateString() ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

// First sentence only — for executive-level action summaries
function firstSentence(text) {
  if (!text) return '';
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : text.slice(0, 120) + (text.length > 120 ? '…' : '');
}

function humanTime(hours) {
  if (!hours || hours === 0) return '< 1 hour';
  if (hours < 1)   return '< 1 hour';
  if (hours < 24)  return `${Math.round(hours)} hour${Math.round(hours) !== 1 ? 's' : ''}`;
  if (hours < 168) return `${Math.round(hours / 24)} day${Math.round(hours / 24) !== 1 ? 's' : ''}`;
  return `${Math.round(hours / 168)} week${Math.round(hours / 168) !== 1 ? 's' : ''}`;
}

function overallRisk(clusters, recommendations) {
  const critRecs = (recommendations?.recommendations || []).filter(r => r.priority === 'Critical').length;
  const hasHighCampaign = (clusters?.clusters || []).some(c => (c.severity_breakdown?.High || 0) >= 2);
  if (hasHighCampaign || critRecs >= 3) return { label: 'CRITICAL', color: '#dc2626', bg: '#fef2f2', desc: 'Immediate action required. Active high-severity campaigns detected.' };
  if (critRecs >= 1)                    return { label: 'HIGH',     color: '#ea580c', bg: '#fff7ed', desc: 'Significant threat activity. Address critical recommendations urgently.' };
  return                                       { label: 'MEDIUM',   color: '#4f46e5', bg: '#eef2ff', desc: 'Moderate activity detected. Work through recommendations in priority order.' };
}

// ── Narrative generator ───────────────────────────────────────────────────────

function buildNarrative(incidents, clusters, mitre, heatmap, recommendations) {
  const totalInc = incidents?.length || 0;
  const campaigns = clusters?.clusters || [];
  const totalCamp = campaigns.length;
  const gaps = mitre?.gap_tactics?.length || 0;
  const topDept = (heatmap?.departments || []).filter(d => d.name !== 'Unassigned')[0];
  const critRecs = (recommendations?.recommendations || []).filter(r => r.priority === 'Critical').length;
  const largest = campaigns[0];

  const sentences = [];

  // Sentence 1 — what happened overall
  if (totalCamp > 0) {
    sentences.push(
      `Analysis of ${totalInc} security incident${totalInc !== 1 ? 's' : ''} identified ` +
      `<strong>${totalCamp} coordinated attack campaign${totalCamp > 1 ? 's' : ''}</strong>, ` +
      `suggesting organised threat actor activity rather than isolated events.`
    );
  } else {
    sentences.push(
      `Analysis of ${totalInc} security incident${totalInc !== 1 ? 's' : ''} found no coordinated campaigns — ` +
      `incidents appear to be isolated and unrelated.`
    );
  }

  // Sentence 2 — biggest campaign detail
  if (largest) {
    const verb = largest.top_techniques.slice(0, 2).map(techPlain).join(' and ') || 'malicious activity';
    const cohesionVerdict = largest.cohesion >= 0.7 ? 'strongly suggesting a single threat actor'
      : largest.cohesion >= 0.5 ? 'suggesting coordinated activity'
      : 'indicating loosely related activity';
    sentences.push(
      `The most significant campaign involved <strong>${largest.size} incidents over ${humanTime(largest.time_span_hours)}</strong>, ` +
      `centred around ${verb} — ${cohesionVerdict} (${Math.round(largest.cohesion * 100)}% cohesion).`
    );
  }

  // Sentence 3 — department risk
  if (topDept) {
    const highN = topDept.severity_breakdown?.High || 0;
    sentences.push(
      `<strong>${topDept.name}</strong> carries the highest risk exposure with ${topDept.total} incident${topDept.total !== 1 ? 's' : ''}` +
      `${highN > 0 ? `, including ${highN} High-severity event${highN > 1 ? 's' : ''}` : ''}.`
    );
  }

  // Sentence 4 — detection gaps
  if (gaps > 0) {
    sentences.push(
      `Detection coverage is absent across <strong>${gaps} of 12 MITRE ATT&CK tactic${gaps > 1 ? 's' : ''}</strong>, ` +
      `meaning attackers could operate in these areas without generating alerts.`
    );
  }

  // Sentence 5 — call to action
  if (critRecs > 0) {
    sentences.push(
      `<strong>${critRecs} critical recommendation${critRecs > 1 ? 's require' : ' requires'} action within 24–48 hours</strong> — ` +
      `details and ownership are listed below.`
    );
  } else {
    sentences.push(`All recommendations are listed below in priority order.`);
  }

  return sentences.join(' ');
}

// ── Visual components ─────────────────────────────────────────────────────────

function hbar(value, max, color = '#4f46e5', height = 10) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;background:#e8e8e8;border-radius:2px;height:${height}px;">
        <div style="width:${pct}%;background:${color};height:${height}px;border-radius:2px;"></div>
      </div>
      <span style="font-size:11px;color:#555;min-width:28px;text-align:right;font-variant-numeric:tabular-nums;">${value}</span>
    </div>`;
}

function sevStrip(breakdown, total) {
  const order = ['High','Medium','Low','Informational'];
  const present = order.filter(s => breakdown?.[s] > 0);
  const bars = present.map(s => {
    const pct = (breakdown[s] / total) * 100;
    return `<div style="width:${pct}%;background:${SEVERITY_COLOR[s]};height:10px;" title="${s}: ${breakdown[s]}"></div>`;
  }).join('');
  const labels = present.map(s =>
    `<span style="font-size:9px;color:${SEVERITY_COLOR[s]};font-weight:600;">${s[0]}${breakdown[s]}</span>`
  ).join('<span style="color:#ccc;margin:0 2px;">·</span>');
  return `
    <div style="min-width:90px;">
      <div style="display:flex;border-radius:2px;overflow:hidden;height:10px;">${bars}</div>
      <div style="display:flex;gap:0;margin-top:3px;">${labels}</div>
    </div>`;
}

function badge(text, color) {
  return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.04em;background:${color}18;color:${color};border:1px solid ${color}44;">${text}</span>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function css() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 11px; color: #1a1a1a; background:#fff; line-height:1.5; }
    .page { width:210mm; min-height:297mm; padding:16mm 18mm 14mm; margin:0 auto; page-break-after:always; }
    .page:last-child { page-break-after:avoid; }
    h2 { font-size:11px; font-weight:700; color:#111; border-bottom:2px solid #4f46e5; padding-bottom:4px; margin:20px 0 10px; text-transform:uppercase; letter-spacing:0.08em; }
    table { width:100%; border-collapse:collapse; font-size:11px; }
    th { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:#4f46e5; padding:5px 8px; border-bottom:2px solid #e0e7ff; text-align:left; background:#f5f3ff; }
    td { padding:6px 8px; border-bottom:1px solid #ebebeb; vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    .metric-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:12px 0; }
    .metric { background:#fafafa; border-radius:6px; padding:11px 14px; border-left:3px solid #e0e7ff; border:1px solid #e0e7ff; border-left:3px solid #4f46e5; }
    .metric-val { font-size:26px; font-weight:700; color:#111; line-height:1; font-variant-numeric:tabular-nums; }
    .metric-label { font-size:9px; color:#777; margin-top:3px; text-transform:uppercase; letter-spacing:0.07em; }
    .narrative { font-size:12px; color:#333; line-height:1.8; padding:14px 16px; background:#f5f3ff; border-left:3px solid #4f46e5; border-radius:0 4px 4px 0; margin-bottom:14px; }
    .risk-banner { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:6px; margin-bottom:12px; }
    .action-row { display:grid; grid-template-columns:70px 1fr 110px 90px; gap:10px; align-items:start; padding:8px 0; border-bottom:1px solid #ebebeb; }
    .action-row:last-child { border-bottom:none; }
    .footer { font-size:9px; color:#aaa; text-align:center; margin-top:16px; padding-top:8px; border-top:1px solid #e0e0e0; }
    .appendix { background:#f5f3ff; border-radius:6px; padding:10px 14px; margin-top:16px; border:1px solid #e0e7ff; }
    .appendix-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#4f46e5; margin-bottom:6px; }
    .appendix-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; }
    .appendix-item { font-size:10px; color:#555; }
    .appendix-item strong { color:#333; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .page { margin:0; padding:12mm 16mm; }
      @page { size:A4; margin:0; }
    }
  `;
}

// ── Page 1: Executive Briefing ────────────────────────────────────────────────

function page1(date, incidents, clusters, mitre, heatmap, recommendations) {
  const risk = overallRisk(clusters, recommendations);
  const totalInc = incidents?.length || 0;
  const totalCamp = clusters?.total_clusters || 0;
  const gaps = mitre?.gap_tactics?.length || 0;
  const totalRecs = recommendations?.total || 0;
  const campaigns = clusters?.clusters || [];
  const topDepts = (heatmap?.departments || []).filter(d => d.name !== 'Unassigned').slice(0, 6);
  const maxRisk = topDepts[0]?.risk_score || 1;

  const critRecs = (recommendations?.recommendations || []).filter(r => r.priority === 'Critical');
  const highRecs = (recommendations?.recommendations || []).filter(r => r.priority === 'High');
  const actions = [...critRecs, ...highRecs].slice(0, 6);
  const dateRange = analysisDateRange(incidents);

  const narrative = buildNarrative(incidents, clusters, mitre, heatmap, recommendations);

  const campRows = campaigns.map(c => `
    <tr>
      <td><strong>${c.label}</strong></td>
      <td style="text-align:center;">${c.size}</td>
      <td style="text-align:center;">${humanTime(c.time_span_hours)}</td>
      <td style="font-size:10px;color:#555;">${cohesionVerdict(c.cohesion)} <span style="color:#aaa;">(${Math.round(c.cohesion * 100)}%)</span></td>
      <td>${sevStrip(c.severity_breakdown, c.size)}</td>
      <td style="color:#555;font-size:10px;">${c.top_techniques.slice(0,2).map(techPlain).join(', ') || '—'}</td>
    </tr>`).join('');

  const deptRows = topDepts.map(d => `
    <tr>
      <td>${d.name}</td>
      <td style="width:150px;">${hbar(d.risk_score, maxRisk, '#4f46e5', 8)}</td>
      <td style="text-align:center;">${d.total}</td>
      <td style="text-align:center;color:#dc2626;font-weight:600;">${d.severity_breakdown?.High || 0}</td>
      <td style="font-size:10px;color:#555;">${(d.top_techniques || []).slice(0,2).join(', ') || '—'}</td>
    </tr>`).join('');

  const actionRows = actions.map(r => `
    <div class="action-row">
      <div>${badge(r.priority, PRIORITY_COLOR[r.priority])}</div>
      <div>
        <div style="font-weight:600;font-size:11px;margin-bottom:2px;">${r.title}</div>
        <div style="font-size:10px;color:#555;line-height:1.5;">${firstSentence(r.detail)}</div>
      </div>
      <div style="font-size:10px;color:#777;">${CONTROL_OWNER[r.control] || r.control}</div>
      <div style="font-size:10px;color:${PRIORITY_COLOR[r.priority]};font-weight:600;">${PRIORITY_TIMEFRAME[r.priority]}</div>
    </div>`).join('');

  return `
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;padding-bottom:12px;border-bottom:3px solid #4f46e5;">
      <div>
        <div style="font-size:24px;font-weight:700;letter-spacing:-0.5px;color:#4f46e5;line-height:1;">ATLAS</div>
        <div style="font-size:12px;color:#555;margin-top:3px;">Threat Correlation &amp; Clustering — Executive Briefing</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#333;font-weight:500;">${date}</div>
        <div style="font-size:10px;color:#999;margin-top:2px;letter-spacing:0.05em;">CONFIDENTIAL</div>
      </div>
    </div>

    <!-- Risk banner -->
    <div class="risk-banner" style="background:${risk.bg};border-left:4px solid ${risk.color};">
      <div>
        <div style="font-size:9px;color:${risk.color};font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Overall Risk Level</div>
        <div style="font-size:22px;font-weight:700;color:${risk.color};line-height:1.2;margin-top:2px;">${risk.label}</div>
      </div>
      <div style="font-size:11px;color:#555;max-width:320px;text-align:right;line-height:1.5;">${risk.desc}</div>
    </div>

    <!-- Metrics -->
    <div class="metric-grid">
      <div class="metric">
        <div class="metric-val">${totalInc}</div>
        <div class="metric-label">Incidents Analysed${dateRange ? `<br/><span style="font-size:8px;color:#aaa;text-transform:none;letter-spacing:0;">${dateRange}</span>` : ''}</div>
      </div>
      <div class="metric" style="border-left-color:${totalCamp > 0 ? '#dc2626' : '#16a34a'};">
        <div class="metric-val" style="color:${totalCamp > 0 ? '#dc2626' : '#16a34a'};">${totalCamp}</div>
        <div class="metric-label">Campaigns Detected</div>
      </div>
      <div class="metric" style="border-left-color:${gaps > 0 ? '#ea580c' : '#16a34a'};">
        <div class="metric-val" style="color:${gaps > 0 ? '#ea580c' : '#16a34a'};">${gaps}</div>
        <div class="metric-label">Detection Gaps</div>
      </div>
      <div class="metric">
        <div class="metric-val">${totalRecs}</div>
        <div class="metric-label">Recommendations</div>
      </div>
    </div>

    <!-- Narrative briefing -->
    <div class="narrative">${narrative}</div>

    ${campaigns.length > 0 ? `
    <!-- Campaign summary -->
    <h2>Campaign Summary</h2>
    <table>
      <thead><tr>
        <th>Campaign</th>
        <th style="text-align:center;">Incidents</th>
        <th style="text-align:center;">Duration</th>
        <th style="text-align:center;">Cohesion</th>
        <th style="min-width:100px;">Severity Mix</th>
        <th>Primary Activity</th>
      </tr></thead>
      <tbody>${campRows}</tbody>
    </table>` : ''}

    ${topDepts.length > 0 ? `
    <!-- Department risk -->
    <h2>Departmental Risk Exposure</h2>
    <p style="font-size:10px;color:#888;margin-bottom:8px;">Risk score = severity-weighted incident count (High×4, Medium×2, Low×1). Bar shows relative exposure across departments.</p>
    <table>
      <thead><tr>
        <th>Department</th>
        <th style="width:150px;">Risk Score</th>
        <th style="text-align:center;">Total</th>
        <th style="text-align:center;">High Sev.</th>
        <th>Top Techniques</th>
      </tr></thead>
      <tbody>${deptRows}</tbody>
    </table>` : ''}

    ${actions.length > 0 ? `
    <!-- Actions -->
    <h2>Recommended Actions — Ownership &amp; Timeframes</h2>
    <div style="display:grid;grid-template-columns:70px 1fr 110px 90px;gap:4px;padding:4px 8px;background:#f9f9f9;border-radius:3px;margin-bottom:4px;">
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;">Priority</span>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;">Action</span>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;">Owner</span>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#555;">Timeframe</span>
    </div>
    <div>${actionRows}</div>` : ''}

    <div class="footer">
      ATLAS Executive Briefing &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; Page 1 of 2 &nbsp;·&nbsp; All PII SHA-256 hashed — no raw usernames, hostnames, or IP addresses in this report
    </div>
  </div>`;
}

// ── Page 2: Technical Report ──────────────────────────────────────────────────

function page2(incidents, clusters, mitre, heatmap, recommendations, correlations, date) {
  const campaigns = clusters?.clusters || [];
  const covered = (mitre?.tactic_coverage || []).filter(t => t.count > 0);
  const gaps = mitre?.gap_tactics || [];
  const recs = recommendations?.recommendations || [];
  const pairs = (correlations?.pairs || []).sort((a, b) => b.score - a.score).slice(0, 8);

  // Incident title lookup for pairs table
  const incMap = {};
  for (const inc of (incidents || [])) incMap[inc.IncidentId] = inc;

  const campDetail = campaigns.map(c => {
    const sevParts = ['High','Medium','Low','Informational']
      .filter(s => c.severity_breakdown?.[s] > 0)
      .map(s => badge(s[0] + ' ' + c.severity_breakdown[s], SEVERITY_COLOR[s]))
      .join(' ');
    return `
      <tr>
        <td><strong>${c.label}</strong></td>
        <td style="text-align:center;">${c.size}</td>
        <td style="text-align:center;">${humanTime(c.time_span_hours)}</td>
        <td style="font-size:10px;">${cohesionVerdict(c.cohesion)} <span style="color:#aaa;">(${Math.round(c.cohesion * 100)}%)</span></td>
        <td style="font-family:monospace;font-size:10px;">${c.top_techniques.slice(0,5).join(', ') || '—'}</td>
        <td>${sevParts}</td>
      </tr>`;
  }).join('');

  const tacticRows = [
    ...covered.map(t => `
      <tr>
        <td style="font-family:monospace;font-size:10px;color:#333;">${t.id}</td>
        <td>${t.name}</td>
        <td style="text-align:center;color:#16a34a;font-weight:700;font-size:13px;">✓</td>
        <td style="text-align:center;font-weight:600;">${t.count}</td>
        <td style="font-family:monospace;font-size:9px;color:#555;">${t.techniques.slice(0,5).join(', ') || '—'}</td>
      </tr>`),
    ...gaps.map(id => `
      <tr>
        <td style="font-family:monospace;font-size:10px;color:#aaa;">${id}</td>
        <td style="color:#aaa;">${TACTIC_NAMES[id] || id}</td>
        <td style="text-align:center;color:#dc2626;font-weight:700;font-size:13px;">✗</td>
        <td style="text-align:center;color:#aaa;">0</td>
        <td style="font-size:9px;color:#dc2626;">No detections — coverage gap</td>
      </tr>`),
  ].join('');

  // Full recommendation text — no truncation
  const recRows = recs.map((r, i) => `
    <tr>
      <td style="text-align:center;font-size:10px;color:#888;font-weight:500;">${i + 1}</td>
      <td>${badge(r.priority, PRIORITY_COLOR[r.priority])}</td>
      <td>
        <div style="font-weight:600;margin-bottom:3px;">${r.title}</div>
        <div style="font-size:10px;color:#555;line-height:1.5;">${r.detail}</div>
      </td>
      <td style="font-size:10px;color:#555;white-space:nowrap;vertical-align:top;padding-top:8px;">${r.control}</td>
      <td style="font-size:10px;color:#777;vertical-align:top;padding-top:8px;">${r.evidence || '—'}</td>
    </tr>`).join('');

  const pairRows = pairs.map(p => {
    const titleA = incMap[p.a]?.Title || p.a;
    const titleB = incMap[p.b]?.Title || p.b;
    const sc = p.score >= 0.75 ? '#dc2626' : p.score >= 0.55 ? '#ea580c' : '#4f46e5';
    return `
    <tr>
      <td>
        <div style="font-weight:600;font-size:11px;">${titleA}</div>
        <div style="font-family:monospace;font-size:9px;color:#aaa;margin-top:1px;">${p.a}</div>
      </td>
      <td>
        <div style="font-weight:600;font-size:11px;">${titleB}</div>
        <div style="font-family:monospace;font-size:9px;color:#aaa;margin-top:1px;">${p.b}</div>
      </td>
      <td style="text-align:center;font-weight:700;color:${sc};">${Math.round(p.score * 100)}%</td>
      <td style="font-size:10px;font-family:monospace;color:#555;">${(p.shared_mitre || []).join(', ') || '—'}</td>
      <td style="font-size:10px;color:#555;">${(p.shared_entities || []).slice(0,3).join(', ') || '—'}</td>
    </tr>`;
  }).join('');

  return `
  <div class="page">

    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid #4f46e5;">
      <div>
        <div style="font-size:18px;font-weight:700;color:#4f46e5;">ATLAS — Technical Report</div>
        <div style="font-size:11px;color:#555;margin-top:2px;">For security operations and engineering teams</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#333;font-weight:500;">${date}</div>
        <div style="font-size:10px;color:#999;margin-top:2px;letter-spacing:0.05em;">CONFIDENTIAL</div>
      </div>
    </div>

    ${campaigns.length > 0 ? `
    <h2>Campaign Detail</h2>
    <table>
      <thead><tr>
        <th>Campaign</th><th style="text-align:center;">Size</th>
        <th style="text-align:center;">Duration</th><th style="text-align:center;">Cohesion</th>
        <th>Techniques Observed</th><th>Severity</th>
      </tr></thead>
      <tbody>${campDetail}</tbody>
    </table>` : ''}

    <h2>MITRE ATT&amp;CK Coverage</h2>
    <table>
      <thead><tr>
        <th>Tactic ID</th><th>Tactic Name</th>
        <th style="text-align:center;">Status</th>
        <th style="text-align:center;">Incidents</th>
        <th>Techniques Observed</th>
      </tr></thead>
      <tbody>${tacticRows}</tbody>
    </table>

    ${recs.length > 0 ? `
    <h2>Full Hardening Recommendations</h2>
    <table>
      <thead><tr>
        <th style="width:20px;">#</th><th style="width:65px;">Priority</th>
        <th>Recommendation &amp; Detail</th>
        <th style="width:110px;">Control Area</th>
        <th style="width:110px;">Evidence</th>
      </tr></thead>
      <tbody>${recRows}</tbody>
    </table>` : ''}

    ${pairs.length > 0 ? `
    <h2>Top Correlated Incident Pairs</h2>
    <table>
      <thead><tr>
        <th>Incident A</th><th>Incident B</th>
        <th style="text-align:center;">Match</th>
        <th>Shared Techniques</th><th>Shared Entities</th>
      </tr></thead>
      <tbody>${pairRows}</tbody>
    </table>` : ''}

    <!-- Appendix -->
    <div class="appendix">
      <div class="appendix-title">About This Report — How to Interpret the Findings</div>
      <div class="appendix-grid">
        <div class="appendix-item"><strong>What is ATLAS?</strong> A local threat correlation and clustering framework. It analyses Defender incident exports to find hidden patterns, group related incidents into campaigns, and generate prioritised recommendations.</div>
        <div class="appendix-item"><strong>What is campaign confidence?</strong> A label (Confirmed / Highly likely / Probable / Possible / Weak signal) indicating how tightly linked the incidents in a campaign are. "Confirmed" (≥85%) means the algorithm is highly certain of a single threat actor. "Weak signal" (&lt;30%) means loosely related — monitor but do not assume coordination.</div>
        <div class="appendix-item"><strong>What is a detection gap?</strong> A MITRE ATT&amp;CK tactic with no incidents mapped to it. This could mean no attacks occurred there, or (more likely) that detection coverage is absent and attacks went unrecorded.</div>
        <div class="appendix-item"><strong>Privacy note:</strong> All usernames, hostnames, and IP addresses are SHA-256 hashed before any processing. No raw PII appears in this report. Entity codes (e.g. USR-A3F2) are anonymised identifiers — consistent across incidents but non-reversible.</div>
      </div>
    </div>

    <div class="footer">
      ATLAS Technical Report &nbsp;·&nbsp; Local · Privacy-First · Offline &nbsp;·&nbsp; Page 2 of 2 &nbsp;·&nbsp; Generated by ATLAS — Threat Correlation &amp; Clustering Framework
    </div>
  </div>`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function openPdfReport({ incidents, clusters, correlations, mitre, heatmap, recommendations }) {
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>ATLAS Report — ${date}</title>
  <style>${css()}</style>
</head>
<body>
  ${page1(date, incidents, clusters, mitre, heatmap, recommendations)}
  ${page2(incidents, clusters, mitre, heatmap, recommendations, correlations, date)}
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 700));
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
