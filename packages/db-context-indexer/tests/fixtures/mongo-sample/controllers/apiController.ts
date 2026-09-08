import { handleGetUser } from './userController.js';

export async function routeHandler(userId: string) {
  return await handleGetUser(userId);
}
