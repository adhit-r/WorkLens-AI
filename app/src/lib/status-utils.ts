/**
 * Frontend Status and Resolution Utilities
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
 * Format status code to label
 * Handles both number codes and string labels
 * @param code Status code (number) or label (string)
 * @returns Status label string
 */
export function formatStatus(code: number | string | null | undefined): string {
  if (code === null || code === undefined) {
    return 'Unknown';
  }
  
  // If already a string label, return as-is
  if (typeof code === 'string') {
    // Check if it's already a valid label
    if (Object.values(STATUS_LABELS).includes(code)) {
      return code;
    }
    // Try to parse as number
    const numCode = parseInt(code, 10);
    if (!isNaN(numCode)) {
      return STATUS_LABELS[numCode] || code;
    }
    return code;
  }
  
  return STATUS_LABELS[code] || `Unknown (${code})`;
}

/**
 * Format resolution code to label
 * Handles both number codes and string labels
 * @param code Resolution code (number) or label (string)
 * @returns Resolution label string
 */
export function formatResolution(code: number | string | null | undefined): string {
  if (code === null || code === undefined) {
    return 'Open'; // Default resolution
  }
  
  // If already a string label, return as-is
  if (typeof code === 'string') {
    // Check if it's already a valid label
    if (Object.values(RESOLUTION_LABELS).includes(code)) {
      return code;
    }
    // Try to parse as number
    const numCode = parseInt(code, 10);
    if (!isNaN(numCode)) {
      return RESOLUTION_LABELS[numCode] || code;
    }
    return code;
  }
  
  return RESOLUTION_LABELS[code] || `Unknown (${code})`;
}

/**
 * Get status color for UI badges
 * @param status Status label string
 * @returns Tailwind CSS classes for badge styling
 */
export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'new':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300';
    case 'confirmed':
      return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300';
    case 'assigned':
      return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300';
    case 'resolved':
      return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300';
    case 'closed':
      return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-300';
    case 'feedback':
      return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300';
    case 'acknowledged':
      return 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300';
    case 'movedout':
      return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300';
    case 'deferred':
      return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-300';
    case 'reopen':
      return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300';
    default:
      return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-300';
  }
}

/**
 * Check if status code represents an active task
 * Active tasks: status NOT IN (80, 90)
 * @param code Status code
 * @returns true if task is active
 */
export function isActiveStatus(code: number | string | null | undefined): boolean {
  if (code === null || code === undefined) {
    return false;
  }
  
  // If string, check if it's a non-active status
  if (typeof code === 'string') {
    const inactiveStatuses = ['Resolved', 'Closed'];
    return !inactiveStatuses.includes(code);
  }
  
  return code !== 80 && code !== 90; // Not Resolved or Closed
}

/**
 * Get status badge variant for shadcn/ui Badge component
 * @param status Status label string
 * @returns Badge variant
 */
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'closed' || statusLower === 'resolved') {
    return 'secondary';
  }
  if (statusLower === 'reopen' || statusLower === 'feedback') {
    return 'destructive';
  }
  return 'default';
}

