import { StorageKey } from '../constant'
import { createSignal, For } from 'solid-js'
import { getLocalValue, KnownsLogs } from '../lib/storage'

export const App = () => {
  const [logs, setLogs] = createSignal<KnownsLogs>([])

  getLocalValue(StorageKey.local_knowns_log).then(logs => {
    if (logs) {
      setLogs(logs)
    }
  })

  chrome.storage.onChanged.addListener(
    (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes[StorageKey.local_knowns_log]) {
        setLogs(changes[StorageKey.local_knowns_log].newValue)
      }
    }
  )

  const logsGroupByDays = () => {
    const groups = logs()
      .reverse()
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
      <h1 class="font-extrabold text-xl sm:text-2xl pt-10 text-center text-neutral-content">Known Logs</h1>
      <div class="container max-w-lg mx-auto p-4 grid gap-10 font-serif">
        <For each={logsGroupByDays()}>
          {group => (
            <div class="flex flex-col gap-4 text-center">
              <div class="divider font-bold text-lg text-accent">{group[0]}</div>
              <For each={group[1]}>{log => <div class="flex flex-col gap-2 text-base-content">{log[0]}</div>}</For>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
