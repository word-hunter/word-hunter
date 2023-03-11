import { createResource, createEffect, Switch, Match, onCleanup, onMount } from 'solid-js'
import { Adapter } from './adapters'

type Props = {
  word: string
  contextText?: string
  dictAdapter: Adapter
  onSettle: () => void
}

export function Dict(props: Props) {
  const { dictAdapter } = props

  const [def] = createResource(() => {
    return { word: props.word, text: props.contextText }
  }, dictAdapter.lookup.bind(dictAdapter))

  let root: HTMLDivElement

  createEffect(() => {
    if (!def.loading) {
      props.onSettle()
      root?.scrollTo(0, 0)
    }
  })

  const cspHandler = (e: SecurityPolicyViolationEvent) => {
    dictAdapter.cspViolationHandler?.(e, root)
  }

  document.addEventListener('securitypolicyviolation', cspHandler)
  onCleanup(() => document.removeEventListener('securitypolicyviolation', cspHandler))

  onMount(() => {
    dictAdapter.bindRootClickEvent?.(root)
  })

  onCleanup(() => {
    dictAdapter.unbindRootClickEvent?.()
  })

  return (
    <div id="word_dict" ref={root!}>
      <Switch fallback={<Loading />}>
        <Match when={!def.loading && (def.error || !def())}>
          <div class="no_result">
            <img src={chrome.runtime.getURL('icons/robot.png')} alt="no definition" />
            not found definition
          </div>
        </Match>
        <Match when={!def.loading && def()}>
          <div class="__dict_container" innerHTML={def()}></div>
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
