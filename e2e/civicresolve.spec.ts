import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectAccessible(page: Page): Promise<void> {
  const scan = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(scan.violations).toEqual([]);
}

/** Opens a console section, using the drawer on small screens. */
async function openSection(page: Page, name: string): Promise<void> {
  const menu = page.getByRole('button', { name: 'Menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation', { name: 'Console' }).getByRole('link', { name }).click();
}

let problems: string[] = [];

test.beforeEach(({ page }) => {
  problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
});

// Any console error or CSP violation fails the test.
test.afterEach(() => {
  expect(problems.filter((text) => !text.includes('status of 400'))).toEqual([]);
});

test('landing page meets WCAG 2.2 AA and links into the console', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('See it resolved');
  await expect(page.getByText('Reports filed')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('link', { name: 'Open console' }).click();
  await expect(page.getByRole('heading', { name: 'City resolution overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Progress toward resolution' })).toBeVisible();
  await expectAccessible(page);
});

test('tracker filters and offers an accessible table', async ({ page }) => {
  await page.goto('/#/track');
  await expect(page.getByRole('heading', { name: 'Live issue tracker' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Show as table' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expectAccessible(page);
});

test('citizen reports an issue, Gemini triages it, and an admin resolves it', async ({ page }) => {
  await page.goto('/#/report');
  await page.getByLabel('Issue title').fill('Severe waterlogging blocking Peelamedu road');
  await page.getByLabel('Location or landmark').fill('Peelamedu Bus Stop, Coimbatore');
  await page
    .getByLabel('What is wrong?')
    .fill('Blocked storm drain is causing knee-deep flooding across both lanes.');
  await page.getByRole('button', { name: 'Preview AI triage' }).click();
  const inspector = page.getByRole('complementary', { name: 'Gemini triage' });
  await expect(inspector).toContainText('Recommended Department: Water Supply & Drainage Board');
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Submit report' }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('CR-2026-');
  const id = /CR-2026-\d+/.exec((await status.textContent()) ?? '')?.[0] ?? '';

  await openSection(page, 'Live tracker');
  await page.getByLabel('Search ID, title, or location').fill(id);
  await expect(page.getByRole('heading', { name: /Severe waterlogging/ })).toBeVisible();

  await openSection(page, 'Admin console');
  await page.getByLabel('Administrator passcode').fill('civic-admin-2026');
  await page.getByRole('button', { name: 'Sign in with passcode' }).click();
  await expect(page.getByRole('heading', { name: 'Triage and resolution queue' })).toBeVisible();
  await expectAccessible(page);

  await page.locator(`#status-${id}`).selectOption('resolved');
  await page.locator(`#note-${id}`).fill('Drain cleared by the drainage crew.');
  await page.getByRole('button', { name: `Save update for ${id}` }).click();
  await expect(page.getByText(`Updated ${id} to resolved.`)).toBeVisible();
});

test('incomplete reports get a focused, accessible error', async ({ page }) => {
  await page.goto('/#/report');
  await page.getByRole('button', { name: 'Submit report' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Title must be at least 5 characters.');
  await expect(alert).toBeFocused();
});

test('sidebar navigation announces the current page and keeps focus on main', async ({ page }) => {
  await page.goto('/#/dashboard');
  await expect(page.getByRole('main')).toBeFocused();
  await openSection(page, 'My reports');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My reports');
  await expect(page.getByRole('link', { name: 'My reports' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expectAccessible(page);
});
