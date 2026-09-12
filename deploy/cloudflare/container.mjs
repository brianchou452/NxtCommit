import { Container } from '@cloudflare/containers';
export class NxtCommitContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '2h';
  enableInternet = false;
  interceptHttps = true;
  static outboundByHost = {'api.openai.com': request => fetch(request)};
  allowedHosts = ['api.openai.com'];
  envVars = {
    NODE_EXTRA_CA_CERTS: '/etc/cloudflare/certs/cloudflare-containers-ca.crt',
    ...(this.env.OPENAI_CHECK_TOKEN ? {OPENAI_CHECK_TOKEN: this.env.OPENAI_CHECK_TOKEN} : {}),
    ...(this.env.OPENAI_API_KEY ? {OPENAI_API_KEY: this.env.OPENAI_API_KEY} : {}),
    OPENAI_MODEL: this.env.OPENAI_MODEL || 'gpt-5-mini',
  };
}
export {default} from './gateway.mjs';
export { ContainerProxy } from '@cloudflare/containers';
