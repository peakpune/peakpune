export interface SourceLink { url: string; label?: string }
export interface Plan { title: string; date: string; city: 'Pune'; place: string; links: SourceLink[] }
export interface SourceStatus { state: string }
export interface Snapshot { events: Plan[]; status: SourceStatus[]; fetchedAt: number; expiresAt: number }
export interface AuditRecord { decision: string; overrides?: Record<string, unknown> }
export interface PublicationAudit { checked_at: string; records: Record<string, AuditRecord> }
