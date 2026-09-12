"""Opt-in live demo probe: up to eight billable advice calls and one fixture mission.

Does not reset shared state, approve a run, or execute imported code. Outputs
only measured timing/provenance, never prompts, generated text or capabilities.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import time
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--expected-sha', required=True)
parser.add_argument('--output', default='artifacts/llm-product.json')
args = parser.parse_args()
if dt.datetime.now(dt.timezone.utc) >= dt.datetime(2026, 9, 12, 17, tzinfo=dt.timezone.utc):
    raise SystemExit('Demo cutoff reached.')
base = 'https://hackathon.ianjuan.com'
rows = []

def call(path, body=None, label=None):
    start = time.monotonic()
    request = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'User-Agent': 'NxtCommit-Product-Check/1.0'})
    with urllib.request.urlopen(request, timeout=25) as response:
        result = json.load(response)
    if label:
        row = {'stage': label, 'wallMs': round((time.monotonic() - start) * 1000), 'status': 200}
        rows.append(row)
    return result

def advice(path, body, key, label):
    result = call(path, body, label)[key]
    rows[-1]['evidence'] = result['evidence']
    assert result['evidence']['generator'] == 'openai', f'{label} used fallback'
    assert result['evidence'].get('traceId'), f'{label} missing persisted trace'
    print(json.dumps(rows[-1]), flush=True)
    return result

try:
    receipt = call('/__deployment')
    assert receipt['commit'] == args.expected_sha, 'Unexpected deployed source'
    readiness = call('/readyz')
    assert readiness['llmConfigured'], 'Product LLM not configured'
    analysis = call('/api/analyze', {'source': 'fixture'}, 'fixture-analysis')['analysis']
    context = {'analysis': analysis, 'issueId': analysis['issues'][0]['id']}
    for index in range(3):
        advice('/api/analysis/assist', context, 'assistant', f'issue-triage-{index + 1}')
    draft = advice('/api/campaigns/generate', {**context, 'mode': 'openai'}, 'draft', 'campaign-generation')
    assert draft['generator'] == 'openai', 'Generation used labelled fallback'
    advice('/api/campaigns/critique', {'analysis': analysis, 'draft': draft}, 'critique', 'campaign-critic')
    mission = call('/api/missions', {'analysis': analysis, 'draft': draft}, 'mission-create')['mission']
    advice(f"/api/projects/{mission['project']['id']}/explain", None, 'plain', 'project-explanation')
    begin = time.monotonic()
    call(f"/api/missions/{mission['id']}/pledge", {'amount': mission['computeGoal']}, 'demo-funding')
    for _ in range(40):
        detail = call(f"/api/missions/{mission['id']}")
        if detail.get('latestRun') and detail['latestRun']['status'] != 'running':
            break
        time.sleep(.25)
    assert detail['latestRun']['status'] == 'succeeded', 'Fixture did not succeed'
    assert detail['artifact']['testEvidenceSource'] == 'engine'
    final = detail['artifact']['dossier']['experiments'][-1]
    assert final['passed'] == 5 and final['failed'] == 0
    rows.append({'stage': 'fixture-terminal', 'wallMs': round((time.monotonic() - begin) * 1000), 'missionId': mission['id'], 'runId': detail['latestRun']['id'], 'status': detail['status'], 'passed': final['passed'], 'failed': final['failed'], 'executionMode': 'scripted-demo', 'evidenceSource': 'engine'})
    advice(f"/api/runs/{detail['latestRun']['id']}/explain", None, 'explanation', 'evidence-explanation')
    advice(f"/api/runs/{detail['latestRun']['id']}/shadow-review", None, 'shadow', 'shadow-review')
finally:
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(rows, indent=2) + '\n')
    print(json.dumps({'samples': len(rows), 'report': str(destination)}), flush=True)
