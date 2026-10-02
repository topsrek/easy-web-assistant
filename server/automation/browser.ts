import { randomUUID } from 'node:crypto';
import { chromium, type Browser, type Page } from 'playwright';
import { permittedUrl, requireDocument } from './policy.js';
import type { WebsiteObservation, WebsitePolicy, WebsiteReader } from './types.js';

/** Ephemeral public-page reader. There is no click, fill, evaluate-code or submission API. */
export class PublicWebsiteBrowser implements WebsiteReader {
  private browser?: Browser;
  private page?: Page;
  private closed = false;
  constructor(readonly policy: WebsitePolicy) {}

  private async start() {
    if (this.closed) throw new Error('Website reading was stopped.');
    if (this.page) return this.page;
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
    if (channel !== undefined && channel !== 'msedge') throw new Error('Only the opt-in msedge browser channel is supported.');
    const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    this.browser = browser;
    if (this.closed) { await browser.close(); throw new Error('Website reading was stopped.'); }
    const context = await browser.newContext({ viewport: { width: 1100, height: 820 }, serviceWorkers: 'block', acceptDownloads: false });
    await context.route('**/*', async (route) => {
      const request = route.request();
      const allowed = request.method() === 'GET' && (request.isNavigationRequest()
        ? request.frame() === this.page?.mainFrame() && permittedUrl(request.url(), this.policy)
        : ['image', 'stylesheet', 'font', 'script'].includes(request.resourceType()) && permittedUrl(request.url(), this.policy, false));
      if (!allowed) return route.abort('blockedbyclient');
      // Inspect redirects separately instead of allowing Playwright to follow them outside the policy.
      try {
        const response = await route.fetch({ maxRedirects: 0, timeout: 15000 });
        if (response.status() >= 300 && response.status() < 400) {
          const location = response.headers().location;
          const target = location ? new URL(location, request.url()).href : '';
          if (!permittedUrl(target, this.policy, request.isNavigationRequest())) return route.abort('blockedbyclient');
        }
        await route.fulfill({ response });
      } catch { await route.abort('failed').catch(() => undefined); }
    });
    await context.routeWebSocket('**/*', (socket) => socket.close());
    context.on('page', (page) => { if (this.page && page !== this.page) void page.close(); });
    this.page = await context.newPage();
    this.page.setDefaultTimeout(15000);
    this.page.setDefaultNavigationTimeout(20000);
    if (this.closed) { await browser.close(); throw new Error('Website reading was stopped.'); }
    return this.page;
  }

  async observe(url: string): Promise<WebsiteObservation> {
    const target = requireDocument(url, this.policy);
    const page = await this.start();
    const response = await page.goto(target, { waitUntil: 'domcontentloaded' });
    requireDocument(page.url(), this.policy);
    if (!response?.ok() || !response.headers()['content-type']?.includes('text/html')) throw new Error('The public website did not return a readable page.');
    // This fixed app-owned function reads DOM data. The model never supplies executable code.
    const data = await page.evaluate(() => {
      const visible = (node: HTMLElement) => !!(node.getClientRects().length) && getComputedStyle(node).visibility !== 'hidden';
      const main = document.querySelector<HTMLElement>('main, [role="main"]') ?? document.body;
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
        .filter(visible).map((node) => ({ text: node.innerText.trim().replace(/\s+/g, ' ').slice(0, 500), url: node.href })).filter((link) => link.text).slice(0, 300);
      const images = Array.from(main.querySelectorAll<HTMLImageElement>('img')).filter(visible)
        .map((node) => ({ url: node.currentSrc || node.src, alt: node.alt.slice(0, 500) })).slice(0, 100);
      const structuredData = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0, 30)
        .flatMap((node) => { try { const text = node.textContent ?? ''; return text.length <= 200000 ? [JSON.parse(text)] : []; } catch { return []; } });
      const heading = main.querySelector('h1')?.textContent?.trim();
      return { title: (heading || document.title).slice(0, 500), text: main.innerText.slice(0, 30000), links, images, structuredData };
    });
    if (/^(?:access denied|just a moment|verify (?:you|your)|robot check)/i.test(data.title) ||
        /verify you are human|complete the captcha/i.test(data.text)) {
      throw new Error('The website requires human verification. No attempt was made to bypass it.');
    }
    const links = data.links.filter((link) => permittedUrl(link.url, this.policy));
    return { ...data, id: randomUUID(), url: page.url(), observedAt: new Date().toISOString(),
      links: [...new Map(links.map((link) => [link.url, link])).values()].map((link, index) => ({ ...link, id: `link-${index}` })),
      images: data.images.filter((image) => permittedUrl(image.url, this.policy, false)) };
  }

  async snapshot() {
    if (!this.page || this.closed) return null;
    const buffer = await this.page.screenshot({ type: 'jpeg', quality: 65, timeout: 5000 });
    return { image: `data:image/jpeg;base64,${buffer.toString('base64')}`, url: this.page.url(), updatedAt: new Date().toISOString(), demo: false as const };
  }
  async close() { this.closed = true; await this.browser?.close(); this.page = undefined; this.browser = undefined; }
}
