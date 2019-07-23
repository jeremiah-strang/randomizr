import PouchDB from 'pouchdb';
const db = new PouchDB('filemetas');

//
export interface FileMeta {
  _id: string
  _rev?: string
  file?: string
  filename?: string
  tags?: string[]
  size?: number
  height?: number
  width?: number
  extension?: string
  dirname?: string
  birthtime?: string | Date
}

//
export const getFileMetas = async (): Promise<FileMeta[]> => {
  const result = await db.allDocs({include_docs: true, descending: true});
  if (result && result.rows) {
    return result.rows.map(row => row.doc);
  }
  return [];
}

//
export const getFileMeta = async (_id: string): Promise<FileMeta | null> => {
  try {
    const result = await db.get(_id);
    return result.doc;
  } catch (error) {}
  return Promise.resolve(null);
}

//
export const createFileMeta = async (fileMeta: FileMeta) => {
  const existing = await getFileMeta(fileMeta._id);
  if (existing) {
    await updateFileMeta(fileMeta);
  } else {
    await db.put(fileMeta);
  }
}

//
export const updateFileMeta = async (fileMeta: FileMeta) => {
  try {
    const existing = await db.get(fileMeta._id);
    await db.put({
      ...fileMeta,
      _rev: existing._rev,
    });
  } catch (error) {}
}
