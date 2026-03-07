import { openDB, type IDBPDatabase } from 'idb';
import type { DatabaseSchema } from './schema';
import { DB_NAME, DB_VERSION } from '@/utils/constants';

let db: IDBPDatabase<DatabaseSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<DatabaseSchema>> {
  if (db) return db;

  db = await openDB<DatabaseSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Friends store
      if (!db.objectStoreNames.contains('friends')) {
        const store = db.createObjectStore('friends', { keyPath: 'id' });
        store.createIndex('by-createdAt', 'createdAt');
        store.createIndex('by-updatedAt', 'updatedAt');
      }

      // Reminders store
      if (!db.objectStoreNames.contains('reminders')) {
        const store = db.createObjectStore('reminders', { keyPath: 'id' });
        store.createIndex('by-friendId', 'friendId');
        store.createIndex('by-date', 'date');
      }

      // ContactLogs store
      if (!db.objectStoreNames.contains('contactLogs')) {
        const store = db.createObjectStore('contactLogs', { keyPath: 'id' });
        store.createIndex('by-friendId', 'friendId');
        store.createIndex('by-date', 'date');
      }

      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'id' });
        store.createIndex('by-friendId', 'friendId');
      }
    },
  });

  return db;
}

export async function closeDB(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}
