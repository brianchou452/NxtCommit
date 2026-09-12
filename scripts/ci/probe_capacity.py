"""Bounded read-only demo probe; not a write, browser, or maximum-capacity test."""
import concurrent.futures as futures
import datetime as dt
import http.client
import json
import math
from pathlib import Path
import time

HOST = 'hackathon.ianjuan.com'
PATHS = ['/', '/api/bootstrap', '/readyz', '/healthz']

def client(index, count):
    conn = http.client.HTTPSConnection(HOST, timeout=8)
    rows = []
    try:
        for number in range(count):
            path = PATHS[(index + number) % len(PATHS)]
            start = time.monotonic()
            try:
                conn.request('GET', path, headers={'User-Agent': 'NxtCommit-Capacity-Probe/1.0'})
                response = conn.getresponse()
                body = response.read(1024 * 1024)
                valid = response.status == 200
                if path == '/readyz': valid = valid and json.loads(body).get('db') is True
                if path == '/api/bootstrap': valid = valid and bool(json.loads(body).get('currentUser'))
                rows.append({'path': path, 'status': response.status, 'valid': valid, 'ms': round((time.monotonic()-start)*1000, 2)})
                if not valid: break
            except Exception as error:
                rows.append({'path': path, 'valid': False, 'error': type(error).__name__})
                break
            time.sleep(0.15)
    finally:
        conn.close()
    return rows

def main():
    if dt.datetime.now(dt.timezone.utc) >= dt.datetime(2026, 9, 12, 17, tzinfo=dt.timezone.utc):
        raise SystemExit('Demo closed; no requests sent.')
    result = {'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'host': HOST, 'scope': 'read-only warm HTTP, four endpoints, max 360 requests, 20 clients; no LLM/mutations/SSE/browser', 'stages': []}
    for clients in [1, 5, 10, 20]:
        start = time.monotonic()
        with futures.ThreadPoolExecutor(max_workers=clients) as pool:
            rows = sum(list(pool.map(lambda i: client(i, 10), range(clients))), [])
        elapsed = time.monotonic() - start
        times = sorted(row['ms'] for row in rows if 'ms' in row)
        percentile = lambda p: times[max(0, math.ceil(len(times)*p)-1)] if times else None
        stage = {'clients': clients, 'requests': len(rows), 'errors': sum(not r['valid'] for r in rows), 'seconds': round(elapsed, 2), 'rps': round(len(rows)/elapsed, 2), 'p50_ms': percentile(.5), 'p95_ms': percentile(.95), 'max_ms': max(times) if times else None}
        result['stages'].append(stage)
        print(json.dumps(stage), flush=True)
        if stage['errors'] or not times or stage['p95_ms'] > 3000: break
        time.sleep(2)
    Path('artifacts').mkdir(exist_ok=True)
    Path('artifacts/capacity-probe.json').write_text(json.dumps(result, indent=2)+'\n')
    if any(s['errors'] for s in result['stages']): raise SystemExit(1)
if __name__ == '__main__': main()
