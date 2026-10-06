import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  var _postgresPool: Pool | undefined;
  var _sqlUnavailableUntil: number | undefined;
}

export const isSqlConfigured = Boolean(
  process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME
);

export const isSqlAvailable = () => {
  if (!isSqlConfigured) return false;
  if (global._sqlUnavailableUntil && Date.now() < global._sqlUnavailableUntil) {
    return false;
  }
  return true;
};

export const markSqlUnavailable = () => {
  global._sqlUnavailableUntil = Date.now() + 30000; // cooldown 30s
};

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      ssl: false,
      max: 10,
      connectionTimeoutMillis: 10000,
      query_timeout: 10000,
      statement_timeout: 10000,
    });

    global._postgresPool.on('error', () => {
      markSqlUnavailable();
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
