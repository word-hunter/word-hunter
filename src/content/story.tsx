import './index.less'
import { createSignal, Show } from 'solid-js'
import { Messages } from '../constant'
import { sendMessage } from '../utils/port'

const [loading, setLoading] = createSignal(false)
const [visible, setVisible] = createSignal(false)
const [storyText, setStoryText] = createSignal('')

export function Story() {
  return (
    <Show when={visible()}>
      <div class="wh-story">
        <div class="toolbar">
          <Show when={!loading()}>
            <img
              src={chrome.runtime.getURL('icons/synchronize.png')}
              alt="refresh"
              title="refresh"
              tabIndex="0"
              role="button"
              onclick={() => {
                createGPTStory(true)
              }}
            />
          </Show>
          <img
            src={chrome.runtime.getURL('icons/cancel.png')}
            alt="close"
            title="fold"
            tabIndex="0"
            role="button"
            onclick={() => {
              setVisible(false)
            }}
          />
        </div>
        <Show when={!loading()} fallback={<Loading />}>
          <div innerHTML={storyText()}></div>
        </Show>
      </div>
    </Show>
  )
}

function Loading() {
  return (
    <div class="loading">
      <img src={chrome.runtime.getURL('/book.svg')} alt="loading" />
    </div>
  )
}

async function createGPTStory(refresh?: boolean) {
  console.log('create story...')
  setVisible(true)
  if (!storyText() || refresh) {
    setLoading(true)
    const msg = await sendMessage(Messages.create_story, {})
    setLoading(false)
    const story = (msg[Messages.create_story] as string) || ''
    setStoryText(story.replace(/\n\nTitle: (.*)\n\n/, '<h3><<$1>></h3>'))
  }
}

// this function expose to be called in popup page
window.__createGPTStory = createGPTStory
