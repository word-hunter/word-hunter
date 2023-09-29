import { ContextMap, StorageKey } from '../constant'
import { createSignal, For } from 'solid-js'
import { getLocalValue, KnownsLogs } from '../lib/storage'
import { settings } from '../lib/settings'

export const App = () => {
  const [kLogs, setLogs] = createSignal<KnownsLogs>([])
  const [contexts, setContexts] = createSignal<ContextMap>({})

  getLocalValue(StorageKey.local_knowns_log).then(logs => {
    if (logs) {
      setLogs(logs)
    }
  })

  getLocalValue(StorageKey.context).then(contexts => {
    setContexts(contexts ?? {})
  })

  chrome.storage.onChanged.addListener(
    (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local') {
        if (changes[StorageKey.local_knowns_log]) {
          setLogs(changes[StorageKey.local_knowns_log].newValue)
        }
        if (changes[StorageKey.context]) {
          setContexts(changes[StorageKey.context].newValue ?? {})
        }
      }
    }
  )

  const logsGroupByDays = () => {
    const cLogs = Object.entries(contexts())
      .filter(([_, context]) => context.length > 0)
      .map(([word, context]) => [word, context.at(-1)?.timestamp, true]) as unknown as KnownsLogs

    const groups = kLogs()
      .concat(cLogs)
      .sort((a, b) => {
        return new Date(b[1]).getTime() - new Date(a[1]).getTime()
      })
      .reduce((acc, log) => {
        const date = new Date(log[1])
        const day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        if (acc[day]) {
          acc[day].push(log)
        } else {
          acc[day] = [log]
        }
        return acc
      }, {} as { [key: string]: KnownsLogs })

    return Object.entries(groups).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime()
    })
  }

  return (
    <div class="w-full h-full">
      <h1 class="font-extrabold text-xl sm:text-2xl pt-10 text-center text-neutral-content">Daily Logs</h1>
      <div class="container max-w-lg mx-auto p-4 grid gap-10 font-serif">
        <For each={logsGroupByDays()}>
          {group => (
            <div class="flex flex-col gap-4 text-center">
              <div class="divider font-bold text-lg text-accent">{group[0]}</div>
              <For each={group[1]}>
                {log => (
                  <div class="text-center">
                    <span
                      class="inline-block w-1 h-1 mr-1.5 rounded-full bg-[]"
                      style={`background:  ${settings().colors[(log as any)[2] ? 1 : 0]}`}
                    ></span>
                    {log[0]}
                  </div>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
