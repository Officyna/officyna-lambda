import { getDatabase, closeDatabase } from '../src/database/connection';
import { MongoClient } from 'mongodb';

jest.mock('mongodb');

describe('Database Connection Manager', () => {
  const mockConnect = jest.fn();
  const mockDb = jest.fn();
  const mockClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (MongoClient as unknown as jest.Mock).mockImplementation(() => ({
      connect: mockConnect.mockResolvedValue(undefined),
      db: mockDb.mockReturnValue({ name: 'officyna-db' }),
      close: mockClose.mockResolvedValue(undefined)
    }));
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should establish connection and return database instance', async () => {
    const db = await getDatabase();
    expect(db).toBeDefined();
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockDb).toHaveBeenCalledWith('officyna');

    // Subsequent call should reuse cached connection
    const db2 = await getDatabase();
    expect(db2).toBe(db);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('should close connection gracefully', async () => {
    await getDatabase();
    await closeDatabase();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
