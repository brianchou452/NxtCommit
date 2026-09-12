import { evaluateAuthoring } from '../server/authoring/evaluations.js';
import { Assistance } from '../server/authoring/assistance.js';
import { authoringConfiguration } from '../server/authoring/configuration.js';
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--live') || args.length > 1) throw new Error('Usage: node --import tsx scripts/evaluate-authoring.ts [--live]');
const live = args.includes('--live');
const config = live ? authoringConfiguration(process.env) : {};
const result = await evaluateAuthoring({ live, ...(live ? { assistance: new Assistance(config.model) } : {}) });
console.log(JSON.stringify(result, null, 2));
