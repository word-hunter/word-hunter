import { ProtocolWithReturn } from 'webext-bridge'
import { Messages, WordContext } from './constant'

declare module 'webext-bridge' {
  export interface ProtocolMap {
    [Messages.set_known]: { word: string }
    [Messages.set_all_known]: { words: string[] }
    [Messages.set_unknown]: { word: string }
    [Messages.add_context]: { word: string; context: WordContext }
    [Messages.delete_context]: { word: string; context: WordContext }
    [Messages.app_available]: { app_available: boolean }
    [Messages.play_audio]: { audio: string | null; word?: string }
    [Messages.fetch_html]: ProtocolWithReturn<
      { url: string; isPreload?: boolean },
      string | { isError: boolean; message: string }
    >
    [Messages.ai_explain]: ProtocolWithReturn<{ word: string; text: string }, string>
  }
}
