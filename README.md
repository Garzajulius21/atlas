# ATLAS — Threat Correlation & Clustering Framework

![Status](https://img.shields.io/badge/Status-In%20Development-orange)
![Stack](https://img.shields.io/badge/Stack-Python%20%2B%20React-blue)
![Privacy](https://img.shields.io/badge/Privacy-PII%20Hashed%20Locally-green)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

ATLAS is a local, environment-agnostic threat correlation and clustering framework for SOC analysts. Upload a CSV export of Microsoft Defender incidents and ATLAS automatically:

- **Sanitizes PII** — usernames, hostnames, and IPs are SHA-256 hashed before any processing
- **Correlates incidents** into attack campaigns using fuzzy matching (temporal proximity + TTP similarity + entity overlap)
- **Clusters campaigns** using DBSCAN unsupervised machine learning to surface attack patterns Microsoft may have missed
- **Maps MITRE ATT&CK gaps** — shows which tactics and techniques are undetected in your environment
- **Builds a departmental risk heatmap** — identifies your most targeted departments
- **Generates hardening recommendations** — specific, prioritized actions derived from cluster findings

Runs entirely on localhost. No cloud dependencies, no API keys, no data leaves your machine.

---

## What It Does

1. **CSV upload** — drag and drop a Defender incident export, ATLAS validates the schema and rejects malformed data
2. **PII sanitization** — usernames, hostnames, and IPs hashed with SHA-256 before any analysis. Comments and payload fields dropped entirely
3. **Fuzzy correlation** — finds incidents Microsoft missed by scoring temporal proximity, TTP similarity, shared entities, and severity alignment
4. **DBSCAN clustering** — automatically discovers the number of attack campaigns without requiring upfront configuration
5. **Campaign map** — interactive scatter plot of incident clusters, click any cluster to drill into the incidents that form it
6. **Department heatmap** — risk matrix of departments vs severity, scored by incident volume and TTP diversity
7. **MITRE ATT&CK gap analysis** — ATT&CK navigator-style view showing detected techniques vs blind spots
8. **Incident browser** — searchable, filterable table of all sanitized incidents
9. **Recommendations engine** — maps cluster findings to specific hardening actions (e.g. "Enforce MFA for Marketing — 7 High incidents detected")

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ / Flask |
| Data processing | pandas, scikit-learn, numpy |
| Input validation | jsonschema |
| Frontend | React 18 + Vite + Tailwind CSS |
| Visualisation | Recharts, D3.js |
| Security | PII hashing, input validation, CORS locked to localhost |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js v18+

### Install
```bash
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

### Start
Double-click `start-atlas.command` or run manually:
```bash
# Terminal 1
cd backend && python server.py

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

## Future — Live Graph API Integration

When organizational approval is granted, the CSV ingestion layer can be swapped for a live Microsoft Graph API pull. The entire analysis, clustering, and UI layer remains unchanged. Required permissions (read-only):

- `SecurityIncident.Read.All`
- `SecurityAlert.Read.All`
- `IdentityInfo.Read.All`
- `User.Read.All`

See `SPEC.md` for full technical specification, KQL queries, algorithm details, and adversarial threat model.

---

## Project Status

| Phase | Status |
|-------|--------|
| Spec & architecture | ✅ Complete |
| Backend — ingest & sanitize | 🔄 In progress |
| Backend — correlation & clustering | Pending |
| Backend — MITRE gap analysis | Pending |
| Backend — recommendations engine | Pending |
| Frontend — upload & incident browser | Pending |
| Frontend — cluster map | Pending |
| Frontend — department heatmap | Pending |
| Frontend — MITRE gap panel | Pending |
| Frontend — recommendations panel | Pending |
