# MySQL Notes

## Current status

- SQLite remains the default local database.
- MySQL driver selection, schema migration, and data migration scripts are now present.
- Recommended cutover order:
  1. Configure MySQL env
  2. Run `npm run smoke:mysql`
  3. Run `npm run migrate:sqlite-to-mysql`
  4. Verify app flows
  5. Switch production to `DATABASE_CLIENT=mysql`

## Commands

```bash
npm run smoke:mysql
npm run migrate:sqlite-to-mysql
npm run migrate:sqlite-to-mysql -- --reset
```

## Warning

- `--reset` will clear the target MySQL tables before import.
- Only use it against a disposable or fully backed-up MySQL database.
