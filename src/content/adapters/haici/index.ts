import dictStyles from './index.css?inline'
import type { Adapter } from '../type'
import { fetchText } from '../fetch'

const cache: Record<string, string> = {}

export class HaiCiDict implements Adapter {
  readonly name = 'haici'
  readonly host = 'https://dict.cn'
  readonly apiBase = `${this.host}/search`
  readonly sectionSelector = '.section,.word'

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
    return `${this.apiBase}?q=${encodeURIComponent(word)}`
  }

  private parseDocument(doc: Document, word: string) {
    const root = doc.querySelector('.main')
    if (!root) return ''

    const toRemoveSelectors = [
      'input',
      'script',
      'style',
      'noscript',
      'iframe',
      '.sidenav',
      '.copyright',
      '.auth',
      // '.dual',
      '.layout.en'
    ]

    toRemoveSelectors.forEach(selector => {
      root.querySelectorAll(selector).forEach(el => el.remove())
    })

    root.querySelectorAll('.sound[naudio]').forEach(el => {
      el.classList.add('audio_play_button')
      el.setAttribute('data-src-mp3', 'https://audio.dict.cn/' + el.getAttribute('naudio')!)
    })

    root.querySelectorAll('.sound[naudio]').forEach(el => {
      el.classList.add('audio_play_button')
      el.setAttribute('data-src-mp3', 'https://audio.dict.cn/' + el.getAttribute('naudio')!)
    })

    root.querySelectorAll('.phonetic span:last-child .sound').forEach(el => {
      el.classList.add('amefile')
    })

    genSvgPieChart(root.querySelector('.dict-chart'))

    const html = root.innerHTML

    return html
      .replace(/<(script|style|noscript)[^>]*>.*?<\/\1>/g, '')
      .replaceAll(`href="${this.host}`, `data-href="${this.host}`)
      .replaceAll(`href="/text`, `data-href="/text`)
      .replaceAll('<a href="">', '<a href="#">')
      .replaceAll('src="/', `src="${this.host}/`)
      .replaceAll('href="/', `href="${this.host}/`)
  }

  getWordByHref(href: string) {
    const word = href.replace(this.host, '').replace(`/search?q=`, '').replace('/', '').split('_')[0]
    return decodeURIComponent(word).toLowerCase()
  }

  cspViolationHandler(e: SecurityPolicyViolationEvent, root: HTMLElement) {
    if (e.violatedDirective === 'img-src') {
      if (e.blockedURI.startsWith(this.host)) {
        root.querySelector(`img[src^="${e.blockedURI}"]`)?.remove()
      }
    }
  }
}

type ChartData = Record<number, { percent: number; sense: string }>

function genSvgPieChart(container: Element | null) {
  if (container) {
    const dataString = container.getAttribute('data')
    let data: ChartData = {}
    try {
      data = JSON.parse(decodeURIComponent(dataString || ''))
      const keys = Object.keys(data)
      if (!(keys.length > 1)) {
        container.remove()
        return false
      }
    } catch (e) {
      console.warn(e)
      return false
    }

    container.innerHTML = `
      <svg width="100%" height="400" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="150" fill="white" />
          <g transform="translate(200,200)">
              <g id="pieChart">
              </g>
          </g>
      </svg>
    `

    const svg = container.querySelector('#pieChart')!
    // Initialize variables
    let startAngle = 0
    let endAngle

    // Loop through data to generate pie chart segments and labels
    for (let key in data) {
      const percentage = data[key].percent / 100
      endAngle = startAngle + percentage * 2 * Math.PI

      // Calculate segment middle angle
      const segmentMiddleAngle = startAngle + percentage * Math.PI

      // Calculate segment middle coordinates
      const segmentMiddleX = 150 * Math.cos(segmentMiddleAngle)
      const segmentMiddleY = 150 * Math.sin(segmentMiddleAngle)

      // Add pie chart segment
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute(
        'd',
        `M 0 0 L ${Math.cos(startAngle) * 150} ${Math.sin(startAngle) * 150} A 150 150 0 ${
          percentage > 0.5 ? 1 : 0
        } 1 ${Math.cos(endAngle) * 150} ${Math.sin(endAngle) * 150} Z`
      )
      path.setAttribute('fill', getRandomColor())
      svg.appendChild(path)

      // Add label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', String(segmentMiddleX * 1.2))
      label.setAttribute('y', String(segmentMiddleY * 1.2))
      label.setAttribute('font-size', '12')
      label.setAttribute('text-anchor', 'middle')
      label.textContent = data[key].sense
      svg.appendChild(label)

      // Add connecting line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', String(segmentMiddleX * 0.8))
      line.setAttribute('y1', String(segmentMiddleY * 0.8))
      line.setAttribute('x2', String(segmentMiddleX * 1.1))
      line.setAttribute('y2', String(segmentMiddleY * 1.1))
      line.setAttribute('stroke', 'var(--txt-color)')
      svg.appendChild(line)

      // Update start angle
      startAngle = endAngle
    }
  }
}

function getRandomColor(a = 0.6) {
  var r = Math.floor(Math.random() * 255)
  var g = Math.floor(Math.random() * 255)
  var b = Math.floor(Math.random() * 255)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}
