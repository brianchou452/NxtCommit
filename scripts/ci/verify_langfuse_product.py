"""Read back live product trace IDs; never print credentials or trace input/output."""
import argparse
import base64
import datetime as dt
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--input', default='artifacts/llm-product-traced.json')
args = parser.parse_args()
values = {}
for line in Path('.env.langfuse').read_text().splitlines():
    if '=' in line:
        name, value = line.split('=', 1)
        values[name] = json.loads(value)
assert values['LANGFUSE_BASE_URL'] in ('https://cloud.langfuse.com', 'https://us.cloud.langfuse.com', 'https://jp.cloud.langfuse.com')
samples = json.loads(Path(args.input).read_text())
expected = {row['evidence']['traceId']: row for row in samples if row.get('evidence', {}).get('traceId')}
assert expected, 'No acknowledged product traces to verify'
token = base64.b64encode((values['LANGFUSE_PUBLIC_KEY'] + ':' + values['LANGFUSE_SECRET_KEY']).encode()).decode()
now = dt.datetime.now(dt.timezone.utc)
query = urllib.parse.urlencode({'fields': 'core,basic,time,usage,model,trace_context', 'fromStartTime': (now - dt.timedelta(hours=1)).isoformat(), 'toStartTime': (now + dt.timedelta(minutes=1)).isoformat(), 'limit': 100})
found = {}
for attempt in range(8):
    request = urllib.request.Request(values['LANGFUSE_BASE_URL'] + '/api/public/v2/observations?' + query, headers={'Authorization': 'Basic ' + token})
    with urllib.request.urlopen(request, timeout=15) as response:
        rows = json.load(response)['data']
    for row in rows:
        if row['traceId'] in expected:
            found[row['traceId']] = {key: row.get(key) for key in ('id', 'traceId', 'name', 'type', 'startTime', 'endTime', 'model', 'usageDetails', 'release', 'totalCost')}
    if len(found) == len(expected):
        break
    if attempt < 7:
        time.sleep(5)
for trace_id, row in found.items():
    sample = expected[trace_id]['evidence']
    assert row['type'] == 'GENERATION'
    assert row['model'] == sample['model']
    assert row['usageDetails']['total'] == sample['usage']['totalTokens']
    assert row['endTime'] > row['startTime']
Path('artifacts/langfuse-product-verified.json').write_text(json.dumps(list(found.values()), indent=2) + '\n')
print(json.dumps({'expectedTraces': len(expected), 'verifiedTraces': len(found), 'observations': list(found.values())}))
assert len(found) == len(expected), 'Some product traces are not yet visible in Langfuse'
