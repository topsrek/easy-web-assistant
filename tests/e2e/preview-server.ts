import { createAppServer } from '../../server/index.js';
import { loadConfig } from '../../server/config.js';

const origin = process.env.PLAYWRIGHT_PREVIEW_ORIGIN;
if (!origin || !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
  throw new Error('PLAYWRIGHT_PREVIEW_ORIGIN must be an explicit loopback HTTP origin.');
}

const settings = loadConfig({ DEMO_MODE: 'true', PORT: '3001' });
const server = await createAppServer({ host: '127.0.0.1', port: 3001, origin, settings });
console.log(`QA demo backend ready at http://127.0.0.1:${server.port}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { void server.close().finally(() => process.exit(0)); });
}
