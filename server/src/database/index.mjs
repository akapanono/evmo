import { config } from '../config.mjs';
import * as sqliteDriver from './sqlite-driver.mjs';

function createMySqlPlaceholder() {
  const unsupported = () => {
    throw new Error('MySQL driver not connected yet. Keep DATABASE_CLIENT=sqlite for now, or install and wire a MySQL driver next.');
  };

  return {
    kind: 'mysql',
    getDb: unsupported,
    runInTransaction: unsupported,
    runMigrations: unsupported,
    getConfigRow: unsupported,
    saveConfigRow: unsupported,
  };
}

export const database = config.database.client === 'mysql'
  ? createMySqlPlaceholder()
  : {
      kind: 'sqlite',
      ...sqliteDriver,
    };
