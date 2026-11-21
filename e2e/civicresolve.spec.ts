import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('end-to-end citizen report, AI triage, admin resolution, and WCAG 2.2 AA check', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Turn neighborhood friction');

  const accessibilityScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(accessibilityScan.violations).toEqual([]);

  await page.getByRole('tab', { name: 'Report Issue' }).click();
  await page.getByLabel('Issue Title').fill('Severe waterlogging blocking Peelamedu road');
  await page.getByLabel('Location / Landmark').fill('Peelamedu Bus Stop, Coimbatore');
  await page
    .getByLabel('Detailed Description')
    .fill('Blocked storm drain is causing knee-deep flooding across both lanes.');
  await page.getByRole('button', { name: 'Preview AI Triage' }).click();
  await expect(page.getByText(/Water Supply & Drainage Board/i)).toBeVisible();

  await page.getByRole('button', { name: 'Submit Grievance' }).click();
  await expect(page.getByRole('status')).toContainText('CR-2026-');

  await page.getByRole('tab', { name: 'Admin Command' }).click();
  await page.getByLabel('Administrator Passcode').fill('civic-admin-2026');
  await page.getByRole('button', { name: 'Sign In to Admin Dashboard' }).click();
  await expect(page.getByText(/Administrator Triage & Resolution Queue/i)).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
