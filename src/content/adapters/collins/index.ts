import dictStyles from './index.css?inline'
import type { Adapter } from '../type'
import { fetchText } from '../fetch'

const cache: Record<string, string> = {}

export class CollinsDict implements Adapter {
  readonly name = 'collins'
  readonly host = 'https://www.collinsdictionary.com'
  readonly apiBase = `${this.host}/dictionary/english/`
  readonly sectionSelector = '.cB'

  get style() {
    return dictStyles
  }

  async lookup({ word }: { word: string; text?: string }) {
    if (cache[word]) return Promise.resolve(cache[word])
    try {
      const doc = await this.fetchDocument(word)
      const data = this.parseDocument(doc, word)
      cache[word] = data
      return data
    } catch (e) {
      console.warn(e)
      return ''
    }
  }

  private async fetchDocument(word: string) {
    const url = this.getPageUrl(word)
    const html = await fetchText(url)
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc
  }

  getPageUrl(word: string) {
    return `${this.apiBase}${encodeURIComponent(word.replace(/\s+/g, '-'))}`
  }

  private parseDocument(doc: Document, word: string) {
    const root = doc.querySelector('#main_content .res_cell_center')
    if (!root) return ''

    const toRemoveSelectors = [
      '.navigation',
      'h1.entry_title',
      '.share-button',
      '.share-overlay',
      '.popup-overlay',
      'input',
      'label',
      'script',
      'style',
      'noscript',
      'iframe',
      '.cobuild-logo',
      '.socialButtons',
      '.mpuslot_b-container',
      '.copyright',
      '.cB-hook',
      '.beta',
      '.link_logo_information',
      '[data-type-block="Word usage trends"]',
      '[data-type-block="Word lists"]',
      '.type-thesaurus',
      '.extra-link',
      '.carousel-title',
      '.btmslot_a-container',
      '.pronIPASymbol',
      '.ex-info',
      '.pB-quiz',
      '.specialQuiz',
      '.new-from-collins',
      '.homnum',
      '.suggest_new_word_wrapper',
      '.miniWordle',
      '#videos',
      '.dictionary ~ .dictionary',
      '.dictionary ~ .assets',
      '.cB-n-w',
      '.cB-o'
    ]

    toRemoveSelectors.forEach(selector => {
      root.querySelectorAll(selector).forEach(el => el.remove())
    })

    root.querySelectorAll('img.lazy').forEach(el => {
      const src = el.getAttribute('data-src')
      if (src) {
        el.setAttribute('src', src)
        el.setAttribute('loading', 'lazy')
      }
    })

    const html = root.innerHTML

    return html
      .replace(/<(script|style|noscript)[^>]*>.*?<\/\1>/g, '')
      .replaceAll(`href="${this.apiBase}`, `data-href="${this.apiBase}`)
      .replaceAll('<a href="">', '<a href="#">')
      .replaceAll('<a ', '<a target="_blank" ')
      .replaceAll('src="/', `src="${this.host}/`)
      .replaceAll('href="/', `href="${this.host}/`)
  }

  getWordByHref(href: string) {
    const url = new URL(href)
    const path = url.pathname
    const word = path.replace('/dictionary/english/', '')
    return word.toLowerCase()
  }

  cspViolationHandler(e: SecurityPolicyViolationEvent, root: HTMLElement) {
    const sectionSelector = '[data-type-block]'
    if (e.violatedDirective === 'img-src') {
      if (e.blockedURI.startsWith(this.host)) {
        root.querySelector(`img[src^="${e.blockedURI}"]`)?.closest(sectionSelector)?.remove()
      }
    }
  }
}
