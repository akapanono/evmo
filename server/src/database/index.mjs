import { config } from '../config.mjs';
import * as mysqlDriver from './mysql-driver.mjs';
import * as sqliteDriver from './sqlite-driver.mjs';

export const database = config.database.client === 'mysql'
  ? {
      kind: 'mysql',
      ...mysqlDriver,
    }
  : {
      kind: 'sqlite',
      ...sqliteDriver,
    };
