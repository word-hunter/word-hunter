import { Backup } from './backup'
import { DictsSetting } from './dicts'
import { OpenAISetting } from './openai'
import { PronounceSetting } from './pronounce'
import { YoutubeSetting } from './youtube'
import { LevelSetting } from './levels'

export const App = () => {
  return (
    <div class="container max-w-lg mx-auto p-4 my-10 grid gap-10 font-serif">
      <h1 class="font-extrabold text-2xl text-center">Settings</h1>
      <Backup />
      <DictsSetting />
      <LevelSetting />
      <PronounceSetting />
      <YoutubeSetting />
      <OpenAISetting />
    </div>
  )
}
