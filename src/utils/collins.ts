import { emphasizeWordInText } from '../utils'

const apiBase = 'https://www.collinsdictionary.com/dictionary/english/'
const pronunciationGuideUrl = 'https://blog.collinsdictionary.com/ipa-pronunciation-guide-cobuild/'
const cefrLabelGuideUrl = 'https://blog.collinsdictionary.com/ipa-pronunciation-guide-cobuild/'

const getPageUrl = (word: string) => `${apiBase}${encodeURIComponent(word.replace(/\s+/g, '-'))}`

const cache = {}

export async function lookup(word: string) {
  if (cache[word]) return cache[word]
  const doc = await fetchDocument(word)
  const data = parseDocument(doc, word)
  cache[word] = data
  return data
}

async function fetchDocument(word) {
  const url = getPageUrl(word)
  const res = await fetch(url)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc
}

function parseDocument(doc: Document, word: string) {
  const root = doc.querySelector('.dictlink:has(.def)') ?? doc.querySelector('.dictlink')
  if (!root) throw new Error('invalid response')

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
  const note = root.querySelector('.note')?.textContent ?? ''
  return note
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
    const defText = defNode.querySelector('.def')?.textContent ?? ''
    if (!defText) return parseSense(defNode)

    const type = defNode.querySelector('.pos')?.textContent ?? ''
    const cefrLevel = defNode.querySelector<HTMLElement>('.Symbollbcefrb')?.dataset.type
    const examples = Array.from(defNode.querySelectorAll('.cit.type-example')).map(ex => {
      const text = ex.querySelector('.quote')?.textContent ?? ex.textContent ?? ''
      const type = ex.querySelector('.type-syntax')?.textContent ?? ''
      const audio = ex.querySelector<HTMLElement>('[data-src-mp3]')?.dataset.srcMp3
      const synonyms = Array.from(ex.querySelector('.thes')?.querySelectorAll('a') ?? []).map(a => {
        const text = a.textContent ?? ''
        const url = a.getAttribute('href') ?? ''
        return { text, url }
      })
      return { text, type, audio, synonyms }
    })
    return { type, cefrLevel, defText, examples, isSense: false }
  })
  return definitions.filter(d => d !== null)
}

function parseSense(defNode: Element) {
  const sense = defNode.querySelector('.sense') ?? defNode.querySelector('.xr')
  return {
    defText: sense?.innerHTML ?? '',
    isSense: true,
    examples: [],
    cefrLevel: undefined,
    type: undefined
  }
}

type CollinsData = ReturnType<typeof parseDocument>

export function render(def: CollinsData) {
  const { word, frequency, note, definitions, pronounciations } = def
  const html = `
    <div class="__dict_collins">
      <div class="__title">
        <div class="__prons">
          ${renderPornounciations(pronounciations)} 
        </div>
        ${renderFrequency(frequency)}
      </div>
      ${renderNote(note)}
      <div class="__definitions">
        ${renderDefinition(definitions, word)}
      </div>
    </div>`
  return html
}

function renderFrequency(frequency: number) {
  return `
      <span class="__frequency" title="Word Frequency ${frequency}">${'<i></i>'.repeat(frequency)}</span>
  `
}

function renderPornounciations(pronounciations: CollinsData['pronounciations']) {
  return pronounciations
    .map(
      pron => `
      <div>
        <span data-src-mp3="${pron.audio}">
          ${pron.audio ? `<a data-src-mp3="${pron.audio}"> /${pron.text}/ 🔈</a>` : '/' + pron.text + '/'}
          <a href="${pronunciationGuideUrl}" target="_blank">ⓘ</a> 
        </span>
      </div>
    `
    )
    .join('')
}

function renderDefinition(definitions: CollinsData['definitions'], word: string) {
  return definitions
    .map(
      (def, i) => `
          <div class="__definition">
            <div>
              <span>${i + 1}.</span>
              <span>${def.type || (def.isSense ? 'sence' : '')}</span>
              ${def?.cefrLevel ? `<a target="_blank" href="${cefrLabelGuideUrl}">${def.cefrLevel ?? ''}</a>` : ''}
            </div>
            <div class="__def_text">${def.isSense ? def.defText : emphasizeWordInText(def.defText, word)}</div>
            <div>${def.examples
              .map(ex => {
                return `
                <div class="__example">
                  <div>${emphasizeWordInText(ex.text, word)}${
                  ex.audio ? `<a data-src-mp3="${ex.audio}"> 🔈</a>` : ''
                }</div>
                  <div>${ex.synonyms.map(syn => `<a href="${syn.url}">${syn.text}</a>`).join('')}</div>
                </div>
              `
              })
              .join('')}</div>
          </div>
          `
    )
    .join('')
}

function renderNote(note?: string) {
  if (!note) return ''
  return `<div class="__note">${note}</div>`
}

export default {
  lookup,
  render
}
