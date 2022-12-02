const apiBase = 'https://www.collinsdictionary.com/dictionary/english/'
export const pronunciationGuideUrl = 'https://blog.collinsdictionary.com/ipa-pronunciation-guide-cobuild/'
export const cefrLabelGuideUrl = 'https://blog.collinsdictionary.com/cefr-labels-explained/'

const getPageUrl = (word: string) => `${apiBase}${encodeURIComponent(word.replace(/\s+/g, '-'))}`

export type CollinsData = ReturnType<typeof parseDocument>

const cache: Record<string, CollinsData> = {}

export async function lookup(word: string) {
  if (cache[word]) return Promise.resolve(cache[word])
  try {
    const doc = await fetchDocument(word)
    const data = parseDocument(doc, word)
    cache[word] = data
    return data
  } catch (e) {
    console.warn(e)
    return null
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
  const root = doc.querySelector('.dictlink:has(.def)') ?? doc.querySelector('.dictlink')
  if (!root) return null

  const frequency = praseFrequency(root)
  const note = parseNote(root)
  const definitions = praseDefinitions(root)
  const pronounciations = prasePronounciations(root)
  return { word, frequency, note, definitions, pronounciations }
}

function praseFrequency(root: Element) {
  const frequencyNode = root.querySelector('.word-frequency-img')
  const frequency = frequencyNode?.getAttribute('data-band') ?? '0'
  return Number(frequency)
}

function parseNote(root: Element) {
  const note = root.querySelector('.note')?.innerHTML ?? ''
  return note
    .replace(/<span class="hi rend-u">(.*)<\/span>/gi, '<u>$1</u>')
    .replace(/<img .*\/?>|<span[^>]*>|<\/span>|<a[^>]*class="pronIPASymbol"[^>]*>/gi, '')
    .replace(/<a class="hwd_sound[^>]*data-src-mp3="(.*)"[^>]*>/gi, '<a data-src-mp3="$1"> 🔈')
}

function prasePronounciations(root: Element) {
  const prons = root.querySelector('.mini_h2')
    ? root.querySelectorAll('.mini_h2 .pron')
    : root.querySelectorAll('.pron')
  const pronounciations = Array.from(prons).map(pron => {
    const audio = pron.querySelector<HTMLElement>('[data-src-mp3]')?.dataset.srcMp3
    const text = pron.innerHTML.replace(/(<span class="ptr(.|\s)*<\/span>)|(<a(.|\s)*<\/a>)/i, '')
    return { text, audio }
  })
  return pronounciations
}

function praseDefinitions(root: Element) {
  const defNodes = root.querySelectorAll('.definitions .hom')

  const definitions = Array.from(defNodes).map(defNode => {
    const defText =
      defNode
        .querySelector('.def')
        ?.innerHTML?.replaceAll('href="', 'data-href="')
        .replace(/<span class="hi rend-sup".*<\/span>/gi, '') ?? ''

    if (!defText) return parseSense(defNode)

    const type = defNode.querySelector('.pos')?.textContent ?? ''
    const cefrLevel = defNode.querySelector<HTMLElement>('.Symbollbcefrb')?.dataset.type
    const examples = Array.from(defNode.querySelectorAll('.cit.type-example')).map(ex => {
      const text = ex.querySelector('.quote')?.textContent ?? ex.textContent ?? ''
      const type = ex.querySelector('.type-syntax')?.textContent ?? ''
      const audio = ex.querySelector<HTMLElement>('[data-src-mp3]')?.dataset.srcMp3
      return { text, type, audio }
    })
    const synonyms = Array.from(defNode.querySelector('.thes')?.querySelectorAll('a.form') ?? []).map(a => {
      const text = a.textContent ?? ''
      const url = a.getAttribute('href') ?? ''
      return { text, url }
    })
    return { type, cefrLevel, defText, examples, synonyms, isSense: false }
  })
  return definitions.filter(d => d !== null)
}

function parseSense(defNode: Element) {
  const sense = defNode.querySelector('.sense') ?? defNode.querySelector('.xr')
  return {
    defText: (sense?.innerHTML ?? '')
      .replace('href="', 'data-href="')
      .replace(/<span class="hi rend-sup".*<\/span>/gi, ''),
    isSense: true,
    examples: [],
    synonyms: [],
    cefrLevel: undefined,
    type: undefined
  }
}
