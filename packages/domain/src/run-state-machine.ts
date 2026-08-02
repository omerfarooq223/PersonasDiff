export const runStatuses = [
  'draft',
  'queued',
  'running',
  'completed',
  'partially_completed',
  'failed',
  'cancelled',
] as const;

export type RunStatus = (typeof runStatuses)[number];

const transitions: Readonly<Record<RunStatus, readonly RunStatus[]>> = {
  cancelled: [],
  completed: [],
  draft: ['queued', 'cancelled'],
  failed: [],
  partially_completed: [],
  queued: ['running', 'cancelled', 'failed'],
  running: ['completed', 'partially_completed', 'failed', 'cancelled'],
};

export function canTransition(from: RunStatus, to: RunStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: RunStatus, to: RunStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal run transition: ${from} -> ${to}`);
  }
}
