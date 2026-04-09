"""
sanitize.py — PII hashing and anonymization layer
Hashes usernames, hostnames, and IPs before any analysis.
Comments and payload fields are dropped entirely.
"""

import hashlib
import html
import os


PII_FIELDS = {
    'AccountUpn':   'USR-',
    'AccountName':  'USR-',
    'DeviceName':   'HOST-',
    'HostName':     'HOST-',
    'IpAddress':    'IP-',
    'RemoteIP':     'IP-',
    'SourceIp':     'IP-',
    'DestinationIp':'IP-',
}

DROP_FIELDS = {
    'Comments', 'Payload', 'RawData', 'Description',
    'AlertPayload', 'CustomDetails'
}


def hash_pii(value: str, salt: str = '') -> str:
    """SHA-256 hash a PII value. Deterministic so cross-incident correlation works."""
    if not value or str(value).strip() in ('', 'nan', 'None', 'NaN'):
        return 'UNKNOWN'
    raw = (salt + str(value).strip().lower()).encode('utf-8')
    return hashlib.sha256(raw).hexdigest()[:12].upper()


def sanitize_record(record: dict, salt: str = '') -> dict:
    """
    Sanitize a single incident record:
    - Drop PII-heavy free-text fields
    - Hash PII identifiers
    - Escape all string values to prevent XSS/injection
    """
    sanitized = {}
    for key, value in record.items():
        if key in DROP_FIELDS:
            continue
        str_value = str(value) if value is not None else ''
        if key in PII_FIELDS:
            sanitized[key] = PII_FIELDS[key] + hash_pii(str_value, salt)
        else:
            # Escape all string fields
            sanitized[key] = html.escape(str_value)
    return sanitized


def sanitize_records(records: list[dict], salt: str = '') -> list[dict]:
    """Sanitize a list of incident records."""
    return [sanitize_record(r, salt) for r in records]
