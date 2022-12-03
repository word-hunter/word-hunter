import { loadingImgDataUri } from '../assets/img'
import { createResource, createEffect, Switch, Match, onCleanup } from 'solid-js'
import { lookup } from './collins'
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

  const removeVideo = (e: SecurityPolicyViolationEvent) => {
    if (e.violatedDirective === 'frame-src') {
      if (e.blockedURI.startsWith('https://www.youtube.com')) {
        root.querySelector('#videos')?.remove()
      }
    }
  }

  document.addEventListener('securitypolicyviolation', removeVideo)
  onCleanup(() => document.removeEventListener('securitypolicyviolation', removeVideo))

  return (
    <div id="__word_def" ref={root!}>
      <Switch fallback={<Loading />}>
        <Match when={!def.loading && (def.error || !def())}>
          <div>😭 not found definition</div>
        </Match>
        <Match when={!def.loading && def()}>
          <div class="__dict_collins" innerHTML={def()}></div>
        </Match>
      </Switch>
    </div>
  )
}

function Loading() {
  return (
    <div class="__dict_loading">
      <img src={loadingImgDataUri} alt="loading" />
    </div>
  )
}
