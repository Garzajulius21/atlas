# ATLAS — Threat Correlation & Clustering Framework
## Technical Specification v1.0

---

## Overview

ATLAS is a local, environment-agnostic threat correlation and clustering framework. It ingests Microsoft Defender incident exports (CSV), sanitizes PII, correlates incidents into attack campaigns using unsupervised machine learning, maps coverage against MITRE ATT&CK, and surfaces a departmental risk heatmap — all through a local web dashboard.

Designed to run entirely offline. No cloud dependencies, no API keys required. When organizational approval is granted, the CSV ingestion layer can be swapped for a live Microsoft Graph API pull with zero changes to the analysis or UI layers.

---

## Architecture

```
atlas/
├── backend/
│   ├── server.py              ← Flask API server
│   ├── lib/
│   │   ├── ingest.py          ← CSV parsing and schema validation
│   │   ├── sanitize.py        ← PII hashing and anonymization
│   │   ├── correlate.py       ← Fuzzy matching and temporal correlation
│   │   ├── cluster.py         ← DBSCAN clustering engine
│   │   ├── mitre.py           ← MITRE ATT&CK gap analysis
│   │   ├── heatmap.py         ← Departmental risk matrix
│   │   └── recommend.py       ← Hardening recommendations engine
│   ├── requirements.txt
│   └── .env
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── UploadPanel.jsx          ← CSV drag-and-drop with landing page
│           ├── IncidentTable.jsx        ← Searchable, sortable incident browser
│           ├── CampaignsTab.jsx         ← Expandable campaign table with confidence tiers
│           ├── CorrelationExplorer.jsx  ← Ranked correlation pairs with filters
│           ├── HeatmapPanel.jsx         ← Department risk heatmap with drill-down
│           ├── MitrePanel.jsx           ← ATT&CK tactic grid and gap analysis
│           ├── RecommendPanel.jsx       ← Prioritised hardening recommendations
│           ├── IncidentDrawer.jsx       ← Slide-in incident detail panel
│           └── Tooltip.jsx              ← Portal-based tooltip component
├── SPEC.md
├── README.md
└── start-atlas.command
```

---

## Pillar 1 — Secure Architecture & Data Privacy

### PII Sanitization Layer (`sanitize.py`)

All PII is hashed before any analysis. The raw values are never written to disk or sent anywhere.

**Fields sanitized:**
- `AccountUpn` / `AccountName` — SHA-256 hashed, prefixed `USR-`
- `DeviceName` / `HostName` — SHA-256 hashed, prefixed `HOST-`
- `IpAddress` / `RemoteIP` — SHA-256 hashed, prefixed `IP-`
- `Comments` — field dropped entirely (free-text, high PII risk)
- `Payload` — field dropped entirely

**Approach:**
- Deterministic hashing (same input → same hash) so cross-incident correlation still works
- Optional salt configurable in `.env` — if set, hashes are non-reversible even with the source data
- Department and Job Title fields are preserved as-is (needed for heatmap, low PII risk)

```python
import hashlib

def hash_pii(value: str, salt: str = '') -> str:
    if not value or value.strip() == '':
        return 'UNKNOWN'
    raw = (salt + value.strip().lower()).encode('utf-8')
    digest = hashlib.sha256(raw).hexdigest()[:12].upper()
    return digest

def sanitize_record(record: dict, salt: str = '') -> dict:
    PII_FIELDS = {
        'AccountUpn': 'USR-',
        'AccountName': 'USR-',
        'DeviceName': 'HOST-',
        'HostName': 'HOST-',
        'IpAddress': 'IP-',
        'RemoteIP': 'IP-'
    }
    DROP_FIELDS = ['Comments', 'Payload', 'RawData']

    sanitized = {}
    for key, value in record.items():
        if key in DROP_FIELDS:
            continue
        if key in PII_FIELDS:
            sanitized[key] = PII_FIELDS[key] + hash_pii(str(value), salt)
        else:
            sanitized[key] = value
    return sanitized
```

### Principle of Least Privilege

For the future Graph API integration, only the following permissions are required. No Write, no Global Admin.

| Permission | Type | Justification |
|-----------|------|--------------|
| `SecurityIncident.Read.All` | Application | Read Defender incidents |
| `SecurityAlert.Read.All` | Application | Read alert evidence |
| `IdentityInfo.Read.All` | Application | Read department/job title for heatmap |
| `User.Read.All` | Application | Resolve UPN to department mapping |

**Explicitly excluded:** Any `.Write`, `.Manage`, `GlobalAdmin`, `RoleManagement`, or `Directory.ReadWrite` permissions.

---

## Pillar 2 — Advanced Correlation Logic

### Fuzzy Matching (`correlate.py`)

Standard Defender correlation groups incidents by its own logic — but misses cross-department, temporally-spread campaigns. ATLAS adds a second correlation pass:

**Correlation signals (weighted):**

| Signal | Weight | Logic |
|--------|--------|-------|
| Entity overlap | 0.35 | Shared hashed IPs, hosts, or users across incidents (Jaccard similarity) |
| TTP similarity | 0.30 | Jaccard similarity between MITRE technique sets |
| Temporal proximity | 0.25 | Exponential decay within a configurable window (default 72h) |
| Severity alignment | 0.10 | Normalised difference in severity weights |

**Composite score:** Incidents with a combined score ≥ 0.70 (configurable) are passed to DBSCAN for campaign clustering.

```python
def jaccard_similarity(set_a: set, set_b: set) -> float:
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0.0

def correlation_score(inc_a: dict, inc_b: dict, time_window_hours: int = 72) -> float:
    from datetime import datetime, timedelta

    # Temporal proximity
    try:
        t_a = datetime.fromisoformat(inc_a.get('CreatedTime', ''))
        t_b = datetime.fromisoformat(inc_b.get('CreatedTime', ''))
        delta_hours = abs((t_a - t_b).total_seconds()) / 3600
        temporal = max(0, 1 - (delta_hours / time_window_hours))
    except Exception:
        temporal = 0.0

    # TTP similarity
    ttps_a = set(str(inc_a.get('MitreTechniques', '')).split(','))
    ttps_b = set(str(inc_b.get('MitreTechniques', '')).split(','))
    ttp_sim = jaccard_similarity(ttps_a, ttps_b)

    # Entity overlap
    entities_a = set([inc_a.get('AccountUpn',''), inc_a.get('DeviceName',''), inc_a.get('IpAddress','')])
    entities_b = set([inc_b.get('AccountUpn',''), inc_b.get('DeviceName',''), inc_b.get('IpAddress','')])
    entity_sim = jaccard_similarity(entities_a - {'UNKNOWN'}, entities_b - {'UNKNOWN'})

    # Severity alignment
    sev_map = {'High': 3, 'Medium': 2, 'Low': 1, 'Informational': 0}
    sev_a = sev_map.get(inc_a.get('Severity', ''), 0)
    sev_b = sev_map.get(inc_b.get('Severity', ''), 0)
    severity_score = 1.0 if sev_a == sev_b else max(0, 1 - abs(sev_a - sev_b) / 3)

    return (0.30 * temporal) + (0.40 * ttp_sim) + (0.20 * entity_sim) + (0.10 * severity_score)
```

### Departmental Risk Matrix (`heatmap.py`)

Join incident data with the `Department` field to produce a risk score per department.

**Risk score formula:**

```
DeptRiskScore = (High × 4) + (Medium × 2) + (Low × 1)
```

Output: departments ranked by severity-weighted risk score, with per-department incident drill-down, campaign badges, and last-activity timestamps.

---

## Pillar 3 — Adversarial Resilience

### Abuse Case Analysis

| Attack Vector | Description | Mitigation |
|--------------|-------------|-----------|
| **Data poisoning** | Attacker injects synthetic incidents with misleading TTPs to create false campaign clusters | Input validation via JSON Schema; anomaly detection on cluster density |
| **Cluster manipulation** | Flooding with low-severity incidents to dilute signal from real campaigns | Severity weighting in correlation score; minimum cluster size threshold |
| **PII re-identification** | Correlating hashed values with known-plaintext from other sources | Optional salt in `.env`; document that hashes are not a substitute for access control |
| **Prompt injection via CSV** | Injecting AI prompt syntax into incident title/description fields | All string fields sanitized with `html.escape()` before processing; no LLM involved in core pipeline |
| **Schema abuse** | Malformed CSV rows with missing fields causing pipeline crashes | Strict JSON Schema validation at ingestion; malformed rows logged and skipped |

### Input Validation — JSON Schema

Applied after CSV → JSON conversion at the ingestion layer:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["IncidentId", "Title", "Severity", "CreatedTime", "Status"],
  "additionalProperties": true,
  "properties": {
    "IncidentId": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9\\-_]{1,64}$"
    },
    "Title": {
      "type": "string",
      "maxLength": 512
    },
    "Severity": {
      "type": "string",
      "enum": ["High", "Medium", "Low", "Informational"]
    },
    "CreatedTime": {
      "type": "string",
      "format": "date-time"
    },
    "Status": {
      "type": "string",
      "enum": ["Active", "Resolved", "Closed", "InProgress"]
    },
    "MitreTechniques": {
      "type": "string",
      "maxLength": 1024
    },
    "Department": {
      "type": "string",
      "maxLength": 128
    }
  }
}
```

---

## Pillar 4 — Technical Deliverables

### KQL Query (Future Graph API Integration)

Extracts incident and identity data while explicitly excluding PII-heavy fields:

```kql
let IncidentData =
    SecurityIncident
    | where TimeGenerated >= ago(90d)
    | project
        IncidentId = tostring(IncidentNumber),
        Title,
        Severity,
        CreatedTime = TimeGenerated,
        Status,
        Classification,
        MitreTechniques = tostring(AdditionalData.techniques),
        AlertIds = tostring(AlertIds)
    // Explicitly exclude: Comments, Description (may contain PII/payload data)
    ;

let IdentityData =
    IdentityInfo
    | summarize arg_max(TimeGenerated, *) by AccountUPN
    | project
        AccountUPN,
        Department,
        JobTitle,
        City,
        Country
    // Explicitly exclude: Manager, DirectReports, raw attributes
    ;

let AlertEntityData =
    SecurityAlert
    | mv-expand todynamic(Entities)
    | extend
        EntityType    = tostring(Entities.Type),
        AccountUpn    = tostring(Entities.UserPrincipalName),
        HostName      = tostring(Entities.HostName),
        IpAddress     = tostring(Entities.Address)
    | where EntityType in ('account', 'host', 'ip')
    | project SystemAlertId, EntityType, AccountUpn, HostName, IpAddress
    ;

IncidentData
| mv-expand todynamic(AlertIds)
| extend AlertId = tostring(AlertIds)
| join kind=leftouter AlertEntityData on $left.AlertId == $right.SystemAlertId
| join kind=leftouter IdentityData on $left.AccountUpn == $right.AccountUPN
| project
    IncidentId, Title, Severity, CreatedTime, Status, Classification,
    MitreTechniques, EntityType, AccountUpn, HostName, IpAddress,
    Department, JobTitle
| order by CreatedTime desc
```

### Clustering Algorithm — DBSCAN

**Why DBSCAN over K-Means:**

| Factor | K-Means | DBSCAN |
|--------|---------|--------|
| Number of clusters | Must be specified upfront | Discovered automatically |
| Outlier handling | All points assigned to a cluster | Outliers labeled as noise (-1) |
| Cluster shape | Assumes spherical clusters | Finds arbitrarily shaped clusters |
| Campaign discovery | Poor — forces grouping | Ideal — finds dense attack bursts |

DBSCAN parameters:
- `eps` — derived from correlation threshold: `eps = 1 - CORRELATION_THRESHOLD` (default: 0.30)
- `min_samples` — minimum incidents to form a campaign cluster (default: 2, configurable via `MIN_CLUSTER_SIZE` env var)
- `metric='precomputed'` — uses the precomputed similarity matrix converted to a distance matrix

### Recommendations Engine (`recommend.py`)

Maps cluster findings to specific hardening actions:

| Finding | Recommendation |
|---------|---------------|
| Department X has ≥ 5 High incidents | "Enforce MFA for all [Department] accounts" |
| MFA-bypass TTP detected (T1621, T1556) | "Review Conditional Access policies for named locations" |
| Lateral movement cluster (T1021, T1570) | "Enable network segmentation between [Dept A] and [Dept B]" |
| Credential access TTPs dominant (T1003, T1110) | "Deploy Microsoft Defender for Identity — LAPS enforcement" |
| MITRE tactic gap: Exfiltration | "Enable Defender for Cloud Apps — file download policies" |
| Single user entity in 3+ clusters | "Investigate USR-[hash] for potential insider threat or compromised account" |

---

## Dashboard Panels

| Panel | Description |
|-------|-------------|
| **Upload** | CSV drag-and-drop with validation feedback; compact status bar after upload |
| **Incidents** | Sortable, filterable table with search, severity/status filters, keyboard navigation, and slide-in detail drawer |
| **Campaigns** | Expandable campaign table with 5-tier confidence scale, severity breakdown, MITRE links, and campaign explainer |
| **MITRE ATT&CK** | Tactic grid showing detected vs missing tactics; per-tactic severity breakdown and technique coverage fractions |
| **Correlations** | Ranked incident pairs with adjustable threshold slider, strength filter, shared signal display |
| **Risk Heatmap** | Departments ranked by severity-weighted risk score with incident drill-down and campaign badges |
| **Recommendations** | Prioritised hardening actions with evidence attribution, control area, and collapsible detail |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 / Flask |
| Data processing | pandas, scikit-learn (DBSCAN), numpy |
| Validation | jsonschema |
| Frontend | React 18 + Vite (inline styles — no CSS framework) |
| Security | SHA-256 PII hashing, JSON Schema input validation, CORS locked to localhost |

---

## Privacy & Security Standards

- No data leaves localhost at any point
- PII hashed before any processing using SHA-256
- Raw CSV never written back to disk after ingestion
- All string inputs sanitized with `html.escape()` before rendering
- No LLM involved in the core pipeline — no prompt injection surface
- Designed to pass internal security audit per McGraw Software Security Touchpoints

---

## Future Phase — Live Graph API Integration

When organizational approval is granted:

1. Add `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` to `.env`
2. Replace `ingest.py` CSV reader with `graph_ingest.py` using MSAL
3. Use the KQL query above via the Sentinel API
4. All analysis, clustering, and UI layers remain unchanged

The sanitization layer runs identically — the only change is the data source.
