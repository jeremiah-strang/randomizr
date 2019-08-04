import PouchDB from 'pouchdb'
import uuid from 'uuid/v4'
import { ImageViewProps } from './ImageViewProps'

const db = new PouchDB('imagerandomizrstates')

//
export interface RandomizrState {
  _id?: string
  _rev?: string
  name?: string
  imageViews?: ImageViewProps[]
  created?: Date
  createdStr?: string
}

//
export const getRandomizrStates = async (): Promise<RandomizrState[]> => {
  const result = await db.allDocs({include_docs: true, descending: true})
  if (result && result.rows) {
    return result.rows.map(row => row.doc)
  }
  return []
}

//
export const getRandomizrState = async (_id: string): Promise<RandomizrState | null> => {
  try {
    const result = await db.get(_id)
    return result.doc
  } catch (error) {}
  return Promise.resolve(null)
}

//
export const createRandomizrState = async (config: RandomizrState) => {
  let existing: RandomizrState | null = null
  if (!config._id) config._id = uuid()
  else {
    existing = await getRandomizrState(config._id)
  }
  if (existing) {
    await updateRandomizrState(config)
  } else {
    await db.put(config)
  }
}

//
export const updateRandomizrState = async (config: RandomizrState) => {
  try {
    const existing = await db.get(config._id)
    await db.put({
      ...config,
      _rev: existing._rev,
    })
  } catch (error) {
    console.error(error)
  }
}

//
export const removeRandomizrState = async (_id: string) => {
  try {
    const existing = await db.get(_id)
    if (existing) await db.remove(existing)
  } catch (error) {
    console.error(error)
  }
}
