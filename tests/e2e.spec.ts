// Warehouse Management System — candidate-authored Playwright suite.
//
// Happy path (the basic test-execution condition): log in as the
// technician, load a pallet into a free storage location, and assert
// the warehouse map shows that location occupied with the pallet's
// details.
//
// Run: `npm test` (or `npx playwright test`). The UI and API must
// already be running — this suite never starts its own servers
// (no `webServer` in playwright.config.ts, per the brief).
//
// Credentials come from the evaluator-supplied EVAL_* variables when
// present; the fallbacks are the documented local-dev defaults from
// the API seed command (username as password, local use only — never
// real hosted passwords).
import { expect, test, type Page } from '@playwright/test'

const TECH_USER = process.env.EVAL_TECHNICIAN_USERNAME || 'demo_technician'
const TECH_PASS = process.env.EVAL_TECHNICIAN_PASSWORD || 'demo_technician'

async function loginAsTechnician(page: Page) {
  await page.goto('/login')
  await page.locator('#username').fill(TECH_USER)
  await page.locator('#password').fill(TECH_PASS)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('heading', { name: 'Warehouse map' }),
  ).toBeVisible()
}

test('technician loads a pallet and the map shows it occupied', async ({
  page,
}) => {
  await loginAsTechnician(page)

  await page.getByRole('button', { name: 'Load a pallet' }).click()

  // Pick the first free storage location offered by the dialog. A1 is
  // the transfer point and is never offered as a destination.
  const destination =
    (await page.locator('#destination option').first().getAttribute('value')) ??
    ''
  expect(destination).toMatch(/^[A-E][1-5]$/)
  expect(destination).not.toBe('A1')

  // A fresh pallet number per run so the suite is repeatable against
  // the same database (the API rejects duplicate pallet numbers).
  const palletNumber = `PLT-E2E-${Date.now()}`
  await page.locator('#pallet-number').fill(palletNumber)
  await page.locator('#barcode').fill(`BC-E2E-${Date.now()}`)
  await page.locator('#item').fill('Cardboard Boxes')
  await page.locator('#quantity').fill('12')
  await page.getByRole('button', { name: 'Load pallet' }).click()

  await expect(page.getByRole('status')).toContainText(
    `Pallet ${palletNumber} loaded into ${destination}.`,
  )

  // The map cell is now occupied: red + the pallet number as text.
  const cell = page.getByRole('gridcell', {
    name: `${destination}: ${palletNumber}`,
  })
  await expect(cell).toBeVisible()

  // Selecting the cell shows the pallet details.
  await cell.click()
  await expect(page.locator('.detail-panel')).toContainText(palletNumber)
  await expect(page.locator('.detail-panel')).toContainText(
    'Cardboard Boxes',
  )
})
