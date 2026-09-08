import { expect, test } from '@playwright/test'

test('valid login goes Login → Dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill('operador')
  await page.getByLabel('Contraseña').fill('operador')
  await page.getByLabel('Contraseña').press('Enter')

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Panel principal' })).toBeVisible()
})

test('invalid login stays on /login with an accessible error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill('desconocido')
  await page.getByLabel('Contraseña').fill('xxxx')
  await page.getByLabel('Contraseña').press('Enter')

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('alert')).toContainText('Credenciales inválidas')
})
