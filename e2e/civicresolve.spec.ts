import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectAccessible(page: Page): Promise<void> {
  const scan = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(scan.violations).toEqual([]);
}

let problems: string[] = [];

test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('verified resolution');
});

// Any console error or CSP violation fails the test.
test.afterEach(() => {
  expect(problems.filter((text) => !text.includes('status of 400'))).toEqual([]);
});

test('landing and tracker meet WCAG 2.2 AA under the production CSP', async ({ page }) => {
  await expectAccessible(page);
  await page.getByRole('tab', { name: 'Track Issues' }).click();
  await expect(page.getByRole('heading', { name: 'Progress toward resolution' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Switch to Accessible Table' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expectAccessible(page);
});

test('citizen reports an issue, AI triages it, and an admin resolves it', async ({ page }) => {
  await page.getByRole('tab', { name: 'Report Issue' }).click();
  await page.getByLabel('Issue Title').fill('Severe waterlogging blocking Peelamedu road');
  await page.getByLabel('Location / Landmark').fill('Peelamedu Bus Stop, Coimbatore');
  await page
    .getByLabel('Detailed Description')
    .fill('Blocked storm drain is causing knee-deep flooding across both lanes.');
  await page.getByRole('button', { name: 'Preview AI Triage' }).click();
  const inspector = page.getByRole('complementary');
  await expect(inspector).toContainText('Recommended Department: Water Supply & Drainage Board');
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Submit Grievance' }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('CR-2026-');
  const id = /CR-2026-\d+/.exec((await status.textContent()) ?? '')?.[0] ?? '';

  await page.getByRole('tab', { name: 'Track Issues' }).click();
  await page.getByLabel('Search ID, title, or location').fill(id);
  await expect(page.getByRole('heading', { name: /Severe waterlogging/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Admin Command' }).click();
  await page.getByLabel('Administrator Passcode').fill('civic-admin-2026');
  await page.getByRole('button', { name: 'Sign In to Admin Dashboard' }).click();
  await expect(page.getByText(/Administrator Triage & Resolution Queue/i)).toBeVisible();
  await expectAccessible(page);

  await page.locator(`#status-${id}`).selectOption('resolved');
  await page.locator(`#note-${id}`).fill('Drain cleared by the drainage crew.');
  await page
    .locator('form', { has: page.locator(`#note-${id}`) })
    .getByRole('button')
    .click();
  await expect(page.getByText(`Updated ${id} to resolved.`)).toBeVisible();
});

test('shows an accessible error when a report is incomplete', async ({ page }) => {
  await page.getByRole('tab', { name: 'Report Issue' }).click();
  await page.getByRole('button', { name: 'Submit Grievance' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Title must be at least 5 characters.');
  await expect(alert).toBeFocused();
});

test('tabs are keyboard operable', async ({ page }) => {
  await page.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Report Issue' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Admin Command' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
