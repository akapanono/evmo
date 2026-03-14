import mysql from 'mysql2/promise';
import { config } from '../src/config.mjs';

async function main() {
  if (config.database.client !== 'mysql') {
    throw new Error('Set DATABASE_CLIENT=mysql before running the MySQL smoke test.');
  }

  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    charset: 'utf8mb4',
  });

  try {
    const [versionRows] = await connection.query('SELECT VERSION() AS version');
    const [tableRows] = await connection.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ?
      ORDER BY table_name ASC
    `, [config.database.name]);

    console.log(JSON.stringify({
      ok: true,
      database: config.database.name,
      version: Array.isArray(versionRows) ? versionRows[0]?.version : undefined,
      tables: Array.isArray(tableRows) ? tableRows.map((row) => row.table_name) : [],
    }, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
