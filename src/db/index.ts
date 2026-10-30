import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  var _postgresPool: Pool | undefined;
  var _sqlUnavailableUntil: number | undefined;
}

const hasDatabaseUrl = Boolean((process.env.DATABASE_URL || '').trim());
const hasLegacySql = Boolean(
  process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_DB_NAME
);

export const isSqlConfigured = hasDatabaseUrl || hasLegacySql;

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

function resolveDatabaseUrlSslConfig(connectionString: string) {
  const sslEnv = (process.env.DATABASE_SSL || '').toLowerCase().trim();

  if (sslEnv === 'false' || sslEnv === 'disable') {
    return false;
  }

  const lowerUrl = connectionString.toLowerCase();
  if (
    !sslEnv &&
    (lowerUrl.includes('sslmode=disable') ||
      lowerUrl.includes('@localhost') ||
      lowerUrl.includes('@127.0.0.1'))
  ) {
    return false;
  }

  return {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
  };
}

function resolveLegacyPostgresSslConfig() {
  const host = (process.env.SQL_HOST || '').trim();
  const sslMode = (process.env.SQL_SSL || '').toLowerCase().trim();

  // Em sockets Unix do Cloud SQL Proxy (/cloudsql/...) ou loopback local sem TLS explícito
  if (
    sslMode === 'false' ||
    sslMode === 'disable' ||
    host.startsWith('/') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('169.254.')
  ) {
    return false;
  }

  // Em conexões TCP externas ou quando SQL_SSL=true, habilita TLS
  if (sslMode === 'true' || sslMode === 'require') {
    return {
      rejectUnauthorized: process.env.SQL_SSL_REJECT_UNAUTHORIZED !== 'false',
    };
  }

  return false;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString = (process.env.DATABASE_URL || '').trim();
    const maxConnections = Number(process.env.DATABASE_POOL_MAX || 5) || 5;

    global._postgresPool = connectionString
      ? new Pool({
          connectionString,
          max: maxConnections,
          ssl: resolveDatabaseUrlSslConfig(connectionString),
          options: '-c search_path=app,public',
          connectionTimeoutMillis: 10000,
          query_timeout: 10000,
          statement_timeout: 10000,
        })
      : new Pool({
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          ssl: resolveLegacyPostgresSslConfig(),
          max: Number(process.env.DATABASE_POOL_MAX || 10) || 10,
          options: '-c search_path=app,public',
          connectionTimeoutMillis: 10000,
          query_timeout: 10000,
          statement_timeout: 10000,
        });

    global._postgresPool.on('connect', (client) => {
      client.query('SET search_path TO app, public').catch(() => {});
    });

    global._postgresPool.on('error', () => {
      markSqlUnavailable();
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

