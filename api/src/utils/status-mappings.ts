/**
 * Status and Resolution Mappings
 * Matches SQL_Query_Rules.txt exactly (lines 252-272)
 */

export const STATUS_LABELS: Record<number, string> = {
  10: 'New',
  20: 'Feedback',
  30: 'Acknowledged',
  40: 'Confirmed',
  50: 'Assigned',
  60: 'Movedout',
  70: 'Deferred',
  80: 'Resolved',
  90: 'Closed',
  100: 'Reopen',
};

export const RESOLUTION_LABELS: Record<number, string> = {
  10: 'Open',
  20: 'Fixed',
  30: 'Reopened',
  40: 'Unable to Reproduce',
  50: 'Duplicate',
  60: 'No Change Required',
  70: 'Not Fixable',
  80: 'Suspended',
  90: "Won't Fix",
};

/**
 * Get status label from status code
 * @param code Status code (number)
 * @returns Status label string
 */
export function getStatusLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) {
    return 'Unknown';
  }
  return STATUS_LABELS[code] || `Unknown (${code})`;
}

/**
 * Get resolution label from resolution code
 * @param code Resolution code (number)
 * @returns Resolution label string
 */
export function getResolutionLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) {
    return 'Open'; // Default resolution
  }
  return RESOLUTION_LABELS[code] || `Unknown (${code})`;
}

/**
 * Check if status code represents an active task
 * Active tasks: status NOT IN (80, 90)
 * @param code Status code
 * @returns true if task is active
 */
export function isActiveStatus(code: number | null | undefined): boolean {
  if (code === null || code === undefined) {
    return false;
  }
  return code !== 80 && code !== 90; // Not Resolved or Closed
}

/**
 * Check if status represents a "current task" (Assigned or Confirmed)
 * Current tasks: status IN (40, 50) AND (resolution IS NULL OR resolution = 10)
 * @param statusCode Status code
 * @param resolutionCode Resolution code
 * @returns true if task is current/active
 */
export function isCurrentTask(statusCode: number | null | undefined, resolutionCode: number | null | undefined): boolean {
  if (!isActiveStatus(statusCode)) {
    return false;
  }
  const isAssignedOrConfirmed = statusCode === 40 || statusCode === 50;
  const isOpenOrNull = resolutionCode === null || resolutionCode === undefined || resolutionCode === 10;
  return isAssignedOrConfirmed && isOpenOrNull;
}

/**
 * Get all status codes that are considered active
 * @returns Array of active status codes
 */
export function getActiveStatusCodes(): number[] {
  return Object.keys(STATUS_LABELS)
    .map(Number)
    .filter(code => isActiveStatus(code));
}

