import { getConfig } from '../src/config/environment';

describe('Environment Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use defaults when environment variables are unset', () => {
    delete process.env.MONGODB_URI;
    delete process.env.DB_PASSWORD;
    delete process.env.JWT_SECRET;

    const config = getConfig();
    expect(config.dbName).toBe('officyna');
    expect(config.jwtIssuer).toBe('officyna-auth');
    expect(config.jwtExpirationMs).toBe(86400000);
    expect(config.mongodbUri).toBe('mongodb://localhost:27017/officyna');
  });

  it('should construct URI with password and TLS parameters when configured', () => {
    process.env.DB_USERNAME = 'user1';
    process.env.DB_PASSWORD = 'password@123';
    process.env.DOCDB_ENDPOINT = 'docdb-host';
    process.env.DOCDB_PORT = '27017';
    process.env.DOCDB_TLS = 'true';

    const config = getConfig();
    expect(config.mongodbUri).toContain('mongodb://user1:password%40123@docdb-host:27017/officyna?tls=true');
  });

  it('should use explicit MONGODB_URI if provided', () => {
    process.env.MONGODB_URI = 'mongodb://custom-host:27017/my-db';
    const config = getConfig();
    expect(config.mongodbUri).toBe('mongodb://custom-host:27017/my-db');
  });
});
