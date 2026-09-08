import { pool as mysqlPool } from '../mysql.js';

export async function getLogs() {
  return await mysqlPool.query('SELECT * FROM logs WHERE level = "info"');
}

export async function getReport() {
  return await mysqlPool.query('SELECT * FROM users JOIN orders ON users.id = orders.user_id');
}

export async function runDynamicQuery(sqlQuery: string) {
  return await mysqlPool.query(sqlQuery);
}
