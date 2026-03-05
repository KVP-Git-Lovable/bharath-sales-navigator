/**
 * Sync Error Classification
 * Categorizes errors to determine retry behavior
 */

export type SyncErrorType = 'NETWORK' | 'VALIDATION' | 'AUTH' | 'CONFLICT' | 'SERVER' | 'UNKNOWN';

export type SyncState = 'QUEUED' | 'SYNCING' | 'RETRYING' | 'FAILED_SYNC' | 'SUCCESS';

export const MAX_AUTO_RETRIES = 5;

export interface SyncLogEntry {
  id: string;
  syncItemId: string;
  action: string;
  timestamp: string;
  errorType?: SyncErrorType;
  errorMessage?: string;
  attemptNumber: number;
  success: boolean;
}

/**
 * Classify an error into a category for retry decisions
 */
export function classifySyncError(error: any): SyncErrorType {
  const msg = (error?.message || error?.toString() || '').toLowerCase();
  const code = error?.code || '';

  // Network errors - retryable
  if (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    code === 'NETWORK_ERROR'
  ) {
    return 'NETWORK';
  }

  // Auth errors - not retryable without re-auth
  if (
    msg.includes('jwt expired') ||
    msg.includes('not authenticated') ||
    msg.includes('invalid token') ||
    msg.includes('unauthorized') ||
    code === '401' || code === 'PGRST301'
  ) {
    return 'AUTH';
  }

  // Validation errors - never retryable (bad data)
  if (
    msg.includes('violates check constraint') ||
    msg.includes('violates not-null') ||
    msg.includes('invalid input') ||
    msg.includes('missing required') ||
    code === '23514' || code === '23502' || code === '22P02'
  ) {
    return 'VALIDATION';
  }

  // Conflict errors - duplicate data, may be already synced
  if (
    msg.includes('duplicate key') ||
    msg.includes('unique constraint') ||
    msg.includes('already exists') ||
    code === '23505'
  ) {
    return 'CONFLICT';
  }

  // Server errors - retryable (transient)
  if (
    msg.includes('internal server error') ||
    msg.includes('service unavailable') ||
    msg.includes('bad gateway') ||
    code === '500' || code === '502' || code === '503'
  ) {
    return 'SERVER';
  }

  return 'UNKNOWN';
}

/**
 * Whether an error type should be auto-retried
 */
export function isRetryableError(errorType: SyncErrorType): boolean {
  switch (errorType) {
    case 'NETWORK':
    case 'SERVER':
    case 'UNKNOWN':
      return true;
    case 'AUTH':
      return true; // Retry after re-auth
    case 'VALIDATION':
      return false; // Bad data, won't fix itself
    case 'CONFLICT':
      return false; // Already exists, treat as success
    default:
      return true;
  }
}

/**
 * Calculate exponential backoff delay
 */
export function getBackoffDelay(retryCount: number): number {
  const baseDelay = 2000; // 2 seconds
  const maxDelay = 300000; // 5 minutes
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}
