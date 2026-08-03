import { describe, expect, it } from 'vitest';

import {
  canCancelRun,
  canCreateRun,
  canListRuns,
  canManageSurfaces,
  canViewAudit,
  hasMinimumRole,
} from '../src/roles.js';

describe('role policy', () => {
  it('denies viewers from creating runs', () => {
    expect(canCreateRun('viewer')).toBe(false);
    expect(canCreateRun('operator')).toBe(true);
    expect(canCreateRun('admin')).toBe(true);
  });

  it('allows viewers to list runs', () => {
    expect(canListRuns('viewer')).toBe(true);
  });

  it('restricts cancellation to operator and admin', () => {
    expect(canCancelRun('viewer')).toBe(false);
    expect(canCancelRun('operator')).toBe(true);
  });

  it('restricts audit visibility to admin', () => {
    expect(canViewAudit('viewer')).toBe(false);
    expect(canViewAudit('operator')).toBe(false);
    expect(canViewAudit('admin')).toBe(true);
  });

  it('restricts surface management to admin', () => {
    expect(canManageSurfaces('admin')).toBe(true);
    expect(hasMinimumRole('admin', 'operator')).toBe(true);
  });
});
