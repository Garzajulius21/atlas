# ATLAS — Threat Correlation & Clustering Framework

![Status](https://img.shields.io/badge/Status-Complete-brightgreen)
![Stack](https://img.shields.io/badge/Stack-Python%20%2B%20React-blue)
![Privacy](https://img.shields.io/badge/Privacy-PII%20Hashed%20Locally-green)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

ATLAS is a local, privacy-first threat correlation and clustering framework for SOC analysts and incident responders. Upload a CSV export of Microsoft Defender incidents and ATLAS automatically:

- **Sanitizes PII** — usernames, hostnames, and IPs are SHA-256 hashed before any processing
- **Correlates incidents** using weighted scoring: entity overlap (35%), MITRE technique similarity (30%), temporal proximity (25%), severity alignment (10%)
- **Clusters campaigns** using DBSCAN unsupervised machine learning to surface coordinated attack patterns
- **Maps MITRE ATT&CK coverage** — shows which tactics and techniques are detected vs blind spots, with severity breakdown and technique coverage fractions
- **Builds a departmental risk heatmap** — identifies highest-risk departments with drill-down to individual incidents
- **Generates hardening recommendations** — prioritised, actionable controls derived from cluster findings, tactic gaps, and department risk
- **Exports a professional PDF report** — two-page executive briefing + technical detail, ready to hand to a CISO

Runs entirely on localhost. No cloud dependencies, no API keys, no data leaves your machine.

---

## Tabs

| Tab | What it does |
|---|---|
| **Incidents** | Sortable, filterable table of all incidents with severity, campaign, and MITRE tags |
| **Campaigns** | Expandable campaign table with 5-tier confidence scale and full campaign explainer |
| **MITRE ATT&CK** | Tactic grid with incident counts, severity breakdown, technique coverage fractions, and gap analysis |
| **Correlations** | Ranked correlation pairs with shared signals, strength filters, and campaign context |
| **Risk Heatmap** | Departmental risk ranked by severity-weighted score, with incident drill-down and campaign badges |
| **Recommendations** | Prioritised hardening actions with source attribution, collapsible detail, and priority/source filters |

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 / Flask |
| Data processing | pandas, scikit-learn, numpy |
| Input validation | jsonschema |
| Frontend | React 18 + Vite (inline styles — no CSS framework) |
| Security | SHA-256 PII hashing, input validation, CORS locked to localhost |

---

## Setup

### Prerequisites
- Python 3.12 (via `brew install python@3.12`)
- Node.js v18+

### Install
```bash
# Backend
cd backend
/opt/homebrew/bin/python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend && npm install
```

### Start
Double-click `start-atlas.command` or run manually:
```bash
# Terminal 1
cd backend && source venv/bin/activate && python server.py

# Terminal 2
cd frontend && npm run dev
```

Open **http://localhost:5173**

---

## Privacy & Security

- All PII hashed with SHA-256 before any processing — raw values never stored or transmitted
- Comments and Payload fields dropped at ingestion — never processed
- Optional salt configurable in `backend/.env` for non-reversible hashing
- Strict JSON Schema validation at ingestion — malformed rows skipped and logged
- No LLM in the core pipeline — no prompt injection surface
- No data leaves localhost at any point

---

## PDF Export

ATLAS generates a two-page print-ready report:

- **Page 1 — Executive Briefing**: Overall risk level, key metrics, auto-generated narrative summary, campaign table, departmental risk, and prioritised actions with ownership and timeframes
- **Page 2 — Technical Report**: Full campaign detail, MITRE ATT&CK coverage matrix, complete recommendations with evidence, and top correlated incident pairs with titles

Both pages include the analysis date range, confidence verdict labels, and a privacy footer confirming all PII is hashed.

---

## Future — Live Graph API Integration

When organisational approval is granted, the CSV ingestion layer can be swapped for a live Microsoft Graph API pull. The entire analysis, clustering, and UI layer remains unchanged. Required permissions (read-only):

- `SecurityIncident.Read.All`
- `SecurityAlert.Read.All`
- `IdentityInfo.Read.All`
- `User.Read.All`

See `SPEC.md` for full technical specification, KQL queries, algorithm details, and adversarial threat model.

---

## Project Status

| Component | Status |
|---|---|
| Spec & architecture | ✅ Complete |
| Backend — ingest & sanitize | ✅ Complete |
| Backend — correlation & clustering | ✅ Complete |
| Backend — MITRE gap analysis (severity breakdown + coverage fractions) | ✅ Complete |
| Backend — departmental heatmap | ✅ Complete |
| Backend — recommendations engine | ✅ Complete |
| Frontend — upload & incident browser | ✅ Complete |
| Frontend — campaigns (expandable table, confidence scale) | ✅ Complete |
| Frontend — correlation explorer (ranked pairs, strength filters) | ✅ Complete |
| Frontend — department risk heatmap (drill-down, campaign badges) | ✅ Complete |
| Frontend — MITRE ATT&CK panel (severity pips, coverage fractions, gap summary) | ✅ Complete |
| Frontend — recommendations panel (collapsible, priority + source filters) | ✅ Complete |
| PDF export (executive + technical, two-page) | ✅ Complete |
| Stephen Few compliance audit | ✅ Complete |
