import { Backup } from './backup'
import { DictsSetting } from './dicts'
import { OpenAISetting } from './openai'
import { PronounceSetting } from './pronounce'
import { YoutubeSetting } from './youtube'
import { LevelSetting } from './levels'
import { CnTransSetting } from './cnTrans'
import { ControlSetting } from './control'
import { ColorsSetting } from './colors'

export const App = () => {
  return (
    <div class="w-full h-full bg-base-300">
      <div class="container max-w-lg mx-auto p-4 py-10 grid gap-8 font-serif">
        <h1 class="font-extrabold text-xl sm:text-2xl text-center text-base-content">Settings</h1>
        <ColorsSetting />
        <CnTransSetting />
        <YoutubeSetting />
        <PronounceSetting />
        <DictsSetting />
        <LevelSetting />
        <ControlSetting />
        <OpenAISetting />
        <Backup />
      </div>
    </div>
  )
}
