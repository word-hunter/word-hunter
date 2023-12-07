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
    <div class="w-full h-full md:py-10 bg-[#ECEFF7] dark:bg-[#282828]">
      <div class="container max-w-lg mx-auto p-2 pr-[3px] grid gap-2 md:gap-8">
        <ColorsSetting />
        <CnTransSetting />
        <YoutubeSetting />
        <PronounceSetting />
        <DictsSetting />
        <OpenAISetting />
        <LevelSetting />
        <ControlSetting />
        <Backup />
      </div>
    </div>
  )
}
