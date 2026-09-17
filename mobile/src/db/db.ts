import * as SQLite from 'expo-sqlite';

/** Single shared SQLite connection for the app's local (on-device) storage. */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('offline_queue.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clientUuid TEXT UNIQUE NOT NULL,
          areaName TEXT NOT NULL,
          eventType TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          errorMessage TEXT,
          payloadCipher TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS area_cache (
          qrToken TEXT PRIMARY KEY NOT NULL,
          qrId TEXT NOT NULL,
          areaJson TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}
