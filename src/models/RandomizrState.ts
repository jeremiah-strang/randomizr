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
export const createRandomizrState = async (state: RandomizrState) => {
  let existing: RandomizrState | null = null
  if (!state._id) state._id = uuid()
  else {
    existing = await getRandomizrState(state._id)
  }
  if (existing) {
    await updateRandomizrState(state)
  } else {
    await db.put(state)
  }
}

//
export const updateRandomizrState = async (state: RandomizrState) => {
  try {
    const existing = await db.get(state._id)
    await db.put({
      ...state,
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
