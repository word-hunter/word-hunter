import { loadingImgDataUri } from '../assets/img'
import { createResource, Show, For, createDeferred, createSignal, createRenderEffect } from 'solid-js'
import { lookup, pronunciationGuideUrl, cefrLabelGuideUrl } from './collins'
import { emphasizeWordInText } from '../utils'

export function Dict(props: { word: string; onSettle: () => void }) {
  const [def] = createResource(() => props.word, lookup)

  createRenderEffect(() => {
    if (!def.loading) {
      props.onSettle()
    }
  })

  return (
    <div id="__word_def">
      <Show when={def.error}>
        <div>😭 not found definition</div>
      </Show>
      <Show when={!def.loading} fallback={<Loading />}>
        <div class="__dict_collins">
          <div class="__title">
            <div class="__prons">
              <For each={def()?.pronounciations}>
                {pron => (
                  <div>
                    <span data-src-mp3={pron.audio}>
                      <span innerHTML={'/' + pron.text + '/'}></span>
                      <Show when={pron.audio}>
                        <a data-src-mp3={pron.audio}> 🔈</a>
                      </Show>
                      <a href={pronunciationGuideUrl} target="_blank">
                        {' ⓘ'}
                      </a>
                    </span>
                  </div>
                )}
              </For>
            </div>
            <span class="__frequency" title={`Word Frequency {frequency}`}>
              <For each={new Array(def()?.frequency ?? 0).fill(0)}>{_ => <i></i>}</For>
            </span>
          </div>
          <Show when={def()?.note}>
            <div class="__note" innerHTML={def()?.note}></div>
          </Show>
          <div class="__definitions">
            <For each={def()?.definitions}>
              {(explain, i) => (
                <div class="__definition">
                  <div>
                    <span>{i() + 1}.</span>
                    <span>{explain.type || (explain.isSense ? 'sence' : '')}</span>
                    <Show when={explain.cefrLevel}>
                      <a target="_blank" href={cefrLabelGuideUrl}>
                        {explain.cefrLevel}
                      </a>
                    </Show>
                  </div>
                  <div
                    class="__def_text"
                    innerHTML={explain.isSense ? explain.defText : emphasizeWordInText(explain.defText, props.word)}
                  ></div>
                  <div>
                    <For each={explain.examples}>
                      {ex => (
                        <div class="__example">
                          <div
                            innerHTML={`${emphasizeWordInText(ex.text, props.word)} ${
                              ex.audio ? `<a data-src-mp3="${ex.audio}"> 🔈</a>` : ''
                            }`}
                          ></div>
                        </div>
                      )}
                    </For>
                  </div>
                  <Show when={explain.synonyms.length > 0}>
                    <div class="__synonyms">
                      Synonyms:
                      <For each={explain.synonyms}>{syn => <a data-href={syn.url}>{syn.text}</a>}</For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
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
