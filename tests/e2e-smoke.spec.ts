// End-to-end spec — part of the submission test suite. It exercises the
// live local UI + API end to end in a real headless Chromium browser:
// technician load/unload round-trip, role gating, and admin user actions.
//
// Credentials come from the evaluator-supplied EVAL_* variables when
// present; the fallbacks are the documented local-dev defaults from
// the API seed command (username as password, local use only — never
// real hosted passwords).
import { expect, test, type Page } from '@playwright/test'

const TECH_USER = process.env.EVAL_TECHNICIAN_USERNAME || 'demo_technician'
const TECH_PASS = process.env.EVAL_TECHNICIAN_PASSWORD || 'demo_technician'
const AUD_USER = process.env.EVAL_AUDITOR_USERNAME || 'demo_auditor'
const AUD_PASS = process.env.EVAL_AUDITOR_PASSWORD || 'demo_auditor'
const ADMIN_USER = process.env.EVAL_ADMIN_USERNAME || 'demo_admin'
const ADMIN_PASS = process.env.EVAL_ADMIN_PASSWORD || 'demo_admin'

async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('heading', { name: 'Warehouse map' }),
  ).toBeVisible()
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL('/login')
}

test('technician loads a pallet and unloads it again', async ({ page }) => {
  await loginAs(page, TECH_USER, TECH_PASS)

  // Auditor-only controls must not exist for the technician view either —
  // the Load button is the technician's own control and must be present.
  await page.getByRole('button', { name: 'Load a pallet' }).click()

  const palletNumber = `PLT-SMOKE-${Date.now()}`
  const dest =
    (await page.locator('#destination option').first().getAttribute('value')) ??
    ''
  expect(dest).toMatch(/^[A-E][1-5]$/)
  expect(dest).not.toBe('A1')

  await page.locator('#pallet-number').fill(palletNumber)
  await page.locator('#barcode').fill(`BC-SMOKE-${Date.now()}`)
  await page.locator('#item').fill('Smoke Test Boxes')
  await page.locator('#quantity').fill('5')
  await page.getByRole('button', { name: 'Load pallet' }).click()

  await expect(page.getByRole('status')).toContainText(
    `loaded into ${dest}`,
  )

  // The map cell now shows the pallet number (occupied, red + text).
  const cell = page.getByRole('gridcell', { name: `${dest}: ${palletNumber}` })
  await expect(cell).toBeVisible()

  // Detail panel shows the pallet; unload it from there.
  await cell.click()
  await expect(page.locator('.detail-panel')).toContainText(palletNumber)
  await page.getByRole('button', { name: 'Unload pallet' }).click()
  await expect(page.getByRole('status')).toContainText(
    `unloaded from ${dest}`,
  )

  // The same cell is free again.
  await expect(
    page.getByRole('gridcell', { name: `${dest}: Free` }),
  ).toBeVisible()
})

test('auditor sees no load/unload controls; technician is denied the dashboard', async ({
  page,
}) => {
  await loginAs(page, AUD_USER, AUD_PASS)

  await expect(
    page.getByRole('button', { name: 'Load a pallet' }),
  ).toHaveCount(0)

  // Seeded pallet PLT-1002 sits at C3; the auditor can inspect it but
  // gets no Unload control.
  await page.getByRole('gridcell', { name: 'C3: PLT-1002' }).click()
  await expect(page.locator('.detail-panel')).toContainText('PLT-1002')
  await expect(
    page.getByRole('button', { name: 'Unload pallet' }),
  ).toHaveCount(0)

  // Auditors are allowed on the dashboard.
  await page.goto('/dashboard')
  await expect(
    page.getByRole('heading', { name: 'Auditor dashboard' }),
  ).toBeVisible()

  // A technician hitting the dashboard gets a clean denial, not a crash.
  await logout(page)
  await loginAs(page, TECH_USER, TECH_PASS)
  await page.goto('/dashboard')
  await expect(
    page.getByRole('heading', { name: 'Access denied' }),
  ).toBeVisible()
  await expect(page.locator('main')).toContainText('Back to the warehouse map')

  await page.goto('/admin')
  await expect(
    page.getByRole('heading', { name: 'Access denied' }),
  ).toBeVisible()
})

test('admin can create, edit, reset and delete a user', async ({ page }) => {
  // Accept the window.confirm() on delete; Playwright would dismiss it
  // by default, which would cancel the delete.
  page.on('dialog', (dialog) => dialog.accept())

  await loginAs(page, ADMIN_USER, ADMIN_PASS)
  await page.goto('/admin')
  await expect(
    page.getByRole('heading', { name: 'Admin — Users' }),
  ).toBeVisible()

  const tmpUser = `tmpday2${Date.now()}`
  const tmpPass = 'TempPass123!'
  const newPass = 'NewTempPass456!'

  // Create.
  await page.locator('#new-username').fill(tmpUser)
  await page.locator('#new-password').fill(tmpPass)
  await page.getByRole('button', { name: 'Create user' }).click()
  await expect(page.getByRole('status')).toContainText(`created`)
  const row = page.locator('tr', { hasText: tmpUser })
  await expect(row).toBeVisible()

  // Change role technician -> auditor.
  await row.locator('select').selectOption('auditor')
  await expect(page.getByRole('status')).toContainText(
    `changed to auditor`,
  )

  // Reset password, then prove the new password logs in.
  await row.locator('input[type="password"]').fill(newPass)
  await row.getByRole('button', { name: 'Reset password' }).click()
  await expect(page.getByRole('status')).toContainText('Password reset')

  await logout(page)
  await loginAs(page, tmpUser, newPass)
  await logout(page)

  // Back as admin: the last-admin guard must refuse demoting demo_admin.
  await loginAs(page, ADMIN_USER, ADMIN_PASS)
  await page.goto('/admin')
  const adminRow = page.locator('tr', { hasText: ADMIN_USER })
  await adminRow.locator('select').selectOption('technician')
  await expect(page.getByRole('alert')).toContainText(
    'Cannot demote the last admin.',
  )

  // Delete the temp user.
  const tmpRow = page.locator('tr', { hasText: tmpUser })
  await tmpRow.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('status')).toContainText(
    `User ${tmpUser} deleted.`,
  )
  await expect(page.locator('tr', { hasText: tmpUser })).toHaveCount(0)
})
