import { test, expect } from '@playwright/test';

const email = process.env.ADMIN_EMAIL || 'admin@helpinminutes.app';
const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

test('admin login and core navigation', async ({ page }) => {
  await page.route('**/api/v1/auth/password/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        user: { id: 'admin-1', role: 'ADMIN', phone: '9999999999', displayName: 'Platform Admin' },
      }),
    });
  });

  await page.route('**/api/v1/admin/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pendingHelpers: 1,
        searchingTasks: 2,
        assignedTasks: 1,
        arrivedTasks: 0,
        startedTasks: 1,
        completedTasks: 3,
        totalRevenuePaise: 125000,
      }),
    });
  });

  await page.route('**/api/v1/admin/tasks/recent?limit=5', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'task-1',
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          title: 'Fix water purifier',
          urgency: 'HIGH',
          budgetPaise: 35000,
        },
      ]),
    });
  });

  await page.route('**/api/v1/admin/helpers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v1/admin/helpers/pending', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v1/admin/buyers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v1/admin/tasks', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v1/admin/support/tickets**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Recent Tasks')).toBeVisible();

  await page.locator('nav').getByRole('link', { name: /Helpers/i }).first().click();
  await expect(page.getByText('Add Helper')).toBeVisible();

  await page.locator('nav').getByRole('link', { name: /Pending/i }).first().click();
  await expect(page.getByText('Pending KYC')).toBeVisible();

  await page.locator('nav').getByRole('link', { name: /Buyers/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Buyers' })).toBeVisible();

  await page.locator('nav').getByRole('link', { name: /Tasks/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();

  await page.locator('nav').getByRole('link', { name: /Support/i }).first().click();
  await expect(page.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();
});
