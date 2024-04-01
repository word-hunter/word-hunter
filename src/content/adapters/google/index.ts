// reference: https://github.com/crimx/ext-saladict/blob/dev/src/components/dictionaries/googledict/engine.ts

import dictStyles from './index.css?inline'
import type { Adapter } from '../type'
import { fetchText } from '../fetch'

const cache: Record<string, string> = {}

export class GoogleDict implements Adapter {
  readonly name = 'google'
  readonly host = 'https://www.google.com'
  readonly apiBase = `${this.host}/search`
  readonly sectionSelector = ''

  get style() {
    return dictStyles
  }

  async lookup({ word }: { word: string; text?: string }) {
    if (cache[word]) return Promise.resolve(cache[word])
    try {
      const html = await this.fetch(word)
      const doc = new DOMParser().parseFromString(html, 'text/html')

      const data = this.parseDocument(doc, html, word)
      cache[word] = data
      return data
    } catch (e) {
      console.warn(e)
      return ''
    }
  }

  private async fetch(word: string) {
    const url = this.getPageUrl(word)
    try {
      return await fetchText(url)
    } catch (e) {
      return await fetchText(url.replace('q=meaning', 'q=define'))
    }
  }

  getPageUrl(word: string) {
    return `${this.apiBase}?hl=en&safe=off&hl=en&gl=en&q=meaning:${encodeURIComponent(word.replace(/\s+/g, '-'))}`
  }

  private parseDocument(doc: Document, bodyText: string, word: string) {
    const root = doc.querySelector('.lr_container')
    if (!root) return ''

    this.extFragments(bodyText).forEach(({ id, innerHTML }) => {
      try {
        const el = doc.querySelector(`#${id}`)
        if (el) {
          el.innerHTML = innerHTML
        }
      } catch (e) {
        // ignore
      }
    })

    const toRemoveSelectors = [
      'input',
      'label',
      'script',
      'style',
      'noscript',
      'iframe',
      '.lr_dct_trns_h', // other Translate to blocks
      '.S5TwIf', // Learn to pronounce
      '.VZVCid', // From Oxford
      '.u7XA4b', // footer
      '.TomNKe', // See definitions in domain
      '[jsname=L4Nn5e]' // remove translate to
    ]

    toRemoveSelectors.forEach(selector => {
      root.querySelectorAll(selector).forEach(el => el.remove())
    })

    root.querySelectorAll<HTMLDivElement>('.vkc_np').forEach($block => {
      if (
        $block.querySelector('.xxjPif') || // Dictionary title
        $block.querySelector('.zbA8Me') || // Dictionary title
        $block.querySelector('#dw-siw') || // Search box
        $block.querySelector('#tl_select') // Translate to
      ) {
        $block.remove()
      }
    })

    // tts
    root.querySelectorAll('audio source').forEach(el => {
      const src =
        (el as HTMLSourceElement).src ??
        'https://www.google.com/speech-api/v1/synthesize?enc=mpeg&lang=zh-cn&speed=0.4&client=lr-language-tts&use_google_only_voices=1&text=' +
          encodeURIComponent(word)
      el.closest('.brWULd')?.setAttribute('data-src-mp3', src.replace(/^file/, 'https'))
      el.parentElement?.remove()
    })

    root.querySelectorAll('[role=listitem] > [jsname=F457ec]').forEach(el => {
      if (el.getAttribute('jsaction')) {
        const text = el.textContent
        el.innerHTML = `<a data-href="${text}">${text}</a>`
        // always appeared available
        el.removeAttribute('style')
        el.classList.add('MR2UAc')
        el.classList.add('I6a0ee')
        el.classList.remove('cO53qb')
        el.classList.remove('EmSASc')
      }
    })

    root.querySelectorAll('[data-term-for-update]').forEach(el => {
      const a = document.createElement('a')
      const word = (el as HTMLElement).dataset.termForUpdate ?? ''
      a.dataset.href = word.toLowerCase()
      a.innerHTML = word
      el.replaceWith(a)
    })

    root.querySelectorAll('g-img > img').forEach(el => {
      const src = el.getAttribute('title')
      if (src) {
        el.setAttribute('src', src)
      }
      el.setAttribute('loading', 'lazy')
    })

    this.extractImg(bodyText).forEach(({ id, src }) => {
      try {
        const el = root.querySelector(`#${id}`)
        if (el) {
          el.setAttribute('src', src)
        }
      } catch (e) {
        // ignore
      }
    })

    doc.querySelectorAll('style').forEach($style => {
      const textContent = $style.textContent
      if (textContent && /\.xpdxpnd|\.lr_container/.test(textContent)) {
        const s = document.createElement('style')
        s.textContent = textContent
        root.appendChild(s)
      }
    })

    const html = root.innerHTML

    return html
      .replaceAll('aria-hidden="true"', '')
      .replaceAll('<a href="">', '<a href="#">')
      .replaceAll('<a ', '<a target="_blank" ')
  }

  getWordByHref(href: string) {
    return href.toLowerCase()
  }

  cspViolationHandler(e: SecurityPolicyViolationEvent, root: HTMLElement) {
    if (e.violatedDirective === 'img-src') {
      if (e.blockedURI.indexOf('.gstatic.com') !== -1) {
        const host = new URL(e.blockedURI).host
        root.querySelector(`img[src*="${host}"]`)?.closest('.xpdxpnd,.nVKZKc')?.remove()
      }
    }
  }

  extFragments(text: string): Array<{ id: string; innerHTML: string }> {
    const result: Array<{ id: string; innerHTML: string }> = []
    const matcher = /\(function\(\)\{window\.jsl\.dh\('([^']+)','([^']+)'\);\}\)\(\);/g
    let match: RegExpExecArray | null | undefined
    while ((match = matcher.exec(text))) {
      result.push({
        id: match[1],
        innerHTML: match[2]
          // escape \x
          .replace(/\\x([\da-f]{2})/gi, this.decodeHex)
          // escape \u
          .replace(/\\[u]([\da-f]{4})/gi, this.decodeHex)
      })
    }
    return result
  }

  extractImg(text: string): Array<{ id: string; src: string }> {
    const kvPairMatch = /google.ldi={([^}]+)}/.exec(text)
    if (kvPairMatch) {
      try {
        const json = JSON.parse(`{${kvPairMatch[1]}}`)
        return Object.keys(json).map(key => ({ id: key, src: json[key] }))
      } catch (e) {
        // ignore
      }
    }
    return []
  }

  decodeHex(m: string, code: string): string {
    return String.fromCharCode(parseInt(code, 16))
  }

  unbindRootClickEvent: () => void = () => {}

  bindRootClickEvent(root: HTMLElement) {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('Inx6Z')) {
        const pNode = target.closest('.SkSOXb') || target.closest('.KAwqid')
        pNode?.classList.toggle('SkSOXb')
        pNode?.classList.toggle('KAwqid')
        return false
      }
    }
    root.addEventListener('click', handler)
    this.unbindRootClickEvent = () => root.removeEventListener('click', handler)
  }
}
