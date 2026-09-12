import { Container } from '@cloudflare/containers';
export class NxtCommitContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '2h';
  enableInternet = false;
  interceptHttps = true;
  static outboundByHost = {'api.openai.com': request => fetch(request), 'cloud.langfuse.com': request => fetch(request), 'us.cloud.langfuse.com': request => fetch(request), 'jp.cloud.langfuse.com': request => fetch(request)};
  allowedHosts = ['api.openai.com', 'cloud.langfuse.com', 'us.cloud.langfuse.com', 'jp.cloud.langfuse.com'];
  envVars = {
    NODE_EXTRA_CA_CERTS: '/etc/cloudflare/certs/cloudflare-containers-ca.crt',
    ...(this.env.OPENAI_CHECK_TOKEN ? {OPENAI_CHECK_TOKEN: this.env.OPENAI_CHECK_TOKEN} : {}),
    ...(this.env.OPENAI_API_KEY ? {OPENAI_API_KEY: this.env.OPENAI_API_KEY} : {}),
    OPENAI_MODEL: this.env.OPENAI_MODEL || 'gpt-5-mini',
    ...(this.env.LANGFUSE_PUBLIC_KEY ? {LANGFUSE_PUBLIC_KEY: this.env.LANGFUSE_PUBLIC_KEY} : {}),
    ...(this.env.LANGFUSE_SECRET_KEY ? {LANGFUSE_SECRET_KEY: this.env.LANGFUSE_SECRET_KEY} : {}),
    ...(this.env.LANGFUSE_BASE_URL ? {LANGFUSE_BASE_URL: this.env.LANGFUSE_BASE_URL} : {}),
  };
}
export {default} from './gateway.mjs';
export { ContainerProxy } from '@cloudflare/containers';
