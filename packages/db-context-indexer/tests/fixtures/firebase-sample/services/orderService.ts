import { firestore as db } from '../firebase.js';

export async function getOrders() {
  return await db.collection('orders').get();
}

export async function getDynamicDoc(docPath: string) {
  return await db.doc(docPath).get();
}
