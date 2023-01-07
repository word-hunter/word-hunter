import { createResource, createEffect, Switch, Match, onCleanup } from 'solid-js'
import { lookup, cspViolationHandler } from './collins'
export { getWordByHref } from './collins'

export function Dict(props: { word: string; onSettle: () => void }) {
  const [def] = createResource(() => props.word, lookup)
  let root: HTMLDivElement

  createEffect(() => {
    if (!def.loading) {
      props.onSettle()
      root?.scrollTo(0, 0)
    }
  })

  const cspHandler = (e: SecurityPolicyViolationEvent) => {
    cspViolationHandler(e, root)
  }

  document.addEventListener('securitypolicyviolation', cspHandler)
  onCleanup(() => document.removeEventListener('securitypolicyviolation', cspHandler))

  return (
    <div id="word_dict" ref={root!}>
      <Switch fallback={<Loading />}>
        <Match when={!def.loading && (def.error || !def())}>
          <div class="no_result">😭 not found definition</div>
        </Match>
        <Match when={!def.loading && def()}>
          <div class="__dict_collins" innerHTML={def()}></div>
        </Match>
      </Switch>
    </div>
  )
}

const loadingImg = chrome.runtime.getURL('/book.svg')

function Loading() {
  return (
    <div class="loading">
      <img src={loadingImg} alt="loading" />
    </div>
  )
}
