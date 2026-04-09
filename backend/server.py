"""
ATLAS backend server
Handles CSV ingestion, sanitization, correlation, clustering, MITRE gap analysis,
departmental heatmap, and hardening recommendations.
"""

import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from lib.ingest import parse_csv
from lib.correlate import build_correlation_matrix, top_correlations
from lib.cluster import cluster_incidents
from lib.mitre import analyse_mitre
from lib.heatmap import build_heatmap
from lib.recommend import generate_recommendations

app = Flask(__name__)
CORS(app, origins=['http://localhost:5174', 'http://127.0.0.1:5174'])

CORRELATION_THRESHOLD = float(os.getenv('CORRELATION_THRESHOLD', 0.65))

# In-memory store for the current session
_session = {
    'records': [],
    'stats': {},
    'matrix': [],
    'clusters': {},
    'mitre': {},
    'heatmap': {},
    'recommendations': [],
    'correlations': [],
}


def _run_analysis():
    """Run full analysis pipeline on current session records."""
    records = _session['records']
    if not records:
        return

    matrix = build_correlation_matrix(records)
    _session['matrix'] = matrix

    _session['clusters'] = cluster_incidents(records, matrix)
    _session['correlations'] = top_correlations(records, matrix, threshold=CORRELATION_THRESHOLD)
    _session['mitre'] = analyse_mitre(records)
    _session['heatmap'] = build_heatmap(records)
    _session['recommendations'] = generate_recommendations(
        _session['mitre'],
        _session['clusters'],
        _session['heatmap'],
    )


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'ATLAS'})


@app.route('/api/upload', methods=['POST'])
def upload():
    """Accept a CSV file upload, parse, sanitize, and run full analysis pipeline."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'Only CSV files are supported'}), 400

    file_bytes = file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        return jsonify({'error': 'File too large. Maximum size is 10MB'}), 400

    result = parse_csv(file_bytes)

    if not result['success']:
        return jsonify({'error': result['error']}), 422

    _session['records'] = result['records']
    _session['stats'] = {
        'total': result['total'],
        'valid': result['valid'],
        'skipped': result['skipped'],
        'errors': result['errors'],
    }

    # Run full pipeline
    try:
        _run_analysis()
    except Exception as e:
        # Analysis failure should not block data availability
        app.logger.error(f'Analysis pipeline error: {e}')

    return jsonify({
        'success': True,
        'stats': _session['stats'],
        'preview': result['records'][:5],
    })


@app.route('/api/incidents', methods=['GET'])
def incidents():
    """Return all sanitized incidents."""
    if not _session['records']:
        return jsonify({'error': 'No data loaded. Upload a CSV first.'}), 404
    return jsonify({
        'records': _session['records'],
        'total': len(_session['records']),
    })


@app.route('/api/stats', methods=['GET'])
def stats():
    """Return ingestion stats for the current session."""
    return jsonify(_session['stats'])


@app.route('/api/clusters', methods=['GET'])
def clusters():
    """Return DBSCAN clustering results."""
    if not _session['records']:
        return jsonify({'error': 'No data loaded.'}), 404
    return jsonify(_session['clusters'])


@app.route('/api/correlations', methods=['GET'])
def correlations():
    """Return top correlated incident pairs."""
    if not _session['records']:
        return jsonify({'error': 'No data loaded.'}), 404
    return jsonify({
        'pairs': _session['correlations'],
        'total': len(_session['correlations']),
    })


@app.route('/api/mitre', methods=['GET'])
def mitre():
    """Return MITRE ATT&CK gap analysis."""
    if not _session['records']:
        return jsonify({'error': 'No data loaded.'}), 404
    return jsonify(_session['mitre'])


@app.route('/api/heatmap', methods=['GET'])
def heatmap():
    """Return departmental risk heatmap data."""
    if not _session['records']:
        return jsonify({'error': 'No data loaded.'}), 404
    return jsonify(_session['heatmap'])


@app.route('/api/recommendations', methods=['GET'])
def recommendations():
    """Return hardening recommendations."""
    if not _session['records']:
        return jsonify({'error': 'No data loaded.'}), 404
    return jsonify({
        'recommendations': _session['recommendations'],
        'total': len(_session['recommendations']),
    })


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 3001))
    print(f'\nATLAS backend starting on http://localhost:{port}')
    print('  Ingestion:       ✓')
    print('  Sanitization:    ✓')
    print('  Correlation:     ✓')
    print('  Clustering:      ✓')
    print('  MITRE Gap:       ✓')
    print('  Heatmap:         ✓')
    print('  Recommendations: ✓\n')
    app.run(port=port, debug=True)
