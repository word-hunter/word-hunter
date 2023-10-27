import { For, JSXElement, createSignal } from 'solid-js'
import { settings, setSetting, DictName } from '../lib'
import { Note } from './note'
import {
  useDragDropContext,
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createSortable,
  closestCenter
} from '@thisbeyond/solid-dnd'
import type { DragEventHandler } from '@thisbeyond/solid-dnd'

export const DictsSetting = () => {
  const onInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newDicts = { ...settings()['dictTabs'], [target.value]: target.checked }
    setSetting('dictTabs', newDicts)
  }

  const [activeItem, setActiveItem] = createSignal<DictName | null>(null)
  const ids = () => settings().dictOrder
  const onDragStart: DragEventHandler = ({ draggable }) => setActiveItem(draggable.id as DictName)
  const onDragEnd: DragEventHandler = ({ draggable, droppable }) => {
    if (draggable && droppable) {
      const currentItems = ids()
      const fromIndex = currentItems.indexOf(draggable.id as DictName)
      const toIndex = currentItems.indexOf(droppable.id as DictName)
      if (fromIndex !== toIndex) {
        const updatedItems = currentItems.slice()
        updatedItems.splice(toIndex, 0, ...updatedItems.splice(fromIndex, 1))
        setSetting('dictOrder', updatedItems)
      }
    }
  }

  return (
    <section class="section">
      <h2 class="h2">
        Dicts<Note>You can drag & drop to adjust the order</Note>
      </h2>
      <div class="flex flex-col items-end">
        <DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd} collisionDetector={closestCenter}>
          <DragDropSensors />
          <div class="column self-stretch">
            <SortableProvider ids={ids()}>
              <For each={settings().dictOrder}>
                {item => {
                  return (
                    <Sortable item={item}>
                      <label for={item} class="label cursor-pointer gap-4 max-w-fit">
                        <span class="text-xs"> {item}</span>
                        <input
                          type="checkbox"
                          class="toggle dark:toggle-info toggle-sm"
                          name="dicts"
                          id={item}
                          value={item}
                          checked={settings().dictTabs[item]}
                          oninput={onInput}
                        />
                      </label>
                    </Sortable>
                  )
                }}
              </For>
            </SortableProvider>
          </div>
          <DragOverlay>
            <div class="sortable flex justify-end text-cyan-400 pr-16 font-serif">{activeItem()}</div>
          </DragOverlay>
        </DragDropProvider>
      </div>
    </section>
  )
}

declare module 'solid-js' {
  namespace JSX {
    interface Directives {
      sortable: boolean
    }
  }
}

const Sortable = (props: { item: DictName; children: JSXElement }) => {
  const sortable = createSortable(props.item)
  const [state] = useDragDropContext()!
  return (
    <div
      use:sortable
      class="sortable flex justify-end"
      classList={{
        'opacity-25': sortable.isActiveDraggable,
        'transition-transform': !!state.active.draggable
      }}
    >
      {props.children}
    </div>
  )
}
