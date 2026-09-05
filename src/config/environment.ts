import * as dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  mongodbUri: string;
  dbName: string;
  jwtSecret: string;
  jwtIssuer: string;
  jwtExpirationMs: number;
  tlsCaFile?: string;
  isProduction: boolean;
}

export function getConfig(): AppConfig {
  const jwtSecret = process.env.JWT_SECRET || 'officyna-secret-key-change-in-production-min-256bits';
  const jwtIssuer = process.env.JWT_ISSUER || 'officyna-auth';
  const jwtExpirationMs = parseInt(process.env.JWT_EXPIRATION || '86400000', 10);
  const dbName = process.env.DB_NAME || 'officyna';
  const isProduction = process.env.NODE_ENV === 'production';

  let mongodbUri = process.env.MONGODB_URI || '';

  if (!mongodbUri) {
    const dbUser = process.env.DB_USERNAME || 'officynasoatdbuser';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbHost = process.env.DOCDB_ENDPOINT || 'localhost';
    const dbPort = process.env.DOCDB_PORT || '27017';
    const tls = process.env.DOCDB_TLS === 'true' || isProduction;

    if (dbPassword) {
      const encodedPassword = encodeURIComponent(dbPassword);
      const tlsParams = tls
        ? '?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false'
        : '';
      mongodbUri = `mongodb://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}${tlsParams}`;
    } else {
      mongodbUri = `mongodb://${dbHost}:${dbPort}/${dbName}`;
    }
  }

  return {
    mongodbUri,
    dbName,
    jwtSecret,
    jwtIssuer,
    jwtExpirationMs,
    tlsCaFile: process.env.DOCDB_TLS_CA_FILE,
    isProduction
  };
}
