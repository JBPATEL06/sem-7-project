import { getUser } from '../services/userService.js';

export async function handleGetUser(id: string) {
  return await getUser(id);
}
