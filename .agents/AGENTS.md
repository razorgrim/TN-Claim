# Workspace Rules

- **CRITICAL**: Never run database recreation, deletion, or reset scripts (such as `npm run db:recreate`, `npm run db:reset`, or `node server/recreate-db.js`) without explicit request/permission from the user. Always preserve the current database state.
