import { ContextMap, StorageKey, WordContext } from '../constant'
import { Accessor, createEffect, createSignal, For, Setter, Show } from 'solid-js'
import { createStore } from 'solid-js/store'
import { getLocalValue } from '../lib/storage'
import { createDraggable } from '@neodrag/solid'
import { getFaviconByDomain, getRelativeTimeString, formatTime } from '../lib/utils'

type Video = { title: string; url: string; thumb: string; sentence: string; current: boolean }

export const App = () => {
  const [contexts, setContexts] = createSignal<ContextMap>({})
  const [isDesc, setIsDesc] = createSignal<boolean>(localStorage.getItem('isDesc') !== '0')
  const [random, setRandom] = createSignal<number>(0)
  const [page, setPage] = createSignal<number>(1)
  const [youtubeOnly, setYoutubeOnly] = createSignal<boolean>(localStorage.getItem('youtubeOnly') === '1')

  const [showVideoWindow, setShowVideoWindow] = createSignal<boolean>(false)
  const [videoSrc, setVideoSrc] = createSignal<string>('')
  const [videosMap, setVideosMap] = createStore<Record<string, { loading: boolean; videos: Video[] }>>({})

  const [isSessionRunning, setIsSessionRunning] = createSignal<boolean>(false)
  const [aiSession, setAiSession] = createSignal<AITextSession>()

  createEffect(() => {
    if (!window.ai) return false
    window.ai.canCreateTextSession().then(async status => {
      if (status === 'readily') {
        const session = await window.ai.createTextSession()
        setAiSession(session)
      }
    })
  })

  getLocalValue(StorageKey.context).then(contexts => {
    // delete legacy log data
    chrome.storage.local.remove('local_knowns_log')
    setContexts(contexts ?? {})
    document.title = `Review (${Object.keys(contexts ?? {}).length}) Words`
  })

  const filteredContexts = () => {
    if (youtubeOnly()) {
      return Object.values(contexts())
        .map(contexts => contexts.filter(context => context.url.startsWith('https://www.youtube.com/watch')))
        .filter(contexts => contexts.length > 0)
    }
    return Object.values(contexts())
  }

  const sortedContexts = () => {
    if (random() !== 0) {
      return filteredContexts().sort(() => Math.random() - 0.5)
    }
    return filteredContexts().sort(
      (a, b) => (isDesc() ? -1 : 1) * (a[a.length - 1].timestamp - b[b.length - 1].timestamp)
    )
  }

  const shuffle = () => {
    setRandom(Math.random())
    setPage(1)
  }

  const setDesc = (desc: boolean) => {
    setRandom(0)
    setIsDesc(desc)
    localStorage.setItem('isDesc', desc ? '1' : '0')
    setPage(1)
  }

  const onLinkClick = (e: MouseEvent, context: WordContext) => {
    if (context.url.startsWith('https://www.youtube.com/watch')) {
      const videoSrc = getEmbedYoutubeUrl(context.url)
      setVideoSrc(videoSrc)
      setShowVideoWindow(true)
      e.preventDefault()
      return false
    }
  }

  const showVideoList = async (word: string) => {
    if (!videosMap[word]) {
      setVideosMap(word, { loading: true, videos: [] })
      const videos = await getFilmotVideos(word).catch(() => [])
      setVideosMap(word, { loading: false, videos })
    }
  }

  const makeSentenceByAI = async (el: HTMLElement, context: WordContext) => {
    let block = el.closest('blockquote')
    try {
      block?.classList.add('loading-stripes')
      if (isSessionRunning()) {
        await aiSession()?.destroy()
        const session = await window.ai.createTextSession()
        setAiSession(session)
      }
      const p = block?.querySelector('p')!
      setIsSessionRunning(true)
      const stream = await aiSession()!.promptStreaming(`Make a simple sentence with the word ${context.word}.`)
      for await (const chunk of stream) {
        p.textContent = chunk
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      block?.classList.remove('loading-stripes')
      setIsSessionRunning(false)
    }
  }

  chrome.storage.onChanged.addListener(
    (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local') {
        if (changes[StorageKey.context]) {
          setContexts(changes[StorageKey.context].newValue ?? {})
        }
      }
    }
  )

  return (
    <div class="bg-[#ECEFF7] dark:bg-[#282828] font-sans">
      <div class="rounded-xl pb-10">
        <div class="container mx-auto p-4 grid gap-5">
          <div class="py-4 flex justify-end items-center gap-10">
            <label class="flex items-center gap-2 text-lg">
              <input
                id="only_youtube"
                type="checkbox"
                checked={youtubeOnly()}
                class="checkbox"
                oninput={e => {
                  setYoutubeOnly(e.target.checked)
                  localStorage.setItem('youtubeOnly', e.target.checked ? '1' : '0')
                }}
              />
              <span>Youtube</span>
            </label>
            <div class="flex space-x-4">
              <button class="btn" onclick={() => setDesc(!isDesc())}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  classList={{ 'rotate-180 ': !isDesc() }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button class="btn" onclick={shuffle}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 9v-3c-1 0-3.308-.188-4.506 2.216l-4.218 8.461c-1.015 2.036-3.094 3.323-5.37 3.323h-3.906v-2h3.906c1.517 0 2.903-.858 3.58-2.216l4.218-8.461c1.356-2.721 3.674-3.323 6.296-3.323v-3l6 4-6 4zm-9.463 1.324l1.117-2.242c-1.235-2.479-2.899-4.082-5.748-4.082h-3.906v2h3.906c2.872 0 3.644 2.343 4.631 4.324zm15.463 8.676l-6-4v3c-3.78 0-4.019-1.238-5.556-4.322l-1.118 2.241c1.021 2.049 2.1 4.081 6.674 4.081v3l6-4z" />
                </svg>
              </button>
            </div>
          </div>

          <For each={sortedContexts()}>
            {contexts => {
              const word = contexts[0].word
              const curVideo = () => videosMap[word]?.videos.find(v => v.current)
              return (
                <div class="group card bg-white dark:bg-[#3C3C3C] shadow-xs font-serif">
                  <div class="card-body">
                    <h2 class="card-title">
                      {word}{' '}
                      <button
                        class="group/btn inline-block"
                        classList={{ 'animate-spin': videosMap[word]?.loading }}
                        onclick={() => showVideoList(word)}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="2" fill="none" />
                          <polygon points="9,6 18,12 9,18" fill="currentColor" />
                        </svg>
                      </button>
                    </h2>
                    <Show when={videosMap[word]?.videos?.length > 0}>
                      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        <For each={videosMap[word]?.videos}>
                          {video => {
                            return (
                              <div class="mt-2">
                                <div
                                  class="aspect-video cursor-pointer"
                                  role="button"
                                  onclick={() => {
                                    setVideoSrc(video.url)
                                    setVideosMap(word, {
                                      loading: false,
                                      videos:
                                        videosMap[word]?.videos.map(v => ({ ...v, current: v.url === video.url })) ?? []
                                    })
                                    setShowVideoWindow(true)
                                  }}
                                >
                                  <img src={video.thumb} class="w-full aspect-video object-cover rounded-md" />
                                </div>
                                <div class="mt-2">
                                  <a
                                    href={video.url}
                                    target="_blank"
                                    class="line-clamp-2 text-sm text-blue-500 dark:text-blue-200 hover:underline"
                                  >
                                    {video.title}
                                  </a>
                                </div>
                              </div>
                            )
                          }}
                        </For>
                      </div>
                      <Show when={!!curVideo()}>
                        <div>
                          <blockquote class="relative flex flex-row items-center p-4 pr-10 pb-3 my-4 bg-gray-50 border-l-4 border-gray-300 dark:border-gray-500 dark:bg-gray-800">
                            <p class="text-lg font-medium leading-relaxed text-gray-600 dark:text-white">
                              {curVideo()?.sentence ?? ''}
                            </p>
                          </blockquote>
                        </div>
                      </Show>
                    </Show>

                    <For each={contexts.reverse()}>
                      {(context, i) => (
                        <div>
                          {i() !== 0 && <div class="divider my-0"></div>}
                          <blockquote class="relative flex flex-row items-center p-4 pr-10 pb-3 my-4 bg-gray-50 border-l-4 border-gray-300 dark:border-gray-500 dark:bg-gray-800">
                            <p class="text-lg font-medium leading-relaxed text-gray-600 dark:text-white">
                              {context.text}
                            </p>
                            <Show when={!!aiSession()}>
                              <button
                                class="absolute right-3 hidden group-hover:block hover:text-red-500"
                                title="Make sentence by AI"
                                onclick={e => makeSentenceByAI(e.target as HTMLElement, context)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  width="24"
                                  height="24"
                                  color=""
                                  fill="none"
                                >
                                  <path
                                    d="M19 16V14C19 11.1716 19 9.75736 18.1213 8.87868C17.2426 8 15.8284 8 13 8H11C8.17157 8 6.75736 8 5.87868 8.87868C5 9.75736 5 11.1716 5 14V16C5 18.8284 5 20.2426 5.87868 21.1213C6.75736 22 8.17157 22 11 22H13C15.8284 22 17.2426 22 18.1213 21.1213C19 20.2426 19 18.8284 19 16Z"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linejoin="round"
                                  />
                                  <path
                                    d="M19 18C20.4142 18 21.1213 18 21.5607 17.5607C22 17.1213 22 16.4142 22 15C22 13.5858 22 12.8787 21.5607 12.4393C21.1213 12 20.4142 12 19 12"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linejoin="round"
                                  />
                                  <path
                                    d="M5 18C3.58579 18 2.87868 18 2.43934 17.5607C2 17.1213 2 16.4142 2 15C2 13.5858 2 12.8787 2.43934 12.4393C2.87868 12 3.58579 12 5 12"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linejoin="round"
                                  />
                                  <path
                                    d="M13.5 3.5C13.5 4.32843 12.8284 5 12 5C11.1716 5 10.5 4.32843 10.5 3.5C10.5 2.67157 11.1716 2 12 2C12.8284 2 13.5 2.67157 13.5 3.5Z"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                  />
                                  <path
                                    d="M12 5V8"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  />
                                  <path
                                    d="M9 13V14"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  />
                                  <path
                                    d="M15 13V14"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  />
                                  <path
                                    d="M10 17.5C10 17.5 10.6667 18 12 18C13.3333 18 14 17.5 14 17.5"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                  />
                                </svg>
                              </button>
                            </Show>
                          </blockquote>
                          <div class="flex flex-row flex-wrap items-center justify-end gap-2 text-gray-400 font-sans">
                            <a
                              class="flex flex-row flex-wrap gap-2 items-center hover:underline"
                              href={context.url}
                              target="_blank"
                              onclick={e => onLinkClick(e, context)}
                            >
                              <img src={context.favicon || getFaviconByDomain(context.url)} class="w-4 h-4" />
                              <span class="block max-w-[80vw] md:max-w-96 truncate text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                {context.title}
                              </span>
                            </a>
                            |
                            <i class="tooltip" data-tip={formatTime(context.timestamp)}>
                              ({getRelativeTimeString(context.timestamp, Date.now())})
                            </i>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )
            }}
          </For>
        </div>
      </div>

      <Show when={showVideoWindow()}>
        <PlayerWindow videoSrc={videoSrc} setVideoSrc={setVideoSrc} setShowVideoWindow={setShowVideoWindow} />
      </Show>
    </div>
  )
}

function PlayerWindow(props: {
  videoSrc: Accessor<string>
  setVideoSrc: Setter<string>
  setShowVideoWindow: Setter<boolean>
}) {
  const [miniWindow, setMiniWindow] = createSignal<boolean>(false)
  const { draggable } = createDraggable() // do not remove this line
  let dragDefaultPosition = JSON.parse(localStorage.getItem('dragPosition') ?? '{ "x": 0, "y": 0 }')

  const onDragStart = () => {
    // TODO:
  }

  const onDragEnd = ({ offsetX, offsetY }: { offsetX: number; offsetY: number }) => {
    dragDefaultPosition = { x: offsetX, y: offsetY }
    localStorage.setItem('dragPosition', JSON.stringify(dragDefaultPosition))
  }

  const setFullScrren = () => {
    var iframe = document.getElementById('youtube-player') as HTMLIFrameElement
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen()
      iframe.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
    }
  }

  return (
    <div
      use:draggable={{
        bounds: 'parent',
        legacyTranslate: false,
        onDragStart: onDragStart,
        onDragEnd: onDragEnd,
        defaultPosition: dragDefaultPosition
      }}
      class={`border bg-gray-300 dark:bg-gray-800 shadow-lg fixed right-[1vw] bottom-[50%] translate-y-[50%]  max-w-[800px] rounded-2xl`}
      classList={{
        'w-[96vw]': !miniWindow(),
        'w-96': miniWindow()
      }}
    >
      <div class="flex space-x-2 p-2 cursor-move">
        <div
          class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center cursor-pointer"
          role="button"
          onclick={() => {
            props.setShowVideoWindow(false)
            props.setVideoSrc('')
          }}
        >
          <div class="hover:bg-red-700 w-2 h-2 rounded-full bg-red-500"></div>
        </div>
        <div
          class="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center cursor-pointer"
          role="button"
          onclick={() => {
            setMiniWindow(!miniWindow())
          }}
        >
          <div class="hover:bg-yellow-700 w-2 h-2 rounded-full bg-yellow-500"></div>
        </div>
        <div
          class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center cursor-pointer"
          onclick={setFullScrren}
        >
          <div class="hover:bg-green-700 w-2 h-2 rounded-full bg-green-500"></div>
        </div>
      </div>
      <iframe
        id="youtube-player"
        class="aspect-video loading-stripes"
        width="100%"
        src={props.videoSrc()}
        title="Phrasal Verbs to hang out with friends"
        // @ts-ignore
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      />
    </div>
  )
}

function getEmbedYoutubeUrl(urlString: string) {
  const url = new URL(urlString)
  if (url.host === 'www.youtube.com') {
    if (url.pathname === '/watch') {
      const videoId = url.searchParams.get('v')
      const timeStart = url.searchParams.get('t')?.replace('s', '') ?? '0'
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${timeStart}&cc_load_policy=1&cc_lang_pref=en&origin=http://filmot.com`
    }
  }
  return urlString
}

async function getFilmotVideos(word: string): Promise<Video[]> {
  if (!word) return []
  const url = `https://filmot.com/search/${word}/1?category=18&lang=en&searchManualSubs=1&country=217&sortField=likecount&sortOrder=desc&gridView=1`
  const res = await fetch(url)
  const html = await res.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const videos = doc.querySelectorAll('.col-screen')
  return [...videos].slice(0, 8).map(v => {
    const link = v.querySelector('a[href^="https://www.youtube.com/watch?v="]')
    const title = link?.nextSibling?.nodeValue ?? ''
    const url = getEmbedYoutubeUrl(link?.getAttribute('href') ?? '')
    const thumb = v.querySelector('.vthumb')?.getAttribute('src') ?? ''
    const sentence = v.querySelector('.scroll-box')?.textContent ?? ''
    return { title, url, thumb, sentence, current: false }
  })
}
