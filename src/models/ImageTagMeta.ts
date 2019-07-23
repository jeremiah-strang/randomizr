import PouchDB from 'pouchdb'
const db = new PouchDB('imagetagmetas')

//
export interface ImageTagMeta {
  _id: string
  _rev?: string
  favorite?: boolean
  secret?: boolean
  impliesTags?: string[]
}

//
export const getImageTagMetas = async (): Promise<ImageTagMeta[]> => {
  const result = await db.allDocs({include_docs: true, descending: true})
  if (result && result.rows) {
    return result.rows.map(row => row.doc)
  }
  return []
}

//
export const getImageTagMeta = async (_id: string): Promise<ImageTagMeta | null> => {
  try {
    const result = await db.get(_id)
    return result.doc
  } catch (error) {}
  return Promise.resolve(null)
}

//
export const createImageTagMeta = async (tagMeta: ImageTagMeta) => {
  const existing = await getImageTagMeta(tagMeta._id)
  if (existing) {
    await updateImageTagMeta(tagMeta)
  } else {
    await db.put(tagMeta)
  }
}

//
export const updateImageTagMeta = async (tagMeta: ImageTagMeta) => {
  try {
    const existing = await db.get(tagMeta._id)
    await db.put({
      ...tagMeta,
      _rev: existing._rev,
    })
  } catch (error) {
    console.error(error)
  }
}

//
export const removeImageTagMeta = async (_id: string) => {
  try {
    const existing = await db.get(_id)
    if (existing) await db.remove(existing)
  } catch (error) {
    console.error(error)
  }
}
