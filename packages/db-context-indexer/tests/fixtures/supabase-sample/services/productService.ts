import { supabase as client } from '../supabase.js';

export async function getProducts() {
  return await client.from('products').select('*');
}

export async function getDynamicTable(tbl: string) {
  return await client.from(tbl).select('*');
}
