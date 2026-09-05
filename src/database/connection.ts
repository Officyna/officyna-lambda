import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config/environment';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDatabase(): Promise<Db> {
  if (cachedDb && cachedClient) {
    return cachedDb;
  }

  const config = getConfig();
  const options: MongoClientOptions = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    maxPoolSize: 10,
    minPoolSize: 1,
    authMechanism: 'SCRAM-SHA-1'
  };

  // Check for AWS DocumentDB CA Certificate
  const possibleCertPaths = [
    config.tlsCaFile,
    path.join(__dirname, '..', 'certs', 'global-bundle.pem'),
    path.join(__dirname, '..', '..', 'certs', 'global-bundle.pem'),
    '/opt/certs/global-bundle.pem',
    path.join(process.cwd(), 'certs', 'global-bundle.pem')
  ].filter(Boolean) as string[];

  for (const certPath of possibleCertPaths) {
    if (fs.existsSync(certPath)) {
      options.tlsCAFile = certPath;
      break;
    }
  }

  const client = new MongoClient(config.mongodbUri, options);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db(config.dbName);

  return cachedDb;
}

export async function closeDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
