const apiBase = 'https://www.collinsdictionary.com/dictionary/english/'

const getPageUrl = (word: string) => `${apiBase}${encodeURIComponent(word.replace(/\s+/g, '-'))}`

const cache: Record<string, string> = {}

export async function lookup(word: string) {
  if (cache[word]) return Promise.resolve(cache[word])
  try {
    const doc = await fetchDocument(word)
    const data = parseDocument(doc, word)
    cache[word] = data
    return data
  } catch (e) {
    console.warn(e)
    return ''
  }
}

async function fetchDocument(word: string) {
  const url = getPageUrl(word)
  const res = await fetch(url)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc
}

function parseDocument(doc: Document, word: string) {
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
    '.pronIPASymbol img',
    '.ex-info',
    '.pB-quiz',
    '.specialQuiz',
    '.new-from-collins',
    '.homnum',
    '.suggest_new_word_wrapper',
    '.miniWordle'
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

  root.querySelectorAll('.youtube-video').forEach(el => {
    const vid = el.getAttribute('data-embed')
    if (vid) {
      el.innerHTML = `<iframe
        width="100%"
        style="aspect-ratio: 16/9;"
        src="https://www.youtube.com/embed/${vid}"
        loading="lazy"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>`
    }
  })

  const html = root.innerHTML

  return html
    .replace(/<(script|style|noscript)[^>]*>.*?<\/\1>/g, '')
    .replaceAll(`href="${apiBase}`, `data-href="${apiBase}`)
    .replaceAll('<a ', '<a target="_blank"')
    .replaceAll('/external/images', 'https://www.collinsdictionary.com/external/images')
}

export function getWordByHref(href: string) {
  const url = new URL(href)
  const path = url.pathname
  const word = path.replace('/dictionary/english/', '')
  return word.toLowerCase()
}
