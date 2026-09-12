"""Verify a real terminal cloud cycle without touching shared mission state."""
import json
import os
from pathlib import Path
import urllib.request

base = os.environ.get('DEPLOYMENT_URL', 'https://hackathon.ianjuan.com').rstrip('/')
assert base == 'https://hackathon.ianjuan.com', 'Unexpected probe destination'
token = os.environ['OPENAI_CHECK_TOKEN']
request = urllib.request.Request(base + '/api/assurance/run', method='POST',
    headers={'Authorization': 'Bearer ' + token, 'User-Agent': 'NxtCommit-Assurance-Probe/1.0'})
with urllib.request.urlopen(request, timeout=150) as response:
    run = json.load(response)
assert run['status'] == 'passed', 'Controlled checks did not pass'
assert run['report']['summary']['total'] == 38
assert run['report']['summary']['failed'] == 0
assert all(stage['status'] == 'completed' for stage in run['stages'])
assert len(run['advice']) == 4
assert run['modelCalls'] == 4, 'Four provider calls were not observed'
assert all(value['evidence']['generator'] == 'openai' for value in run['advice'].values()), 'A model role fell back'
if os.environ.get('EXPECTED_COMMIT_SHA'):
    assert run['commit'] == os.environ['EXPECTED_COMMIT_SHA']
readback = urllib.request.Request(base + '/api/assurance', headers={'User-Agent': 'NxtCommit-Assurance-Probe/1.0'})
with urllib.request.urlopen(readback, timeout=20) as response:
    snapshot = json.load(response)
assert any(row['id'] == run['id'] and row['status'] == run['status'] for row in snapshot['runs'])
Path('artifacts').mkdir(exist_ok=True)
Path('artifacts/assurance-live.json').write_text(json.dumps(run, indent=2) + '\n')
print(json.dumps({'id': run['id'], 'commit': run['commit'], 'status': run['status'],
    'modelCalls': run['modelCalls'], 'summary': run['report']['summary'],
    'knownTokens': run['knownInputTokens'] + run['knownOutputTokens'],
    'unknownUsageCalls': run['unknownUsageCalls']}))
