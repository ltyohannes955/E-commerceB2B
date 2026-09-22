import { test, expect } from '@playwright/test';
test('public shell and responsive signup are available', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: /Find the next thing your business needs/i,
    }),
  ).toBeVisible();
  const menuButton = page.locator('summary[aria-label="Open menu"]');
  if (await menuButton.isVisible()) {
    await menuButton.click();
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name: /Create account/i })
      .click();
  } else {
    await page
      .getByRole('link', { name: /Create account/i })
      .first()
      .click();
  }
  await expect(
    page.getByRole('heading', { name: /Create your account/i }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'hidden');
});
test('draft policy pages are linked', async ({ page }) => {
  await page.goto('/terms');
  await expect(
    page.getByRole('heading', { name: /Terms of use/i }),
  ).toBeVisible();
  await page.goto('/privacy');
  await expect(
    page.getByRole('heading', { name: /Privacy notice/i }),
  ).toBeVisible();
});

test('customer can sign up through the same-origin API proxy in CI', async ({
  page,
}) => {
  test.skip(
    process.env.E2E_API_ENABLED !== 'true',
    'The browser-only smoke server does not start PostgreSQL/API services.',
  );
  const email = `phase1-${Date.now()}@example.com`;
  await page.goto('/sign-up');
  await page.getByLabel('Full name').fill('Phase One Customer');
  await page.getByLabel('Email').fill(email);
  await page
    .getByRole('textbox', { name: /^Password/ })
    .fill('phase-one-password');
  await page.getByLabel(/draft Terms/i).check();
  await page.getByLabel(/draft Privacy/i).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/account\/profile/);
});
