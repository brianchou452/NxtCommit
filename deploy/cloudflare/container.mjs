import { Container } from '@cloudflare/containers';
export class NxtCommitContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '2h';
  enableInternet = false;
  allowedHosts = ['api.openai.com'];
  envVars = {
    ...(this.env.OPENAI_CHECK_TOKEN ? {OPENAI_CHECK_TOKEN: this.env.OPENAI_CHECK_TOKEN} : {}),
    ...(this.env.OPENAI_API_KEY ? {OPENAI_API_KEY: this.env.OPENAI_API_KEY} : {}),
    OPENAI_MODEL: this.env.OPENAI_MODEL || 'gpt-5-mini',
  };
}
export {default} from './gateway.mjs';
export { ContainerProxy } from '@cloudflare/containers';
