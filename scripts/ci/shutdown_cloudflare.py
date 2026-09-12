"""Delete only this hackathon's container app after the explicit user deadline."""
import datetime as dt
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request

if dt.datetime.now(dt.timezone.utc) < dt.datetime(2026,9,12,17,tzinfo=dt.timezone.utc):
    raise SystemExit('Not yet the authorized shutdown time')
account = os.environ['CLOUDFLARE_ACCOUNT_ID']
name = 'nxtcommit-delivery-nxtcommitcontainer'
base = 'https://api.cloudflare.com/client/v4/accounts/'+account+'/containers/applications'
def call(url, method='GET'):
    request = urllib.request.Request(url, method=method, headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN']})
    with urllib.request.urlopen(request, timeout=60) as r:
        data = r.read()
        value = json.loads(data) if data else {}
    if isinstance(value, dict) and value.get('success') is False:
        raise RuntimeError('Cloudflare rejected shutdown')
    return value.get('result', value) if isinstance(value, dict) else value

def matching():
    apps = call(base+'?name='+urllib.parse.quote(name))
    if not isinstance(apps, list): raise RuntimeError('Unexpected application listing; refusing deletion')
    return [app for app in apps if app.get('name') == name]
removed=[]
for app in matching():
    call(base+'/'+urllib.parse.quote(app['id'], safe=''), 'DELETE');removed.append(app['id'])
remaining = matching()
result={'shutdownAt':dt.datetime.now(dt.timezone.utc).isoformat(),'application':name,'deletedIds':removed,'remaining':len(remaining)}
Path('artifacts').mkdir(exist_ok=True);Path('artifacts/shutdown.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
if remaining:raise SystemExit('Container application still exists')
