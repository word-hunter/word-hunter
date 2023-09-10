import { WordMap } from '../constant'

const vowels = 'aeiou'.split('')
const consonants = 'bcdfghjklmnpqrstvwxyz'.split('')

export function getAllTenses(word: string, dict: WordMap, isNormal = false) {
  const w = isNormal ? word : findNormalTense(word, dict)
  let all = isNormal ? [] : [w]

  if (w.length < 3) return all

  if (w + 's' in dict) all.push(w + 's')

  if (w + 'es' in dict) all.push(w + 'es')

  if (w + 'ing' in dict) all.push(w + 'ing')

  if (w + 'ings' in dict) all.push(w + 'ings')

  if (w + 'ed' in dict) all.push(w + 'ed')

  if (w + 'er' in dict) all.push(w + 'er')

  if (w + 'est' in dict) all.push(w + 'est')

  if (w.endsWith('se')) {
    if (w + 'n' in dict) all.push(w + 'n')
  }

  if (w.endsWith('e') && w.length > 3) {
    all = all.concat(getAllTenses(w.slice(0, -1), dict, true))
  }

  if (w.endsWith('y')) {
    all = all.concat(getAllTenses(w.slice(0, -1) + 'i', dict, true))
  }

  if (w.endsWith('f')) {
    all = all.concat(getAllTenses(w.slice(0, -1) + 'ves', dict, true))
  }

  if (w.endsWith('fe')) {
    all = all.concat(getAllTenses(w.slice(0, -2) + 'ves', dict, true))
  }

  if (consonants.includes(w.at(-1)!) && vowels.includes(w.at(-2)!) && consonants.includes(w.at(-3)!)) {
    all = all.concat(getAllTenses(w + w.at(-1), dict, true))
  }

  return all
}

export function findNormalTense(word: string, dict: WordMap) {
  if (word.length < 3) return word

  if (word.endsWith('ves')) {
    const normal1 = word.replace(/ves$/, 'f')
    if (normal1 in dict) return findNormalTense(normal1, dict)

    const normal2 = word.replace(/ves$/, 'fe')
    if (normal2 in dict) return findNormalTense(normal2, dict)
  }

  if (word.endsWith('ies')) {
    const normal = word.replace(/ies$/, 'y')
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('ier')) {
    const normal = word.replace(/ier$/, 'y')
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('iest')) {
    const normal = word.replace(/iest$/, 'y')
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('ily')) {
    const normal = word.replace(/iest$/, 'y')
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('ied')) {
    const normal = word.replace(/ied$/, 'y')
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('ieth')) {
    const normal = word.replace(/ieth$/, 'y')
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('ly')) {
    const normal = word.replace(/ly$/, '')
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('es')) {
    const normal = word.slice(0, -2)
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('s')) {
    const normal = word.slice(0, -1)
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('sen')) {
    const normal = word.slice(0, -1)
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('ing')) {
    const normal = word.slice(0, -3)
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('ed')) {
    const normal2 = word.slice(0, -1)
    if (normal2 in dict) return findNormalTense(normal2, dict)

    const normal1 = word.slice(0, -2)
    if (normal1 in dict) return findNormalTense(normal1, dict)
  }

  if (word.endsWith('est')) {
    const normal = word.slice(0, -3)
    if (normal in dict) return findNormalTense(normal, dict)
  }

  if (word.endsWith('er')) {
    const normal = word.slice(0, -2)
    if (normal in dict) return findNormalTense(normal, dict)
  }

  const last = word.at(-1)!
  const last2 = word.at(-2)
  const last3 = word.at(-3)!

  if (last === last2 && vowels.includes(last) && consonants.includes(last3)) {
    const normal = word.slice(0, -1)
    if (normal in dict) return findNormalTense(normal, dict)
  }

  return word
}
