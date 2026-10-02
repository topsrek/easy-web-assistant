import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function captureVisual(page: Page, name: string) {
  const directory = resolve('.cache/qa-visual');
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: resolve(directory, `${name}.png`) });
}

async function finishProfile(page: Page, capturePrefix?: string) {
  await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
  if (capturePrefix) await captureVisual(page, `${capturePrefix}-setup`);
  await page.getByLabel('Full name').fill('Jordan Example');
  await page.getByLabel('Email address').fill('jordan@example.test');
  await page.getByLabel('Phone number').fill('555-0101');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Street address').fill('10 Demo Street');
  await page.getByLabel('City').fill('Seattle');
  await page.getByLabel('Postal code').fill('98101');
  await page.getByLabel('Country').fill('United States');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Frequent departure station or stop (optional)').fill('Seattle King Street');
  await page.getByLabel('Accessibility needs').fill('Step-free access');
  await page.getByLabel('Appointment preferences').fill('Morning if available');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('button', { name: 'Your details' })).toBeVisible();
  if (capturePrefix) await captureVisual(page, `${capturePrefix}-complete`);
}

async function search(page: Page, prompt: string, title: string) {
  const composer = page.getByLabel('Describe what you need');
  await composer.fill(prompt);
  await composer.press('Enter');
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Test environment', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.browser-screenshot')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  const sourceUrl = await page.getByRole('link', { name: 'View original offer' }).first().getAttribute('href');
  expect(sourceUrl).toMatch(/^http:\/\/127\.0\.0\.1:/);
  expect(new URL(sourceUrl!).searchParams.has('session')).toBe(true);
  expect((await page.request.get(sourceUrl!)).status()).toBe(200);
}

async function selectAndCheckDisclosure(page: Page, selectName: string, expectedDisclosure: string) {
  await page.getByRole('button', { name: selectName }).first().click();
  await expect(page.getByRole('heading', { name: 'Check before you confirm' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Information that will be sent' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What this action means' })).toBeVisible();
  await expect(page.getByText('Jordan Example')).toBeVisible();
  await expect(page.getByText(expectedDisclosure, { exact: false }).first()).toBeVisible();
}

test.describe('PRD10 vertical acceptance', () => {
  test('voice transcript dispatches once by turn ID with a minimal profile and never maps yes to confirmation', async ({ page }) => {
    const sent: Array<Record<string, unknown>> = [];
    let emitServer: (event: Record<string, unknown>) => void = () => { throw new Error('mock socket is not ready'); };
    await page.routeWebSocket('/ws', (socket) => {
      socket.onMessage((message) => { sent.push(JSON.parse(message.toString()) as Record<string, unknown>); });
      emitServer = (event) => socket.send(JSON.stringify(event));
      socket.send(JSON.stringify({ type: 'ready', mode: 'demo', voiceAvailable: true }));
    });
    await page.goto('/');
    await finishProfile(page);

    emitServer({ type: 'voice', state: 'interrupted' });
    await expect(page.getByText('Assistant audio was interrupted. The microphone is still on.')).toBeVisible();
    emitServer({ type: 'transcript', role: 'user', text: 'Find a sample train journey.', final: true });
    await expect(page.getByText('This voice turn could not be submitted because its turn ID was missing.')).toBeVisible();
    emitServer({ type: 'transcript', id: 'partial', role: 'user', text: 'Find an appointment at a demo clinic.', final: false });
    emitServer({ type: 'transcript', id: 'affirmative', role: 'user', text: 'Yes', final: true });
    emitServer({ type: 'transcript', id: 'voice-1', role: 'user', text: 'Find a sample train journey.', final: true });
    await expect.poll(() => sent.filter((message) => message.type === 'task').length).toBe(1);
    emitServer({ type: 'transcript', id: 'voice-1', role: 'user', text: 'Find a sample train journey.', final: true });
    await expect(page.getByText('Find a sample train journey.', { exact: true })).toHaveCount(1);
    expect(sent.filter((message) => message.type === 'task')).toHaveLength(1);
    expect(sent.some((message) => message.type === 'confirm')).toBe(false);
    const firstTask = sent.find((message) => message.type === 'task')!;
    expect(firstTask.text).toBe('Find a sample train journey.');
    expect(firstTask.profile).toMatchObject({ fullName: 'Jordan Example', email: 'jordan@example.test', accessNeeds: 'Step-free access' });
    expect(firstTask.profile).toMatchObject({ phone: '', street: '', city: '', postalCode: '', country: '' });

    emitServer({ type: 'result', id: 'mock-result-1', state: 'confirmed', outcome: 'booking_confirmed', text: 'Test receipt confirmed.', demo: true });
    await expect(page.getByText('Test receipt confirmed.')).toBeVisible();
    emitServer({ type: 'transcript', id: 'voice-2', role: 'user', text: 'Find a sample train journey.', final: true });
    await expect.poll(() => sent.filter((message) => message.type === 'task').length).toBe(2);
    expect(sent.filter((message) => message.type === 'task')[1].text).toBe(firstTask.text);
    expect(sent.filter((message) => message.type === 'confirm')).toHaveLength(0);
  });

  test('event search keeps unknown fees visible, images accessible, and requires explicit approval', async ({ page }) => {
    await page.goto('/');
    await finishProfile(page);
    await search(page, 'Find a jazz concert at the Demo Arts Hall.', 'An evening of jazz');
    await expect(page.getByText('Booking fees are not confirmed')).toBeVisible();
    await expect.poll(() => page.locator('.offer-thumbnails img').evaluateAll((images) => images.length === 2 && images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await captureVisual(page, 'desktop-event-gallery');
    const browserUrl = await page.locator('.browser-meta a').getAttribute('href');
    expect(browserUrl).toBeTruthy();
    const fixture = new URL(browserUrl!);
    const directPost = await page.request.post(new URL('/fixture/book', fixture).toString(), {
      data: { session: fixture.searchParams.get('session'), offerId: 'event-jazz', capability: 'forged', inputs: { 'Full name': 'Jordan Example' } },
    });
    expect(directPost.status()).toBe(403);
    const firstImage = page.getByRole('button', { name: /Enlarge image 1 of 2/ }).first();
    await expect(firstImage).toBeVisible();
    await firstImage.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Next image' }).click();
    await page.getByRole('button', { name: 'Close image' }).click();
    await expect(firstImage).toBeFocused();
    await selectAndCheckDisclosure(page, 'Choose these tickets', 'Booking fees are not confirmed');
    await captureVisual(page, 'desktop-event-approval');
    const confirm = page.getByRole('button', { name: 'Confirm test booking' });
    await expect(confirm).toBeDisabled();
    await page.getByLabel('I have reviewed the details above.').check();
    await confirm.click();
    await expect(page.getByText('CONFIRMED')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('no real payment', { exact: false }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm test booking' })).toHaveCount(0);
  });

  test('journey search keeps terms and only prepares until approval', async ({ page }) => {
    await page.goto('/');
    await finishProfile(page);
    await search(page, 'Show me a sample train journey.', 'A simple journey to the city');
    await expect(page.getByText('Example Town → City Central')).toBeVisible();
    await selectAndCheckDisclosure(page, 'Choose this journey', '$24 return · 1 adult');
    await expect(page.getByText('Check before you confirm')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm test booking' })).toBeDisabled();
    await page.getByRole('button', { name: 'New task' }).click();
    await expect(page.getByRole('button', { name: 'Confirm test booking' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'What can I help you with?' })).toBeVisible();
  });

  test('editing profile after selection invalidates the prepared approval', async ({ page }) => {
    await page.goto('/');
    await finishProfile(page);
    await search(page, 'Find an event ticket for a jazz concert at the Demo Arts Hall.', 'An evening of jazz');
    await page.getByRole('button', { name: 'Choose these tickets' }).first().click();
    await expect(page.getByRole('heading', { name: 'Check before you confirm' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Your details' }).click();
    await page.getByLabel('Email address').fill('updated@example.test');
    await page.getByRole('button', { name: 'Your preferences' }).click();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByRole('button', { name: 'Your details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm test booking' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Choose these tickets' }).first()).toBeDisabled();
  });

  test('appointment search marks unknown cost and never offers a blind retry after confirmation', async ({ page }) => {
    await page.goto('/');
    await finishProfile(page);
    await search(page, 'Find a routine checkup appointment.', 'Your routine checkup');
    await expect(page.getByText('Visit cost not confirmed').first()).toBeVisible();
    await expect(page.getByText('Insurance coverage and visit cost are not confirmed').first()).toBeVisible();
    await selectAndCheckDisclosure(page, 'Choose this time', 'The provider has not confirmed a price.');
    await page.getByLabel('I have reviewed the details above.').check();
    await page.getByRole('button', { name: 'Confirm test booking' }).click();
    await expect(page.getByText('CONFIRMED')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Confirm test booking' })).toHaveCount(0);
  });

  test('government request discloses unknown requirements and confirms receipt only', async ({ page }) => {
    await page.goto('/');
    await finishProfile(page);
    await search(page, 'Find a test civic office appointment to ask about a residence certificate.', 'Residence certificate appointment request');
    await expect(page.getByText('Required documents', { exact: true })).toBeVisible();
    await expect(page.getByText('Unknown; no legal requirements are asserted')).toBeVisible();
    await expect(page.getByText('Any administrative fee is unknown')).toBeVisible();
    await selectAndCheckDisclosure(page, 'Review this appointment request', 'not a real government appointment');
    await expect(page.getByText('Submit test appointment request', { exact: false })).toBeVisible();
    await page.getByLabel('I have reviewed the details above.').check();
    await page.getByRole('button', { name: /Submit test appointment request/i }).click();
    const receipt = page.locator('.result-card');
    await expect(receipt).toContainText(/request/i);
    await expect(receipt).not.toContainText(/real appointment confirmed|appointment was booked/i);
  });

  test('an unmatched journey constraint is reported instead of silently relaxed', async ({ page }) => {
    await page.goto('/');
    await finishProfile(page);
    const prompt = 'Find a train from Atlantis to Seattle tomorrow morning.';
    const composer = page.getByLabel('Describe what you need');
    await composer.fill(prompt);
    await composer.press('Enter');
    await expect(page.getByText(/could not verify a matching option/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/requested conditions have not been relaxed/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A simple journey to the city' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Choose this journey/ })).toHaveCount(0);
  });

  test('service request keeps the estimate unknown and confirms receipt without hiring', async ({ page }) => {
    await page.goto('/');
    await finishProfile(page);
    await search(page, 'Request a fictional home repair assessment.', 'Home repair assessment request');
    await expect(page.getByText('Labour, call-out, travel, materials and total are unknown')).toBeVisible();
    await expect(page.getByText('A request does not accept a quote or hire a contractor.')).toBeVisible();
    await selectAndCheckDisclosure(page, 'Review this service request', 'no contractor is engaged');
    await page.getByText('Submit test service request', { exact: false }).first().waitFor();
    await page.getByLabel('I have reviewed the details above.').check();
    await page.getByRole('button', { name: /Submit test service request/i }).click();
    const receipt = page.locator('.result-card');
    await expect(receipt).toContainText(/request/i);
    await expect(receipt).not.toContainText(/contractor engaged|repair booked/i);
  });

  test('leisure enrollment request preserves material fees and does not confirm participation', async ({ page }) => {
    await page.goto('/');
    await finishProfile(page);
    await search(page, 'Find a beginner pottery course at a community centre.', 'Six-week pottery course');
    await expect(page.getByText('Clay and materials fees are unknown')).toBeVisible();
    await expect(page.getByText('The $54 course fee is not a complete total.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Enlarge image 1 of 1/ })).toBeVisible();
    await expect.poll(() => page.locator('.offer-thumbnails img').evaluateAll((images) => images.length === 1 && (images[0] as HTMLImageElement).complete && (images[0] as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await selectAndCheckDisclosure(page, 'Review this enrollment request', 'participation is not confirmed');
    await page.getByText('Submit test enrollment request', { exact: false }).first().waitFor();
    await page.getByLabel('I have reviewed the details above.').check();
    await page.getByRole('button', { name: /Submit test enrollment request/i }).click();
    const receipt = page.locator('.result-card');
    await expect(receipt).toContainText(/request/i);
    await expect(receipt).not.toContainText(/enrollment confirmed|participation confirmed/i);
  });

  test('profile survives reload, supports edit and delete, and offers session-only use when storage fails', async ({ page, context }) => {
    await page.goto('/');
    await finishProfile(page, 'desktop-profile');
    await page.reload();
    await page.getByRole('button', { name: 'Your details' }).click();
    await expect(page.getByLabel('Full name')).toHaveValue('Jordan Example');
    await captureVisual(page, 'desktop-profile-reloaded-editor');
    await page.getByLabel('Full name').fill('Jordan Revised');
    await page.getByRole('button', { name: 'Your preferences' }).click();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByRole('button', { name: 'Your details' })).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete saved details' }).click();
    await expect(page.getByRole('button', { name: 'Delete saved details' })).toHaveCount(0);

    await context.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'easy-web-assistant.profile') throw new DOMException('Storage disabled', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await page.reload();
    await page.getByLabel('Full name').fill('Session Only');
    await page.getByLabel('Email address').fill('session@example.test');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Your profile could not be saved to this browser. Your changes are only available for this session.')).toBeVisible();
    await captureVisual(page, 'desktop-profile-storage-fallback');
    await page.getByRole('button', { name: 'Use these details for this session only' }).click();
    await expect(page.getByRole('heading', { name: 'Set up your profile' })).toHaveCount(0);
  });

  test('mobile chat and website toggle share the screenshot, with keyboard access at 200% zoom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await finishProfile(page, 'mobile-profile');
    await search(page, 'Find a jazz concert at the Demo Arts Hall.', 'An evening of jazz');
    await page.getByRole('button', { name: 'Website', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Website session' })).toBeVisible();
    await captureVisual(page, 'mobile-website-view');
    const screenshotSrc = await page.locator('.browser-screenshot').getAttribute('src');
    await page.getByRole('button', { name: 'Chat', exact: true }).click();
    await expect(page.getByLabel('Describe what you need')).toBeVisible();
    await expect(page.locator('.browser-screenshot')).toHaveAttribute('src', screenshotSrc!);
    await expect(page.getByText('Microphone and Stop are separate controls. Voice never confirms an action.')).toBeVisible();
    const mobileControlsFit = await page.locator('.topbar-actions button, .composer button').evaluateAll((buttons) => {
      const visible = buttons.filter((button) => button.getClientRects().length > 0);
      return visible.length >= 3 && visible.every((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44;
      });
    });
    expect(mobileControlsFit).toBe(true);
    const chooseTickets = page.getByRole('button', { name: 'Choose these tickets' }).first();
    await chooseTickets.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Check before you confirm' })).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
    await captureVisual(page, 'mobile-approval-200-zoom');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Your details' })).toBeAttached();
  });
});
