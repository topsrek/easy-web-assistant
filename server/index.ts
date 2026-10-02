import { createServer, type Server } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import { WebSocketServer } from 'ws';
import { config, loadConfig, type AppConfig } from './config.js';
import { AssistantSession } from './session.js';
import { fixtureHtml } from './demo.js';
import { clientMessageSchema, kindSchema } from '../shared/schema.js';

export interface CreateAppServerOptions {
  port?: number;
  host?: string;
  /** Allowed browser UI origin. Defaults to the local Vite development server. */
  origin?: string;
  settings?: AppConfig;
}

interface FixtureResult { offerId: string; reference: string; action: string; outcome: 'booking_confirmed' | 'request_received'; session: string; capabilityHash: string }
interface SessionRecord { session: AssistantSession; results: Map<string, FixtureResult> }

/** Build and listen on a local server. Importing this module has no side effects. */
export async function createAppServer(options: CreateAppServerOptions = {}) {
  const settings = options.settings ?? config;
  const host = options.host ?? settings.host;
  if (host !== '127.0.0.1') throw new Error('The assistant server must bind to 127.0.0.1.');
  const port = options.port ?? settings.port;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 through 65535.');
  const allowedOrigin = options.origin ?? 'http://127.0.0.1:5173';
  let parsedOrigin: URL;
  try { parsedOrigin = new URL(allowedOrigin); } catch { throw new Error('A valid local browser origin is required.'); }
  if (!isLoopbackHost(parsedOrigin.hostname) || !['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== allowedOrigin) {
    throw new Error('The browser origin must use loopback HTTP or HTTPS.');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (!isLoopbackAddress(req.socket.remoteAddress)) return res.status(403).json({ error: 'Local connections only.' });
    const requestOrigin = req.get('origin');
    const addr = httpServer.address();
    const fixtureOrigin = `http://127.0.0.1:${addr && typeof addr !== 'string' ? addr.port : settings.port}`;
    if (requestOrigin && requestOrigin !== allowedOrigin && requestOrigin !== fixtureOrigin) return res.status(403).json({ error: 'Origin not allowed.' });
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ ready: true, mode: settings.demoMode ? 'demo' : 'live' }));
  app.use(express.json({ limit: '8kb', type: 'application/json' }));
  app.use(express.urlencoded({ extended: false, limit: '8kb', parameterLimit: 32 }));
  const httpServer: Server = createServer(app);
  const wsServer = new WebSocketServer({ noServer: true, maxPayload: 128 * 1024, perMessageDeflate: false });
  const sessions = new Map<string, SessionRecord>();
  const browserOriginFor = (address: string) => `http://127.0.0.1:${address}`;

  // Register this fixed endpoint before /fixture/:kind so "state" is not parsed as a kind.
  app.get('/fixture/state', (req, res) => {
    const id = req.query.session;
    const offerId = req.query.offerId;
    const action = req.query.action;
    const operationToken = req.get('x-fixture-operation-token');
    const record = typeof id === 'string' ? sessions.get(id) : undefined;
    if (!record || typeof offerId !== 'string' || typeof action !== 'string' || !operationToken || operationToken.length > 1000) return res.status(404).json({ error: 'Result not found.' });
    const operationHash = createHash('sha256').update(operationToken).digest('hex');
    const result = [...record.results.values()].find((candidate) => candidate.offerId === offerId && candidate.action === action && candidate.session === id && candidate.capabilityHash === operationHash);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    res.json({ state: 'confirmed', reference: result.reference, offerId: result.offerId, outcome: result.outcome, action: result.action, session: result.session });
  });
  app.get('/fixture/:kind', (req, res) => {
    const kindResult = kindSchema.safeParse(req.params.kind);
    const id = req.query.session;
    if (!kindResult.success || typeof id !== 'string') return res.status(404).send('Not found');
    const record = sessions.get(id);
    const offers = record?.session.getFixtureOffers(kindResult.data);
    if (!record || !offers?.length) return res.status(404).send('This test listing is no longer available.');
    const address = httpServer.address();
    const fixturePort = address && typeof address !== 'string' ? address.port : settings.port;
    const localOrigin = browserOriginFor(String(fixturePort));
    res.type('html').setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    res.send(fixtureHtml(kindResult.data, localOrigin, id, offers));
  });

  app.get('/fixture/images/:name', (req, res) => {
    const pictures: Record<string, string> = {
      'jazz-poster.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480"><rect width="720" height="480" fill="#213e39"/><circle cx="570" cy="110" r="72" fill="#e4b56e"/><text x="48" y="190" fill="#fff8e8" font-family="sans-serif" font-size="50">AN EVENING</text><text x="48" y="252" fill="#fff8e8" font-family="sans-serif" font-size="50">OF JAZZ</text><text x="50" y="330" fill="#e7d4ae" font-family="sans-serif" font-size="24">DEMO ARTS HALL · FICTIONAL TEST MATERIAL</text></svg>',
      'venue-plan.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f5f2e9"/><rect x="82" y="60" width="556" height="355" rx="22" fill="#fff" stroke="#426b5d" stroke-width="8"/><rect x="190" y="82" width="340" height="72" fill="#d9b675"/><text x="304" y="128" font-family="sans-serif" font-size="28">STAGE</text><text x="95" y="290" font-family="sans-serif" font-size="24">DEMO SEATING PLAN · FICTIONAL</text><path d="M82 330h50v80H82" fill="#99c5aa"/><text x="88" y="390" font-family="sans-serif" font-size="16">ENTRY</text></svg>',
      'pottery-course.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480"><rect width="720" height="480" fill="#f3e8d7"/><circle cx="360" cy="225" r="140" fill="#cc8e64"/><path d="M260 225h200l-22 118q-78 45-156 0z" fill="#f1c49d" stroke="#794e38" stroke-width="8"/><text x="92" y="72" font-family="sans-serif" font-size="34" fill="#42342b">TEST COMMUNITY CENTRE</text><text x="170" y="420" font-family="sans-serif" font-size="27" fill="#42342b">FICTIONAL POTTERY COURSE</text></svg>',
    };
    const svg = pictures[req.params.name];
    if (!svg) return res.status(404).end();
    res.type('image/svg+xml').setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.send(svg);
  });

  app.post('/fixture/book', (req, res) => {
    const { session: id, sessionId, offerId, capability, inputs, action } = req.body as Record<string, unknown>;
    const effectiveId = typeof sessionId === 'string' ? sessionId : typeof id === 'string' ? id : undefined;
    const record = effectiveId ? sessions.get(effectiveId) : undefined;
    if (!effectiveId || !record || typeof offerId !== 'string' || typeof capability !== 'string' || !isSimpleInputs(inputs)) return res.status(403).send('A current approved test action is required.');
    const offers = (['event', 'journey', 'appointment', 'government', 'service', 'leisure'] as const).flatMap((kind) => record.session.getFixtureOffers(kind));
    const offer = offers.find((candidate) => candidate.id === offerId);
    const expectedAction = offer && (offer.kind === 'government' ? 'test_appointment_request'
      : offer.kind === 'service' ? 'test_service_request' : offer.kind === 'leisure' ? 'test_enrollment_request' : 'test_booking');
    if (!offer || typeof action !== 'string' || action !== expectedAction) return res.status(403).send('This test option or action is no longer current.');
    // The opaque one-use grant is produced only by ToolBroker during its active submission.
    const permitted = record.session.broker.authorizeFixtureSubmission(effectiveId, offerId, inputs, capability, action);
    if (!permitted) return res.status(403).send('A current approved test action is required.');
    const reference = `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
    const outcome = action === 'test_booking' ? 'booking_confirmed' : 'request_received';
    const capabilityHash = createHash('sha256').update(capability).digest('hex');
    record.results.set(reference, { offerId, reference, action, outcome, session: effectiveId, capabilityHash });
    res.status(201).json({ state: 'confirmed', reference, action, outcome });
  });
  app.get('/fixture/result/:reference', (req, res) => {
    const id = req.query.session;
    const record = typeof id === 'string' ? sessions.get(id) : undefined;
    const result = record?.results.get(req.params.reference);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    res.json({ state: 'confirmed', reference: result.reference, offerId: result.offerId, outcome: result.outcome, action: result.action, session: result.session });
  });
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const remote = request.socket.remoteAddress;
    const requestOrigin = request.headers.origin;
    if (url.pathname !== '/ws' || !isLoopbackAddress(remote) || (requestOrigin && requestOrigin !== allowedOrigin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return;
    }
    wsServer.handleUpgrade(request, socket, head, (ws) => wsServer.emit('connection', ws, request));
  });
  wsServer.on('connection', (socket) => {
    // Browser URLs use the bound loopback origin, including ephemeral test ports.
    const address = httpServer.address();
    const localOrigin = `http://127.0.0.1:${address && typeof address !== 'string' ? address.port : settings.port}`;
    const session = new AssistantSession(socket, allowedOrigin, localOrigin, settings);
    const record: SessionRecord = { session, results: new Map() };
    sessions.set(session.id, record);
    void session.start();
    socket.on('message', async (data, isBinary) => {
      const byteLength = Array.isArray(data) ? data.reduce((total, chunk) => total + chunk.byteLength, 0) : data.byteLength;
      if (isBinary || byteLength > 128 * 1024) { socket.close(1009, 'Message too large'); return; }
      const payload = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);
      let parsed: unknown;
      try { parsed = JSON.parse(payload.toString()); } catch { socket.send(JSON.stringify({ type: 'error', message: 'The message must be valid JSON.' })); return; }
      const message = clientMessageSchema.safeParse(parsed);
      if (!message.success) { socket.send(JSON.stringify({ type: 'error', message: 'The message does not match the supported protocol.' })); return; }
      try { await session.handle(message.data); }
      catch { socket.send(JSON.stringify({ type: 'error', message: 'The request could not be completed.' })); }
    });
    socket.on('close', () => { sessions.delete(session.id); void session.close(); });
    socket.on('error', () => { sessions.delete(session.id); void session.close(); });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => { httpServer.off('error', reject); resolve(); });
  });
  const address = httpServer.address();
  const actualPort = address && typeof address !== 'string' ? address.port : port;
  return {
    app, server: httpServer, wsServer, port: actualPort,
    async close() {
      for (const { session } of sessions.values()) await session.close();
      sessions.clear();
      for (const socket of wsServer.clients) socket.terminate();
      await new Promise<void>((resolve) => wsServer.close(() => resolve()));
      await new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
    },
  };
}

function isLoopbackHost(host: string) { return host === '127.0.0.1' || host === 'localhost' || host === '::1'; }
function isLoopbackAddress(address?: string) { return Boolean(address && (address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1')); }
function isSimpleInputs(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 30 && entries.every(([key, item]) => key.length <= 200 && typeof item === 'string' && item.length <= 3000);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const settings = loadConfig();
  void createAppServer({ settings }).then(({ port }) => console.log(`easy-web-assistant ready at http://127.0.0.1:${port}`));
}
