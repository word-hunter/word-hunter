import path from 'node:path'
import { chromium, test as base, BrowserContext } from '@playwright/test'

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async ({}, use) => {
    const dirname = import.meta.dirname
    const pathToExtension = path.join(dirname, '../build')
    const userDataDir = path.join(dirname, '../test-user-data')
    const browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [`--disable-extensions-except=${pathToExtension}`, '--headless=chromium'],
      ignoreDefaultArgs: ['--disable-component-extensions-with-background-pages']
    })

    await use(browserContext)
    await browserContext.close()
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background) background = await context.waitForEvent('serviceworker')

    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  }
})
export const expect = test.expect
