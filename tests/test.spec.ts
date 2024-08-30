import path from 'node:path'
import { Page } from '@playwright/test'
import { test, expect } from './fixtures'

async function loadLocalHTML(page: Page) {
  await page.goto('file://' + path.resolve(import.meta.dirname, `./Alice's Adventures in Wonderland/index.html`))
}

test.describe('Test extension', () => {
  test('load correctly', async ({ page }) => {
    await loadLocalHTML(page)
    const title = await page.locator('css=title').innerText()
    expect(title).toEqual('The Project Gutenberg eBook of Alice’s Adventures in Wonderland, by Lewis Carroll')

    const tagName = await page.evaluate(
      () => (document.getElementsByTagName('wh-root') as unknown as HTMLElement[])?.[0]?.tagName
    )
    expect(tagName).toEqual('WH-ROOT')
  })

  test('display card', async ({ page }) => {
    await loadLocalHTML(page)
    // waiting for word highlight
    await new Promise(resolve => setTimeout(resolve, 2000))
    await page.getByText(' wonderland ').first().hover()

    const containerElement = page.locator('css=wh-root .word_card')
    await expect(containerElement).toBeVisible()
    expect(await containerElement.evaluate(containerElement => containerElement?.className)).toContain('card_visible')
  })
})
