import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173/easy-web-assistant/';
const origin = new URL(baseUrl).origin;
const diagnosticsDir = 'artifacts/pages-smoke';
const browserRequests = [];
const consoleErrors = [];
const pageErrors = [];
let preview;
let browser;
let page;

const cases = [
  { kind: 'event', prompt: 'Find a test concert', title: 'An evening of jazz', select: 'Review this test booking', expected: 'SIMULATED BOOKING' },
  { kind: 'journey', prompt: 'Find a test train journey', title: 'A simple trip to the city', select: 'Review this test journey', expected: 'SIMULATED BOOKING' },
  { kind: 'appointment', prompt: 'Find a test doctor appointment', title: 'A routine checkup', select: 'Review this test appointment', expected: 'SIMULATED BOOKING' },
  { kind: 'government', prompt: 'Find a test civic office appointment', title: 'Residence certificate appointment request', select: 'Review this test request', expected: 'SIMULATED REQUEST RECEIPT' },
  { kind: 'service', prompt: 'Request a test repair service', title: 'Home repair assessment request', select: 'Review this test request', expected: 'SIMULATED REQUEST RECEIPT' },
  { kind: 'leisure', prompt: 'Find a test community course', title: 'Six-week pottery course', select: 'Review this test enrollment request', expected: 'SIMULATED REQUEST RECEIPT' },
];

function recordRequest(url, type, status = null, error = null) {
  browserRequests.push({ url, type, status, error });
}

async function waitForPreview() {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`Preview returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError ?? new Error('Preview did not start.');
}

async function startTask(testCase) {
  const userMessages = page.locator('.message-row--user').filter({ hasText: testCase.prompt });
  const previousEchoes = await userMessages.count();
  const previousCards = await page.locator('.a2ui-card').count();
  const composer = page.getByLabel('Describe what you need');
  await composer.fill(testCase.prompt);
  await composer.press('Enter');
  await page.waitForFunction((count) => document.querySelectorAll('.a2ui-card').length > count, previousCards, { timeout: 10_000 });
  const offerSurface = page.locator('.a2ui-card').last();
  await offerSurface.locator(`.offer-card--${testCase.kind}`).waitFor({ state: 'visible', timeout: 5_000 });
  assert.equal(await offerSurface.getByRole('heading', { name: testCase.title, exact: true }).count(), 1, `Unexpected latest A2UI card for ${testCase.kind}`);
  assert.equal(await userMessages.count(), previousEchoes + 1, `Expected one user echo for ${testCase.prompt}`);
  const previousApprovals = await page.locator('.approval-review').count();
  await offerSurface.locator(`.offer-card--${testCase.kind} .offer-select-button:enabled`).click();
  await page.waitForFunction((count) => document.querySelectorAll('.approval-review').length > count, previousApprovals, { timeout: 5_000 });
  const approval = page.locator('.approval-review').last();
  await approval.getByRole('heading', { name: 'Check before you confirm', exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  await approval.getByLabel('I have reviewed the details above.').check();
  const previousResults = await page.locator('.result-card').count();
  const confirm = approval.getByRole('button', { name: /^Simulate test/ });
  assert.equal(await confirm.isEnabled(), true, `The current approval action is disabled for ${testCase.kind}`);
  await confirm.click();
  await page.waitForFunction((count) => document.querySelectorAll('.result-card').length > count, previousResults, { timeout: 5_000 });
  const result = page.locator('.result-card').last();
  await result.waitFor({ state: 'visible', timeout: 5_000 });
  assert.ok((await result.innerText()).includes(testCase.expected), `Expected ${testCase.expected} for ${testCase.kind}`);
  assert.ok((await result.innerText()).includes('No real'), `Expected simulated-only result copy for ${testCase.kind}`);
  await page.getByRole('button', { name: 'New task' }).click();
  await page.getByRole('heading', { name: 'What can I help you with?', exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
}

try {
  preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--base', '/easy-web-assistant/', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let previewOutput = '';
  preview.stdout.on('data', (chunk) => { previewOutput += chunk.toString(); });
  preview.stderr.on('data', (chunk) => { previewOutput += chunk.toString(); });
  preview.on('exit', (code) => {
    if (code !== null && code !== 0) consoleErrors.push(`vite preview exited ${code}: ${previewOutput}`);
  });
  await waitForPreview();

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const profile = {
      fullName: 'Jordan Example', email: 'jordan@example.test', phone: '555-0101',
      street: '10 Demo Street', city: 'Example City', postalCode: '00000', country: 'United States',
      deliveryAddress: '', billingAddress: '', homeStation: 'Example Central',
      accessNeeds: 'Step-free access', appointmentPreference: 'Morning if available',
    };
    localStorage.setItem('easy-web-assistant.profile', JSON.stringify({ version: 1, completed: true, profile }));

    // Keep the fixture task pending long enough to deterministically press Stop.
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (handler, timeout, ...args) => originalSetTimeout(handler, timeout === 40 ? 1200 : timeout, ...args);
  });
  page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) recordRequest(request.url(), request.resourceType(), null, 'external request');
    if (/(?:^|\/)(?:ws|api)(?:\/|$)/i.test(url.pathname) || /googleapis|generativelanguage|vertex|model/i.test(url.hostname + url.pathname)) {
      recordRequest(request.url(), request.resourceType(), null, 'forbidden server or model request');
    }
  });
  page.on('requestfailed', (request) => recordRequest(request.url(), request.resourceType(), null, request.failure()?.errorText ?? 'request failed'));
  page.on('response', (response) => {
    const request = response.request();
    if (['document', 'script', 'stylesheet', 'image'].includes(request.resourceType())) {
      const contentType = (response.headers()['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase();
      const expectedType = {
        document: 'text/html',
        script: /(?:java|ecma)script/,
        stylesheet: 'text/css',
        image: 'image/svg+xml',
      }[request.resourceType()];
      const typeMatches = expectedType instanceof RegExp
        ? expectedType.test(contentType)
        : contentType === expectedType;
      recordRequest(request.url(), request.resourceType(), response.status(), typeMatches ? null : `unexpected content type: ${contentType || '(missing)'}`);
    }
  });
  page.on('websocket', (socket) => recordRequest(socket.url, 'websocket', null, 'websocket connection attempted'));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      recordRequest(route.request().url(), route.request().resourceType(), null, 'external request blocked');
      await route.abort();
      return;
    }
    await route.continue();
  });

  const response = await page.goto(baseUrl, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, 'Pages subpath returned a non-200 response');
  assert.equal(new URL(page.url()).pathname, '/easy-web-assistant/', 'The demo did not remain under its Pages subpath');
  await page.getByRole('heading', { name: 'What can I help you with?', exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('note').filter({ hasText: 'Browser demo · fictional data · no real actions' }).waitFor({ state: 'visible' });
  assert.equal(await page.getByRole('button', { name: 'Voice unavailable in browser demo' }).isDisabled(), true, 'The demo unexpectedly enables voice');
  assert.ok(await page.locator('script[src^="/easy-web-assistant/assets/"]').count(), 'JavaScript bundle did not load from the Pages subpath');
  assert.ok(await page.locator('link[rel="stylesheet"][href^="/easy-web-assistant/assets/"]').count(), 'Stylesheet did not load from the Pages subpath');

  const stopCase = { prompt: 'Find a test train journey', title: 'A simple trip to the city' };
  const composer = page.getByLabel('Describe what you need');
  await composer.fill(stopCase.prompt);
  await composer.press('Enter');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByText('The browser demo task was stopped.', { exact: true }).waitFor({ state: 'visible', timeout: 3_000 });
  await delay(1300);
  assert.equal(await page.getByRole('heading', { name: stopCase.title, exact: true }).count(), 0, 'A stopped task rendered stale cards');
  await page.getByRole('button', { name: 'New task' }).click();
  await page.getByRole('heading', { name: 'What can I help you with?', exact: true }).waitFor({ state: 'visible', timeout: 5_000 });

  for (const testCase of cases) await startTask(testCase);

  const resetCase = cases[1];
  const previousResetCards = await page.locator('.a2ui-card').count();
  const resetComposer = page.getByLabel('Describe what you need');
  await resetComposer.fill(resetCase.prompt);
  await resetComposer.press('Enter');
  await page.waitForFunction((count) => document.querySelectorAll('.a2ui-card').length > count, previousResetCards, { timeout: 10_000 });
  const resetSurface = page.locator('.a2ui-card').last();
  await resetSurface.getByRole('heading', { name: resetCase.title, exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  const previousResetApprovals = await page.locator('.approval-review').count();
  await resetSurface.locator(`.offer-card--${resetCase.kind} .offer-select-button:enabled`).click();
  await page.waitForFunction((count) => document.querySelectorAll('.approval-review').length > count, previousResetApprovals, { timeout: 5_000 });
  const preparedApproval = page.locator('.approval-review').last();
  await preparedApproval.getByRole('heading', { name: 'Check before you confirm', exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  const resultsBeforeReset = await page.locator('.result-card').count();
  await page.getByRole('button', { name: 'New task' }).click();
  await page.getByRole('heading', { name: 'What can I help you with?', exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  const staleApproval = preparedApproval;
  assert.equal(await staleApproval.locator('input[type="checkbox"]').isDisabled(), true, 'Reset left a stale approval checkbox active');
  assert.equal(await staleApproval.getByRole('button', { name: /^Simulate test/ }).isDisabled(), true, 'Reset left a stale approval action active');
  assert.equal(await page.locator('.result-card').count(), resultsBeforeReset, 'Reset allowed an unconfirmed stale approval to create a result');

  const badRequests = browserRequests.filter((item) => item.error || (item.status !== null && item.status >= 400));
  assert.deepEqual(badRequests, [], `Unexpected network request or failed asset: ${JSON.stringify(badRequests)}`);
  assert.deepEqual(pageErrors, [], `Browser page errors: ${pageErrors.join('\n')}`);
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join('\n')}`);
  assert.ok(browserRequests.some((item) => item.type === 'image' && item.status === 200), 'No SVG fixture image returned HTTP 200');
  console.log('Pages browser smoke passed: subpath, static assets, user echo, A2UI, approval, six result kinds, Stop, and Reset.');
} catch (error) {
  await mkdir(diagnosticsDir, { recursive: true });
  if (page) {
    try { await page.screenshot({ path: `${diagnosticsDir}/failure.png`, fullPage: true }); } catch { /* Preserve logs if screenshot capture fails. */ }
  }
  await writeFile(`${diagnosticsDir}/browser-requests.json`, JSON.stringify(browserRequests, null, 2));
  await writeFile(`${diagnosticsDir}/browser-errors.json`, JSON.stringify({ consoleErrors, pageErrors }, null, 2));
  await writeFile(`${diagnosticsDir}/error.txt`, error instanceof Error ? error.stack ?? error.message : String(error));
  throw error;
} finally {
  await browser?.close().catch(() => {});
  if (preview && preview.exitCode === null) preview.kill('SIGTERM');
}
