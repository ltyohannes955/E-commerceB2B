import { test, expect } from '@playwright/test';

const admin = {
  id: 'admin-1',
  fullName: 'Platform Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
};

test('storefront stays light and links to a separate admin login', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  await expect(page.getByText('Dubai to Ethiopia trade desk')).toHaveCount(0);
  const footer = page.locator('.storefront-footer');
  await expect(
    footer.getByRole('link', { name: 'Admin sign in' }),
  ).toBeVisible();
  await footer.getByRole('link', { name: 'Admin sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Admin sign in' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  ).toHaveCount(0);
});

test('customer login returns to the storefront page', async ({ page }) => {
  await page.route('**/api/backend/**', async (route) => {
    const url = route.request().url();
    if (url.endsWith('/auth/csrf')) {
      return route.fulfill({ json: { csrfToken: 'test-token' } });
    }
    if (url.endsWith('/auth/login')) {
      return route.fulfill({ json: { role: 'CUSTOMER' } });
    }
    return route.fulfill({ status: 401, json: {} });
  });
  await page.goto('/how-it-works?ref=storefront');
  const login = page
    .locator('.storefront-footer')
    .getByRole('link', { name: 'Log in' });
  await login.click();
  await expect(page).toHaveURL(
    /\/login\?next=%2Fhow-it-works%3Fref%3Dstorefront/,
  );
  await page.getByLabel('Email').fill('buyer@example.com');
  await page.getByLabel('Password', { exact: true }).fill('long-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/how-it-works\?ref=storefront$/);
});

test('admin login opens the requested admin page with console navigation', async ({
  page,
}, testInfo) => {
  await page.route('**/api/backend/**', async (route) => {
    const url = route.request().url();
    if (url.endsWith('/auth/csrf'))
      return route.fulfill({ json: { csrfToken: 'test-token' } });
    if (url.endsWith('/auth/logout'))
      return route.fulfill({ status: 204, body: '' });
    if (url.endsWith('/auth/login') || url.endsWith('/users/me'))
      return route.fulfill({ json: admin });
    if (url.includes('/admin/products'))
      return route.fulfill({ json: { items: [], total: 0 } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/admin/login?next=%2Fadmin%2Fcatalog');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password', { exact: true }).fill('long-password');
  await page.getByRole('button', { name: 'Sign in to admin' }).click();
  await expect(page).toHaveURL(/\/admin\/catalog$/);
  if (testInfo.project.name === 'chromium') {
    await expect(
      page.getByRole('navigation', { name: 'Admin navigation' }),
    ).toContainText('Products');
  }
  await expect(
    page.getByRole('heading', { name: 'Catalog control room' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  ).toHaveCount(0);
  if (testInfo.project.name === 'mobile') {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await menu.click();
    await expect(
      page.getByRole('navigation', { name: 'Admin navigation' }),
    ).toContainText('Products');
    await expect(page.locator('.admin-sidebar')).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 0, 0)',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
    if (process.env.E2E_SCREENSHOTS === 'true') {
      await page.screenshot({
        path: '../../output/playwright/admin-console-mobile.png',
        fullPage: true,
      });
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
  } else if (process.env.E2E_SCREENSHOTS === 'true') {
    await page.screenshot({
      path: '../../output/playwright/admin-console-chromium.png',
      fullPage: true,
    });
  }
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation' }).click();
  }
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('customers see a permission state on admin pages', async ({ page }) => {
  await page.route('**/api/backend/users/me', (route) =>
    route.fulfill({ json: { ...admin, role: 'CUSTOMER' } }),
  );
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Administrator access required' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Admin navigation' }),
  ).toHaveCount(0);
});

test('signed-out visitors return to the requested admin route after login', async ({
  page,
}) => {
  await page.route('**/api/backend/**', (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fusers/);
});
