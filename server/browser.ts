import { chromium, type Browser, type Page } from 'playwright';
import { offerSchema, type Offer, type TaskKind } from '../shared/schema.js';
import type { ApprovalBinding } from './approval.js';

const fixtureKinds = new Set<TaskKind>(['event', 'journey', 'appointment', 'government', 'service', 'leisure']);
const imageNames = new Set(['jazz-poster.svg', 'venue-plan.svg', 'pottery-course.svg']);
function isFixtureAction(action: string): action is 'test_booking' | 'test_appointment_request' | 'test_service_request' | 'test_enrollment_request' {
  return ['test_booking', 'test_appointment_request', 'test_service_request', 'test_enrollment_request'].includes(action);
}

/** A session browser confined to its own local controlled-test fixture. */
export class BrowserSession {
  private browser?: Browser;
  page?: Page;
  private readonly originUrl: URL;

  constructor(private origin: string, private sessionIdValue: string) {
    this.originUrl = new URL(origin);
    if (this.originUrl.protocol !== 'http:' || this.originUrl.hostname !== '127.0.0.1' ||
        this.originUrl.origin !== origin || !this.originUrl.port) {
      throw new Error('The browser must use the exact local fixture origin.');
    }
  }

  get fixtureOrigin() { return this.origin; }
  get sessionId() { return this.sessionIdValue; }
  ownsSession(sessionId: string) { return sessionId === this.sessionIdValue; }

  async start() {
    if (this.page) return this.page;
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
    if (channel !== undefined && channel !== 'msedge') {
      throw new Error('PLAYWRIGHT_BROWSER_CHANNEL supports only the opt-in "msedge" value.');
    }
    this.browser = await chromium.launch(channel === 'msedge'
      ? { headless: true, channel: 'msedge' }
      : { headless: true });
    const context = await this.browser.newContext({ viewport: { width: 1100, height: 820 } });
    this.page = await context.newPage();
    await context.route('**/*', async (route) => {
      const request = route.request();
      if (request.redirectedFrom()) { await route.abort('blockedbyclient'); return; }
      let url: URL;
      try { url = new URL(request.url()); } catch { await route.abort('blockedbyclient'); return; }
      if (url.origin !== this.origin || request.method() !== 'GET' || !this.allowedRead(url)) {
        await route.abort('blockedbyclient'); return;
      }
      await route.continue();
    });
    return this.page;
  }

  async readOffers(kind: TaskKind): Promise<Offer[]> {
    if (!fixtureKinds.has(kind)) throw new Error('Unsupported fixture route.');
    const page = await this.start();
    await page.goto(`${this.origin}/fixture/${kind}?session=${encodeURIComponent(this.sessionIdValue)}`, { waitUntil: 'domcontentloaded' });
    const actual = new URL(page.url());
    if (actual.origin !== this.origin || actual.pathname !== `/fixture/${kind}` || actual.searchParams.get('session') !== this.sessionIdValue) {
      throw new Error('The fixture page changed location unexpectedly.');
    }
    const raw = JSON.parse(await page.locator('#offers').textContent() || '[]');
    return offerSchema.array().parse(raw);
  }

  async snapshot() {
    if (!this.page) return null;
    const image = await this.page.screenshot({ type: 'jpeg', quality: 65 });
    return { image: `data:image/jpeg;base64,${image.toString('base64')}`, url: this.page.url(), updatedAt: new Date().toISOString(), demo: true };
  }

  /** Performs the only fixture mutation, with the broker's private one-use capability. */
  async submitPrepared(binding: ApprovalBinding, capability: string): Promise<{ reference?: string; outcome?: 'booking_confirmed' | 'request_received' }> {
    if (!['test_booking', 'test_appointment_request', 'test_service_request', 'test_enrollment_request'].includes(binding.action) ||
        binding.site !== this.origin || !binding.offerId || !capability) {
      throw new Error('The approved fixture action is no longer current.');
    }
    const endpoint = new URL('/fixture/book', this.origin);
    const response = await fetch(endpoint, {
      method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: this.sessionIdValue, offerId: binding.offerId, action: binding.action, capability, inputs: binding.inputs }),
    });
    if (response.status >= 300 && response.status < 400) throw new Error('The fixture attempted an unexpected redirect.');
    if (response.status !== 201) throw new Error('The controlled test provider did not accept the approved action.');
    const body: unknown = await response.json();
    const outcome = binding.action === 'test_booking' ? 'booking_confirmed' : 'request_received';
    if (!body || typeof body !== 'object' || (body as { outcome?: unknown }).outcome !== outcome ||
        (body as { action?: unknown }).action !== binding.action || typeof (body as { reference?: unknown }).reference !== 'string') {
      throw new Error('The controlled test provider returned an unverifiable result.');
    }
    const reference = (body as { reference: string }).reference;
    const verified = await this.checkResult(binding, reference, outcome, capability);
    return verified ? { reference, outcome } : {};
  }

  /** Read-only, session-scoped result verification. */
  async checkResult(binding: ApprovalBinding, reference: string, outcome: 'booking_confirmed' | 'request_received' = 'request_received', capability?: string): Promise<boolean> {
    if (!['test_booking', 'test_appointment_request', 'test_service_request', 'test_enrollment_request'].includes(binding.action) ||
        binding.site !== this.origin || !reference || /[/\\]/.test(reference) || !capability) return false;
    const current = await this.checkCurrentResult(binding, capability);
    return current?.reference === reference && current.outcome === outcome;
  }

  /** Read-only lookup used when POST completed without a usable response/reference. */
  async checkCurrentResult(binding: ApprovalBinding, capability: string): Promise<{ reference: string; outcome: 'booking_confirmed' | 'request_received' } | null> {
    if (!isFixtureAction(binding.action) || binding.site !== this.origin || !capability) return null;
    const resultUrl = new URL('/fixture/state', this.origin);
    resultUrl.searchParams.set('session', this.sessionIdValue);
    resultUrl.searchParams.set('offerId', binding.offerId);
    resultUrl.searchParams.set('action', binding.action);
    let response: Response;
    try { response = await fetch(resultUrl, { method: 'GET', redirect: 'manual', headers: { accept: 'application/json', 'x-fixture-operation-token': capability } }); }
    catch { return null; }
    if (response.status !== 200) return null;
    let body: unknown;
    try { body = await response.json(); } catch { return null; }
    const expected = binding.action === 'test_booking' ? 'booking_confirmed' : 'request_received';
    if (!body || typeof body !== 'object' || (body as { outcome?: unknown }).outcome !== expected ||
        (body as { action?: unknown }).action !== binding.action || (body as { offerId?: unknown }).offerId !== binding.offerId ||
        (body as { session?: unknown }).session !== this.sessionIdValue || typeof (body as { reference?: unknown }).reference !== 'string') return null;
    return { reference: (body as { reference: string }).reference, outcome: expected };
  }

  private allowedRead(url: URL) {
    const kind = url.pathname.slice('/fixture/'.length) as TaskKind;
    if (url.pathname === `/fixture/${kind}` && fixtureKinds.has(kind)) {
      return url.searchParams.get('session') === this.sessionIdValue && [...url.searchParams.keys()].every((key) => key === 'session');
    }
    return url.pathname.startsWith('/fixture/images/') && imageNames.has(url.pathname.slice('/fixture/images/'.length)) && !url.search;
  }

  async close() { await this.browser?.close(); this.page = undefined; this.browser = undefined; }
}
