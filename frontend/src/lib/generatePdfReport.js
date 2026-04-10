/**
 * ATLAS PDF Report Generator
 * Produces a print-optimised HTML document following Stephen Few's
 * Information Dashboard Design principles:
 *  - Colour encodes meaning only (not decoration)
 *  - Horizontal bars for labelled comparisons
 *  - Tables for exact values
 *  - No pie charts, no 3D, no gradients, no chartjunk
 *  - Maximum data-to-ink ratio
 */

const SEVERITY_COLOR = {
  High:          '#c0392b',
  Medium:        '#d68910',
  Low:           '#1a5276',
  Informational: '#717d7e',
};

const PRIORITY_COLOR = {
  Critical: '#c0392b',
  High:     '#d68910',
  Medium:   '#1a5276',
  Low:      '#717d7e',
};

const TACTIC_NAMES = {
  TA0001:'Initial Access', TA0002:'Execution', TA0003:'Persistence',
  TA0004:'Privilege Escalation', TA0005:'Defense Evasion', TA0006:'Credential Access',
  TA0007:'Discovery', TA0008:'Lateral Movement', TA0009:'Collection',
  TA0010:'Exfiltration', TA0011:'Command & Control', TA0040:'Impact',
};

const TECHNIQUE_PLAIN = {
  T1003:'credential theft', T1566:'phishing', T1059:'malicious script execution',
  T1486:'ransomware/file encryption', T1110:'brute-force attacks',
  T1021:'lateral movement via remote services', T1078:'compromised account usage',
  T1055:'process injection', T1562:'security tool tampering',
  T1190:'exploitation of internet-facing systems', T1490:'backup deletion',
  T1489:'service disruption', T1074:'data staging', T1041:'data exfiltration',
  T1071:'C2 communication', T1053:'scheduled task persistence',
};

function techPlain(t) { return TECHNIQUE_PLAIN[t] || t; }

function humanTime(hours) {
  if (!hours) return '—';
  if (hours < 1)   return '<1 hour';
  if (hours < 24)  return `${Math.round(hours)}h`;
  if (hours < 168) return `${Math.round(hours / 24)}d`;
  return `${Math.round(hours / 168)}w`;
}

function overallRisk(clusters, recommendations) {
  const critRecs = (recommendations?.recommendations || []).filter(r => r.priority === 'Critical').length;
  const hasHighCampaign = (clusters?.clusters || []).some(c => (c.severity_breakdown?.High || 0) >= 2);
  if (hasHighCampaign || critRecs >= 3) return { label: 'CRITICAL', color: '#c0392b', bg: '#fdedec' };
  if (critRecs >= 1)                    return { label: 'HIGH',     color: '#d68910', bg: '#fef9e7' };
  return                                       { label: 'MEDIUM',   color: '#1a5276', bg: '#eaf2ff' };
}

// ── Horizontal bar (Few: bars for ordered comparison) ────────────────────────
function hbar(value, max, color = '#2c3e50', height = 10) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;background:#e8e8e8;border-radius:2px;height:${height}px;">
        <div style="width:${pct}%;background:${color};height:${height}px;border-radius:2px;"></div>
      </div>
      <span style="font-size:11px;color:#555;min-width:28px;text-align:right;">${value}</span>
    </div>`;
}

// ── Severity strip (stacked proportional bar) ─────────────────────────────────
function sevStrip(breakdown, total) {
  const order = ['High','Medium','Low','Informational'];
  const segs = order.filter(s => breakdown?.[s] > 0).map(s => {
    const pct = (breakdown[s] / total) * 100;
    return `<div style="width:${pct}%;background:${SEVERITY_COLOR[s]};height:8px;" title="${s}: ${breakdown[s]}"></div>`;
  }).join('');
  return `<div style="display:flex;border-radius:2px;overflow:hidden;height:8px;min-width:80px;">${segs}</div>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
function css() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 11px; color: #1a1a1a;
      background: #fff; line-height: 1.5;
    }
    .page {
      width: 210mm; min-height: 297mm;
      padding: 18mm 18mm 16mm;
      margin: 0 auto;
      page-break-after: always;
    }
    .page:last-child { page-break-after: avoid; }
    h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #111; }
    h2 { font-size: 13px; font-weight: 700; color: #111;
         border-bottom: 2px solid #111; padding-bottom: 4px;
         margin: 22px 0 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    h3 { font-size: 11px; font-weight: 600; color: #333; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { font-size: 10px; font-weight: 600; text-transform: uppercase;
         letter-spacing: 0.06em; color: #555; padding: 5px 8px;
         border-bottom: 1px solid #ccc; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #ebebeb; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .badge {
      display: inline-block; padding: 2px 7px; border-radius: 3px;
      font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
    }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
    .metric { background: #f7f7f7; border-radius: 4px; padding: 12px 14px; }
    .metric-val { font-size: 28px; font-weight: 700; color: #111; line-height: 1; }
    .metric-label { font-size: 10px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
    .risk-banner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; border-radius: 4px; margin-bottom: 16px;
    }
    .action-row { display: flex; gap: 10px; align-items: flex-start; padding: 7px 0; border-bottom: 1px solid #ebebeb; }
    .action-row:last-child { border-bottom: none; }
    .footer { font-size: 9px; color: #999; text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e0e0e0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { margin: 0; padding: 14mm 16mm; }
      @page { size: A4; margin: 0; }
    }
  `;
}

// ── Page 1: Executive Summary ─────────────────────────────────────────────────
function page1(date, incidents, clusters, mitre, heatmap, recommendations) {
  const risk = overallRisk(clusters, recommendations);
  const totalInc = incidents?.length || 0;
  const totalCamp = clusters?.total_clusters || 0;
  const gaps = mitre?.gap_tactics?.length || 0;
  const totalRecs = recommendations?.total || 0;
  const campaigns = clusters?.clusters || [];
  const topDepts = (heatmap?.departments || []).filter(d => d.name !== 'Unassigned').slice(0, 6);
  const maxRisk = topDepts[0]?.risk_score || 1;
  const critRecs = (recommendations?.recommendations || []).filter(r => r.priority === 'Critical').slice(0, 5);
  const highRecs = (recommendations?.recommendations || []).filter(r => r.priority === 'High').slice(0, 3);
  const actions = [...critRecs, ...highRecs].slice(0, 6);

  // Campaign summary table
  const campRows = campaigns.map(c => {
    const verb = c.top_techniques.slice(0, 2).map(techPlain).join(', ') || 'unknown activity';
    const highN = c.severity_breakdown?.High || 0;
    return `
      <tr>
        <td><strong>${c.label}</strong></td>
        <td style="text-align:center;">${c.size}</td>
        <td style="text-align:center;">${humanTime(c.time_span_hours)}</td>
        <td style="text-align:center;">${Math.round(c.cohesion * 100)}%</td>
        <td>${sevStrip(c.severity_breakdown, c.size)}</td>
        <td style="color:#555;">${verb}</td>
      </tr>`;
  }).join('');

  // Dept risk rows
  const deptRows = topDepts.map(d => `
    <tr>
      <td>${d.name}</td>
      <td style="width:160px;">${hbar(d.risk_score, maxRisk, '#2c3e50', 8)}</td>
      <td style="text-align:center;">${d.total}</td>
      <td style="text-align:center;color:${SEVERITY_COLOR.High};">${d.severity_breakdown?.High || 0}</td>
    </tr>`).join('');

  return `
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">
      <div>
        <h1>ATLAS</h1>
        <div style="font-size:13px;color:#555;margin-top:3px;">Threat Correlation &amp; Clustering Report</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#555;">${date}</div>
        <div style="font-size:10px;color:#999;margin-top:2px;">CONFIDENTIAL</div>
      </div>
    </div>

    <!-- Risk banner -->
    <div class="risk-banner" style="background:${risk.bg};border-left:4px solid ${risk.color};">
      <div>
        <div style="font-size:10px;color:${risk.color};font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Overall Risk Level</div>
        <div style="font-size:20px;font-weight:700;color:${risk.color};margin-top:2px;">${risk.label}</div>
      </div>
      <div style="font-size:11px;color:#555;max-width:340px;text-align:right;">
        ${totalCamp > 0
          ? `${totalCamp} coordinated attack campaign${totalCamp > 1 ? 's' : ''} detected across ${totalInc} incidents.`
          : `${totalInc} incidents analysed. No coordinated campaigns detected.`}
      </div>
    </div>

    <!-- Metrics -->
    <div class="metric-grid">
      <div class="metric"><div class="metric-val">${totalInc}</div><div class="metric-label">Incidents Analysed</div></div>
      <div class="metric"><div class="metric-val">${totalCamp}</div><div class="metric-label">Campaigns Detected</div></div>
      <div class="metric"><div class="metric-val" style="color:${gaps > 0 ? '#d68910' : '#27ae60'};">${gaps}</div><div class="metric-label">Detection Gaps</div></div>
      <div class="metric"><div class="metric-val">${totalRecs}</div><div class="metric-label">Recommendations</div></div>
    </div>

    ${campaigns.length > 0 ? `
    <!-- Campaign summary -->
    <h2>Campaign Summary</h2>
    <table>
      <thead><tr>
        <th>Campaign</th><th style="text-align:center;">Incidents</th>
        <th style="text-align:center;">Duration</th><th style="text-align:center;">Cohesion</th>
        <th style="min-width:90px;">Severity Mix</th><th>Primary Activity</th>
      </tr></thead>
      <tbody>${campRows}</tbody>
    </table>` : ''}

    ${topDepts.length > 0 ? `
    <!-- Department risk -->
    <h2>Department Risk</h2>
    <p style="font-size:10px;color:#777;margin-bottom:8px;">Risk score = weighted sum of incident severity (High×4, Medium×2, Low×1). Bar length shows relative exposure.</p>
    <table>
      <thead><tr><th>Department</th><th style="width:160px;">Risk Score</th><th style="text-align:center;">Total</th><th style="text-align:center;">High Sev.</th></tr></thead>
      <tbody>${deptRows}</tbody>
    </table>` : ''}

    ${actions.length > 0 ? `
    <!-- Actions for leadership -->
    <h2>Recommended Actions for Leadership</h2>
    <div>${actions.map((r, i) => `
      <div class="action-row">
        <span class="badge" style="background:${PRIORITY_COLOR[r.priority]}18;color:${PRIORITY_COLOR[r.priority]};border:1px solid ${PRIORITY_COLOR[r.priority]}44;white-space:nowrap;">
          ${r.priority}
        </span>
        <div>
          <div style="font-weight:600;margin-bottom:2px;">${r.title}</div>
          <div style="color:#555;">${r.detail.length > 160 ? r.detail.slice(0, 160) + '…' : r.detail}</div>
        </div>
      </div>`).join('')}
    </div>` : ''}

    <div class="footer">
      ATLAS — Threat Correlation &amp; Clustering Framework &nbsp;·&nbsp;
      Local · Privacy-First · All PII SHA-256 hashed &nbsp;·&nbsp;
      Page 1 of 2 — Executive Summary
    </div>
  </div>`;
}

// ── Page 2: Technical Report ──────────────────────────────────────────────────
function page2(incidents, clusters, mitre, heatmap, recommendations, correlations) {
  const campaigns = clusters?.clusters || [];
  const covered = (mitre?.tactic_coverage || []).filter(t => t.count > 0);
  const gaps = mitre?.gap_tactics || [];
  const recs = recommendations?.recommendations || [];
  const pairs = (correlations?.pairs || []).slice(0, 8);

  const campDetail = campaigns.map(c => {
    const sevParts = ['High','Medium','Low','Informational']
      .filter(s => c.severity_breakdown?.[s] > 0)
      .map(s => `<span class="badge" style="background:${SEVERITY_COLOR[s]}18;color:${SEVERITY_COLOR[s]};border:1px solid ${SEVERITY_COLOR[s]}44;">${s} ${c.severity_breakdown[s]}</span>`)
      .join(' ');
    return `
      <tr>
        <td><strong>${c.label}</strong></td>
        <td style="text-align:center;">${c.size}</td>
        <td style="text-align:center;">${humanTime(c.time_span_hours)}</td>
        <td style="text-align:center;">${Math.round(c.cohesion * 100)}%</td>
        <td style="font-family:monospace;font-size:10px;">${c.top_techniques.slice(0,5).join(', ')}</td>
        <td>${sevParts}</td>
      </tr>`;
  }).join('');

  const tacticRows = [
    ...covered.map(t => `
      <tr>
        <td style="font-family:monospace;font-size:10px;">${t.id}</td>
        <td>${t.name}</td>
        <td style="text-align:center;">
          <span style="color:#27ae60;font-weight:700;">✓</span>
        </td>
        <td style="text-align:center;">${t.count}</td>
        <td style="font-family:monospace;font-size:9px;color:#555;">${t.techniques.slice(0,4).join(', ')}</td>
      </tr>`),
    ...gaps.map(id => `
      <tr style="color:#aaa;">
        <td style="font-family:monospace;font-size:10px;">${id}</td>
        <td>${TACTIC_NAMES[id] || id}</td>
        <td style="text-align:center;color:#c0392b;font-weight:700;">✗</td>
        <td style="text-align:center;">0</td>
        <td style="font-size:9px;color:#aaa;">No detections</td>
      </tr>`),
  ].join('');

  const recRows = recs.map((r, i) => `
    <tr>
      <td style="text-align:center;font-size:10px;color:#777;">${i + 1}</td>
      <td>
        <span class="badge" style="background:${PRIORITY_COLOR[r.priority]}18;color:${PRIORITY_COLOR[r.priority]};border:1px solid ${PRIORITY_COLOR[r.priority]}44;">
          ${r.priority}
        </span>
      </td>
      <td>
        <div style="font-weight:600;margin-bottom:2px;">${r.title}</div>
        <div style="font-size:10px;color:#555;">${r.detail.length > 120 ? r.detail.slice(0,120) + '…' : r.detail}</div>
      </td>
      <td style="font-size:10px;color:#555;white-space:nowrap;">${r.control}</td>
      <td style="font-size:10px;color:#777;">${r.evidence || '—'}</td>
    </tr>`).join('');

  const pairRows = pairs.map(p => `
    <tr>
      <td style="font-family:monospace;font-size:10px;">${p.a}</td>
      <td style="font-family:monospace;font-size:10px;">${p.b}</td>
      <td style="text-align:center;font-weight:600;">${Math.round(p.score * 100)}%</td>
      <td style="font-size:10px;font-family:monospace;">${(p.shared_mitre || []).join(', ') || '—'}</td>
    </tr>`).join('');

  return `
  <div class="page">
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;">
      <div>
        <h1 style="font-size:16px;">ATLAS — Technical Report</h1>
        <div style="font-size:11px;color:#555;">For security operations and engineering teams</div>
      </div>
    </div>

    ${campaigns.length > 0 ? `
    <h2>Campaign Detail</h2>
    <table>
      <thead><tr>
        <th>Campaign</th><th style="text-align:center;">Size</th>
        <th style="text-align:center;">Duration</th><th style="text-align:center;">Cohesion</th>
        <th>Top Techniques</th><th>Severity</th>
      </tr></thead>
      <tbody>${campDetail}</tbody>
    </table>` : ''}

    <h2>MITRE ATT&amp;CK Coverage</h2>
    <table>
      <thead><tr>
        <th>Tactic ID</th><th>Tactic</th>
        <th style="text-align:center;">Status</th>
        <th style="text-align:center;">Incidents</th>
        <th>Techniques Observed</th>
      </tr></thead>
      <tbody>${tacticRows}</tbody>
    </table>

    ${recs.length > 0 ? `
    <h2>Hardening Recommendations</h2>
    <table>
      <thead><tr>
        <th style="width:24px;">#</th><th style="width:70px;">Priority</th>
        <th>Recommendation</th><th>Control Area</th><th>Evidence</th>
      </tr></thead>
      <tbody>${recRows}</tbody>
    </table>` : ''}

    ${pairs.length > 0 ? `
    <h2>Top Correlated Incident Pairs</h2>
    <table>
      <thead><tr>
        <th>Incident A</th><th>Incident B</th>
        <th style="text-align:center;">Match</th><th>Shared Techniques</th>
      </tr></thead>
      <tbody>${pairRows}</tbody>
    </table>` : ''}

    <div class="footer">
      ATLAS — Threat Correlation &amp; Clustering Framework &nbsp;·&nbsp;
      Local · Privacy-First · All PII SHA-256 hashed &nbsp;·&nbsp;
      Page 2 of 2 — Technical Report
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
  ${page2(incidents, clusters, mitre, heatmap, recommendations, correlations)}
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 600);
    });
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
