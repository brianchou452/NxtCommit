"""Forward only the explicitly configured Langfuse project secrets to the Worker."""
import json
import os
import subprocess
from urllib.parse import urlparse

names = ('LANGFUSE_PUBLIC_KEY', 'LANGFUSE_SECRET_KEY', 'LANGFUSE_BASE_URL')
values = {name: os.environ.get(name, '').strip() for name in names}
if not any(values.values()):
    print('Langfuse project not configured; no existing Worker secrets changed.')
elif not all(values.values()):
    raise SystemExit('Langfuse configuration is partial; refusing secret sync.')
else:
    url = urlparse(values['LANGFUSE_BASE_URL'])
    if url.scheme != 'https' or url.hostname not in ('cloud.langfuse.com', 'us.cloud.langfuse.com', 'jp.cloud.langfuse.com') or url.path not in ('', '/') or url.query or url.fragment or url.username or url.password or url.port:
        raise SystemExit('Unsupported Langfuse Cloud endpoint.')
    result = subprocess.run(['node_modules/.bin/wrangler', 'secret', 'bulk'], cwd='deploy/cloudflare', input=json.dumps(values), text=True, capture_output=True)
    # Never print secret-bearing input or provider output, including failures.
    if result.returncode:
        raise SystemExit('Langfuse Worker secret sync failed; inspect credential permissions.')
    print('Langfuse project configuration synced to Worker runtime secrets.')
