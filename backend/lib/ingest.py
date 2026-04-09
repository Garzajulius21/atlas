"""
ingest.py — CSV parsing, schema validation, and normalization
Validates incoming CSV exports against a strict schema.
Malformed rows are skipped and logged, never crash the pipeline.
"""

import io
import os
import pandas as pd
import jsonschema
from jsonschema import validate, ValidationError
from datetime import datetime

from lib.sanitize import sanitize_records

INCIDENT_SCHEMA = {
    '$schema': 'http://json-schema.org/draft-07/schema#',
    'type': 'object',
    'required': ['IncidentId', 'Title', 'Severity', 'CreatedTime', 'Status'],
    'additionalProperties': True,
    'properties': {
        'IncidentId': {
            'type': 'string',
            'pattern': r'^[a-zA-Z0-9\-_]{1,64}$'
        },
        'Title': {
            'type': 'string',
            'maxLength': 512
        },
        'Severity': {
            'type': 'string',
            'enum': ['High', 'Medium', 'Low', 'Informational']
        },
        'CreatedTime': {
            'type': 'string'
        },
        'Status': {
            'type': 'string',
            'enum': ['Active', 'Resolved', 'Closed', 'InProgress', 'New', 'In Progress']
        },
        'MitreTechniques': {
            'type': 'string',
            'maxLength': 1024
        },
        'Department': {
            'type': 'string',
            'maxLength': 128
        },
        'Classification': {
            'type': 'string',
            'maxLength': 128
        }
    }
}

# Map common Defender CSV column names to our internal schema
COLUMN_MAP = {
    'Incident Id':          'IncidentId',
    'Incident name':        'Title',
    'Incident Name':        'Title',
    'Severity':             'Severity',
    'Created time (UTC)':   'CreatedTime',
    'Created Time':         'CreatedTime',
    'CreatedTime':          'CreatedTime',
    'Status':               'Status',
    'MITRE ATT&CK techniques': 'MitreTechniques',
    'Mitre techniques':     'MitreTechniques',
    'MitreTechniques':      'MitreTechniques',
    'Assigned to':          'AssignedTo',
    'Classification':       'Classification',
    'Determination':        'Determination',
    'Investigation state':  'InvestigationState',
    'Last update time (UTC)': 'LastUpdatedTime',
    'Tags':                 'Tags',
    'Alert ids':            'AlertIds',
    'Impacted entities':    'ImpactedEntities',
    'Active alerts':        'ActiveAlerts',
    'Service sources':      'ServiceSources',
    'Detection sources':    'DetectionSources',
    'Department':           'Department',
    'AccountUpn':           'AccountUpn',
    'DeviceName':           'DeviceName',
    'IpAddress':            'IpAddress',
}

SEVERITY_NORM = {
    'high': 'High',
    'medium': 'Medium',
    'med': 'Medium',
    'low': 'Low',
    'informational': 'Informational',
    'info': 'Informational',
}

STATUS_NORM = {
    'active': 'Active',
    'resolved': 'Resolved',
    'closed': 'Closed',
    'inprogress': 'InProgress',
    'in progress': 'InProgress',
    'new': 'Active',
}


def normalize_severity(val: str) -> str:
    return SEVERITY_NORM.get(str(val).strip().lower(), 'Informational')


def normalize_status(val: str) -> str:
    return STATUS_NORM.get(str(val).strip().lower().replace(' ', ''), 'Active')


def parse_csv(file_bytes: bytes) -> dict:
    """
    Parse and validate a Defender incident CSV export.
    Returns sanitized records plus ingestion stats.
    """
    salt = os.getenv('PII_SALT', '')
    errors = []
    valid_records = []
    skipped = 0

    try:
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str)
    except Exception as e:
        return {'success': False, 'error': f'Could not parse CSV: {str(e)}', 'records': []}

    # Rename columns to internal schema
    df.rename(columns={k: v for k, v in COLUMN_MAP.items() if k in df.columns}, inplace=True)

    # Require at minimum IncidentId and Title
    if 'IncidentId' not in df.columns and 'Title' not in df.columns:
        return {
            'success': False,
            'error': 'CSV does not appear to be a Defender incident export. Missing required columns (IncidentId, Title).',
            'records': []
        }

    # Fill missing required columns with defaults
    if 'IncidentId' not in df.columns:
        df['IncidentId'] = [f'INC-{i}' for i in range(len(df))]
    if 'Severity' not in df.columns:
        df['Severity'] = 'Informational'
    if 'Status' not in df.columns:
        df['Status'] = 'Active'
    if 'CreatedTime' not in df.columns:
        df['CreatedTime'] = datetime.utcnow().isoformat()
    if 'MitreTechniques' not in df.columns:
        df['MitreTechniques'] = ''
    if 'Department' not in df.columns:
        df['Department'] = 'Unknown'

    # Normalize
    df['Severity'] = df['Severity'].apply(normalize_severity)
    df['Status'] = df['Status'].apply(normalize_status)
    df['IncidentId'] = df['IncidentId'].apply(lambda x: str(x).strip()[:64])

    total = len(df)

    for _, row in df.iterrows():
        record = row.where(pd.notna(row), '').to_dict()

        # Validate against schema
        try:
            validate(instance=record, schema=INCIDENT_SCHEMA)
        except ValidationError as e:
            skipped += 1
            errors.append(f"Row {record.get('IncidentId', '?')}: {e.message}")
            continue

        valid_records.append(record)

    # Sanitize all valid records
    sanitized = sanitize_records(valid_records, salt)

    return {
        'success': True,
        'total': total,
        'valid': len(sanitized),
        'skipped': skipped,
        'errors': errors[:10],  # cap error list
        'records': sanitized
    }
