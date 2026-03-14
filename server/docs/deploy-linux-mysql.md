# Linux + MySQL Deployment Notes

## Current state

- The server can already read MySQL environment variables.
- The repository layer has been refactored behind a database adapter and async transaction boundary.
- A MySQL driver, schema migration path, and SQLite -> MySQL migration script now exist.
- Do not switch `DATABASE_CLIENT=mysql` in production until MySQL smoke tests pass in a real environment.

## Safe deployment path

1. Keep the current server on `DATABASE_CLIENT=sqlite` while the Linux host is prepared.
2. Move secrets and admin credentials into environment variables on the server.
3. Put the service behind HTTPS and a reverse proxy such as Nginx.
4. Run MySQL schema migration and import existing SQLite data into MySQL.
5. Verify auth, friend, memorial day, product, and admin flows against MySQL.
6. Switch `DATABASE_CLIENT=mysql` only after repository migration tests pass.

## Recommended Linux env

```env
PORT=9090
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_strong_admin_password
ADMIN_TOKEN_SECRET=replace_with_a_long_random_secret

DATABASE_CLIENT=mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=evmo
DATABASE_PASSWORD=replace_with_a_strong_password
DATABASE_NAME=evmo

AI_BASE_URL=
AI_API_KEY=
AI_MODEL=

CORS_ALLOW_ORIGINS=https://your-app-domain.com,capacitor://localhost
MAX_BODY_SIZE_BYTES=1048576
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

## Remaining backend work before MySQL cutover

- Run the new migration script in a real MySQL environment:
  - `npm run migrate:sqlite-to-mysql`
  - add `--reset` only for a clean target database
- Re-run auth, friend, memorial day, product, backup, and system config regression tests against MySQL.
- Add an online backup/export routine for MySQL after cutover.
