import type { PublicationAudit } from './types.js';
// Unknown IDs fail closed. Type checks complement, never replace, source review.
export function publishAuditedRows<T extends { id: string }>(rows: T[], audit: PublicationAudit): (T & { checked_at: string })[] {
  return rows.filter(row => audit.records[row.id]?.decision === 'publish')
    .map(row => ({ ...row, ...audit.records[row.id]?.overrides, checked_at: audit.checked_at }));
}
