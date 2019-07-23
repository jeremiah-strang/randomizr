import { remote } from 'electron'
import fse from 'fs-extra'
import path from 'path'

const USER_DATA_DIR = remote.app.getPath('userData')

//
export interface UserSettings {
  imageDirnames: string[]
  numImageViews: number
}

//
export const defaultUserSettings = (): UserSettings => {
  return  {
    imageDirnames: [],
    numImageViews: 3,
  }
}

//
export const loadUserSettings = async (): Promise<UserSettings> => {
  const settingsFile = path.join(USER_DATA_DIR, 'image_settings.json')
  let settings: UserSettings | null = null
  if (fse.existsSync(settingsFile)) {
    try {
      const loaded = await fse.readJSON(settingsFile)
      if (loaded) {
        settings = defaultUserSettings()

        if (typeof loaded.imageDirnames === 'string') {
          settings.imageDirnames = loaded.imageDirnames.split(';')
        } else if (Array.isArray) {
          settings.imageDirnames = [...loaded.imageDirnames].filter(dirname => typeof dirname === 'string' && dirname.length > 0)
        }

        let numImageViews = parseInt(loaded.numImageViews)
        if (!isNaN(numImageViews) && numImageViews > 0) settings.numImageViews = numImageViews
      }
    } catch (error) {
      console.error(`Error loading image settings: ${error}`)
    }
  }

  if (!settings) {
    settings = defaultUserSettings()
    await saveUserSettings(settings)
  }

  console.log(settings)
  return settings as UserSettings
}

//
export const saveUserSettings = async (settings: UserSettings) => {
  const settingsFile = path.join(USER_DATA_DIR, 'image_settings.json')
  try {
    await fse.writeFile(settingsFile, JSON.stringify(settings, null, '  '))
  } catch (error) {
    console.error(`Error saving image settings: ${error}`)
    settings = defaultUserSettings()
  }
  return settings
}