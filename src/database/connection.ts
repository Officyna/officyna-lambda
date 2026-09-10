import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config/environment';
import { logError, logInfo } from '../utils/logger';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDatabase(): Promise<Db> {
  if (cachedDb && cachedClient) {
    logInfo('DATABASE_CONNECTION_REUSED');

    return cachedDb;
  }

  const config = getConfig();

  logInfo('DATABASE_CONNECTION_INITIALIZING', {
    database: config.dbName,
    production: config.isProduction
  });

  const options: MongoClientOptions = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10,
    minPoolSize: 1,
    authMechanism: 'SCRAM-SHA-1'
  };

  const possibleCertPaths = [
    config.tlsCaFile,
    path.join(__dirname, '..', 'certs', 'global-bundle.pem'),
    path.join(__dirname, '..', '..', 'certs', 'global-bundle.pem'),
    '/opt/certs/global-bundle.pem',
    path.join(process.cwd(), 'certs', 'global-bundle.pem')
  ].filter(Boolean) as string[];

  let certificatePath: string | undefined;

  for (const certPath of possibleCertPaths) {
    if (fs.existsSync(certPath)) {
      options.tlsCAFile = certPath;
      certificatePath = certPath;
      break;
    }
  }

  if (certificatePath) {
    logInfo('DATABASE_TLS_CERTIFICATE_FOUND', {
      certificateConfigured: true
    });
  } else if (config.isProduction) {
    logInfo('DATABASE_TLS_CERTIFICATE_NOT_FOUND', {
      certificateConfigured: false
    });
  }

  const client = new MongoClient(
      config.mongodbUri,
      options
  );

  const connectionStart = Date.now();

  try {
    logInfo('DATABASE_CONNECTION_STARTED');

    await client.connect();

    const connectionDurationMs =
        Date.now() - connectionStart;

    cachedClient = client;
    cachedDb = client.db(config.dbName);

    logInfo('DATABASE_CONNECTION_SUCCESS', {
      durationMs: connectionDurationMs,
      database: config.dbName
    });

    return cachedDb;
  } catch (error: unknown) {
    const connectionDurationMs =
        Date.now() - connectionStart;

    logError(
        'DATABASE_CONNECTION_ERROR',
        error,
        {
          durationMs: connectionDurationMs,
          database: config.dbName
        }
    );

    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (!cachedClient) {
    return;
  }

  try {
    logInfo('DATABASE_CONNECTION_CLOSING');

    await cachedClient.close();

    cachedClient = null;
    cachedDb = null;

    logInfo('DATABASE_CONNECTION_CLOSED');
  } catch (error: unknown) {
    logError(
        'DATABASE_CONNECTION_CLOSE_ERROR',
        error
    );

    throw error;
  }
}