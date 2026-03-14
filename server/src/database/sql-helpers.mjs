function quoteIdentifier(identifier) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier) ? identifier : '';
}

export function buildOrderByRecent(database, columns) {
  const safeColumns = columns.map(quoteIdentifier).filter(Boolean);
  if (safeColumns.length === 0) {
    return 'id DESC';
  }

  if (database.kind === 'mysql') {
    return safeColumns.map((column) => `${column} DESC`).join(', ');
  }

  return safeColumns.map((column) => `datetime(${column}) DESC`).join(', ');
}

export function buildUpsertClause(database, conflictColumns, updateColumns) {
  const safeConflictColumns = conflictColumns.map(quoteIdentifier).filter(Boolean);
  const safeUpdateColumns = updateColumns.map(quoteIdentifier).filter(Boolean);
  if (safeUpdateColumns.length === 0) {
    return '';
  }

  if (database.kind === 'mysql') {
    return `ON DUPLICATE KEY UPDATE ${safeUpdateColumns.map((column) => `${column} = VALUES(${column})`).join(', ')}`;
  }

  const conflictTarget = safeConflictColumns.length > 0 ? `(${safeConflictColumns.join(', ')})` : '';
  return `ON CONFLICT${conflictTarget} DO UPDATE SET ${safeUpdateColumns.map((column) => `${column} = excluded.${column}`).join(', ')}`;
}
