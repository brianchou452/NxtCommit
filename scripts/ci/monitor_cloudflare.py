"""Read-only availability, capacity and estimated usage evidence (not an invoice)."""
import datetime as dt
import json
import os
from pathlib import Path
import time
import urllib.request

if dt.datetime.now(dt.timezone.utc) >= dt.datetime(2026, 9, 12, 17, tzinfo=dt.timezone.utc):
    print('Hackathon deadline passed; no requests sent and no container awakened.')
    raise SystemExit(0)

out = Path('artifacts'); out.mkdir(exist_ok=True)
result = {'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'alerts': []}
base = 'https://hackathon.ianjuan.com'
for path in ['/', '/healthz', '/readyz', '/__deployment']:
    start = time.monotonic()
    try:
        with urllib.request.urlopen(base + path, timeout=60) as response:
            body = response.read()
            if path == '/readyz' and json.loads(body).get('db') is not True:
                raise ValueError('Database not ready')
            result[path] = {'status': response.status, 'seconds': round(time.monotonic()-start, 3)}
    except Exception as error:
        result['alerts'].append(path + ': ' + type(error).__name__)

now = dt.datetime.now(dt.timezone.utc)
query = '''query($account: String, $start: Time, $end: Time) {
 viewer { accounts(filter: {accountTag: $account}) {
  containersMetricsAdaptiveGroups(limit: 100, filter: {datetime_geq: $start, datetime_leq: $end}) {
   dimensions { applicationId } max { memory diskUsagePercentage } quantiles { cpuUtilizationP95 }
  }
  containersUsageAdaptiveGroups(limit: 100, filter: {datetime_geq: $start, datetime_leq: $end}) {
   dimensions { applicationId } sum { cpuTimeSec allocatedMemory allocatedDisk txBytes }
  }
 } }
}'''
try:
    payload = {'query': query, 'variables': {'account': os.environ['CLOUDFLARE_ACCOUNT_ID'], 'start': (now-dt.timedelta(hours=24)).isoformat(), 'end': now.isoformat()}}
    request = urllib.request.Request('https://api.cloudflare.com/client/v4/graphql', data=json.dumps(payload).encode(), headers={'Authorization': 'Bearer '+os.environ['CLOUDFLARE_API_TOKEN'], 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response: data = json.load(response)
    if data.get('errors'): raise ValueError('Analytics query rejected: '+json.dumps(data['errors']))
    account = data['data']['viewer']['accounts'][0]
    result['analytics'] = account
    # Account scope is explicit: includes other Containers if any are added later.
    rows = account['containersUsageAdaptiveGroups']
    result['analyticsScope'] = 'all containers in owning account, trailing 24 hours'
    result['estimatedGrossContainerUSD24h'] = round(sum(r['sum']['cpuTimeSec']*0.000020 + r['sum']['allocatedMemory']/2**30*0.0000025 + r['sum']['allocatedDisk']/1e9*0.00000007 + r['sum']['txBytes']/1e9*0.05 for r in rows), 4)
    result['estimateExcludes'] = 'included allowances, Workers, Durable Objects, logs, tax and monthly base fee; not an invoice'
    if not rows: result['alerts'].append('Usage data unavailable or not yet ingested; not zero usage')
    if result['estimatedGrossContainerUSD24h'] > 2: result['alerts'].append('Trailing 24h gross container estimate exceeds USD 2')
    for row in account['containersMetricsAdaptiveGroups']:
        if row['max']['memory'] > 0.8*2**30: result['alerts'].append('Memory above 80% of basic capacity')
        if row['max']['diskUsagePercentage'] > 80: result['alerts'].append('Disk above 80%')
        if row['quantiles']['cpuUtilizationP95'] > 0.8: result['alerts'].append('CPU p95 above 80%')
except Exception as error:
    result['alerts'].append('Analytics unavailable: '+str(error))
(out/'monitor.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
        f.write('### NxtCommit availability and usage\n\n```json\n'+json.dumps(result,indent=2)+'\n```\n')
if result['alerts']: raise SystemExit(1)
