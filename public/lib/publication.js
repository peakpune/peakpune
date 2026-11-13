// Unknown IDs fail closed. Type checks complement, never replace, source review.
export function publishAuditedRows(rows, audit) {
    return rows.filter(row => audit.records[row.id]?.decision === 'publish')
        .map(row => ({ ...row, ...audit.records[row.id]?.overrides, checked_at: audit.checked_at }));
}
