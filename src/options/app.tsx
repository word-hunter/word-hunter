import { Backup } from './backup'
import { MaxHighlightSetting } from './maxHighlight'
import { DictsSetting } from './dicts'
import { OpenAISetting } from './openai'
import { PronounceSetting } from './pronounce'

export const App = () => {
  return (
    <div class="container max-w-lg mx-auto p-4 my-10 grid gap-10 font-serif">
      <h1 class="font-extrabold text-2xl text-center">Settings</h1>
      <Backup />
      <DictsSetting />
      <PronounceSetting />
      <MaxHighlightSetting />
      <OpenAISetting />
    </div>
  )
}
