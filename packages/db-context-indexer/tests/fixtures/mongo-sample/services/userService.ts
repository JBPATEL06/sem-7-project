import { db as myDb } from '../db.js';

export async function getUser(id: string) {
  return await myDb.collection('users').find({ id });
}

export async function getDynamicCollection(collName: string) {
  return await myDb.collection(collName).find({});
}
