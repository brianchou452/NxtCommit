import type { AppOptions } from '../app.js';
import { createApplication } from '../app.js';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';

export async function startTestServer(options: AppOptions = {}) {
  const application = createApplication(options);
  const server = application.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    ...application,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    async stop() {
      const closed = new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      server.closeAllConnections();
      await closed;
      await application.close();
    },
  };
}
