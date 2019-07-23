import fse from 'fs-extra'
import path from 'path'
import { IMAGE_EXTENSIONS_SET, VIDEO_EXTENSIONS_SET } from '../constants'

//
export const getExtension = (filename: string): string => {
  let fname = filename || ''
  return fname.slice(fname.lastIndexOf('.'), fname.length).toLowerCase()
}

//
export const isDirectory = (file: string): boolean => {
  return fse.lstatSync(file).isDirectory()
}

// Returns a promise that resolves after a given number of milliseconds
export const wait = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), milliseconds)
  })
}

//
export const sortedDistinct = (arr: any[]) => {
  return Array.from(new Set(arr)).sort()
}

//
export const loadFiles = async (dirname: string, extensionsSet: Set<string>): Promise<string[]> => {
  let results: string[] = []
  for (let filename of await fse.readdir(dirname)) {
    const file = path.join(dirname, filename)
    const ext = getExtension(file)
    if (isDirectory(file)) {
      const nestedFiles = await loadFiles(file, extensionsSet)
      results = [...results, ...nestedFiles]
    } else if (extensionsSet.has(ext)) {
      results.push(file)
    }
  }
  return results
}

//
export const loadImages = async (dirname: string): Promise<string[]> => {
  return await loadFiles(dirname, IMAGE_EXTENSIONS_SET)
}

//
export const loadVideos = async (dirname: string): Promise<string[]> => {
  return await loadFiles(dirname, VIDEO_EXTENSIONS_SET)
}

//
export const loadImagesAndVideos = async (dirnames: string[]): Promise<string[]> => {
  const results: string[] = []
  const extensionsSet = new Set([...IMAGE_EXTENSIONS_SET, ...VIDEO_EXTENSIONS_SET])
  for (let dirname of dirnames) {
    try {
      const files = await loadFiles(dirname, extensionsSet)
      for (let file of files) results.push(file)
    } catch (error) {
      console.error(error)
    }
  }
  return results
}
