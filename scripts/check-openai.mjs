import {existsSync} from 'node:fs';
import {createOpenAIResponse} from '../server/services/openai.ts';
if (existsSync('.env')) process.loadEnvFile('.env');
try {
 const result = await createOpenAIResponse('Reply with exactly OK.','connection-check-v1');
 console.log(JSON.stringify({ok:true,...result.provenance},null,2));
} catch (error) {
 console.error(JSON.stringify({ok:false,code:error.code ?? 'openai_check_failed',status:error.status}));process.exitCode=1;
}
