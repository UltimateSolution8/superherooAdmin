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

  await page.locator('nav a[href="/helpers"]').click();
  await expect(page.getByText('Add Superherooo')).toBeVisible();

  await page.locator('nav a[href="/helpers/pending"]').click();
  await expect(page.getByText('Pending KYC')).toBeVisible();

  await page.locator('nav a[href="/buyers"]').click();
  await expect(page.getByText('Add Citizen')).toBeVisible();

  await page.locator('nav a[href="/tasks"]').click();
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();

  await page.locator('nav a[href="/support/tickets"]').click();
  await expect(page.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();
});

test('live KYC uses the LiveKit session contract and keeps snapshot approval gated', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('superheroo_admin_access', 'test-token');
    localStorage.setItem('superheroo_admin_refresh', 'test-refresh');
    localStorage.setItem('superheroo_admin_user', JSON.stringify({ id: 'admin-1', role: 'KYC' }));
  });
  await page.route('**/api/v1/admin/helpers/pending', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        helperId: '11111111-1111-1111-1111-111111111111',
        displayName: 'KYC Helper',
        phone: '9000000101',
        email: null,
        kycSubmittedAt: new Date().toISOString(),
        kycFullName: 'KYC Helper',
        kycIdNumber: 'ID-101',
      }]),
    });
  });
  await page.route('**/api/v1/admin/video-kyc/live/start', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '22222222-2222-2222-2222-222222222222',
        helperId: '11111111-1111-1111-1111-111111111111',
        helperName: 'KYC Helper',
        provider: 'LIVEKIT',
        serverUrl: 'wss://127.0.0.1:9',
        roomId: 'kyc_test_room',
        userId: 'admin_admin-1',
        userName: 'Admin',
        token: 'test-livekit-token',
        status: 'SUBMITTED',
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      }),
    });
  });
  await page.route('**/api/v1/admin/video-kyc/live/*/end', async (route) => {
    await route.fulfill({ status: 204 });
  });

  await page.goto('/kyc/live');
  await expect(page.getByText('KYC Helper').first()).toBeVisible();
  await page.getByRole('button', { name: 'Start Live', exact: true }).click();
  await expect(page.getByText(/Room kyc_test_room/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve KYC' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Capture selfie' })).toBeDisabled();
  await page.getByRole('button', { name: 'End call' }).click();
  await expect(page.getByText('No active session')).toBeVisible();
});
