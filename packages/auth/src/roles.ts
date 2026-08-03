export const roles = ['viewer', 'operator', 'admin'] as const;

export type Role = (typeof roles)[number];

const roleHierarchy: Record<Role, number> = {
  admin: 3,
  operator: 2,
  viewer: 1,
};

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canCreateRun(role: Role): boolean {
  return hasMinimumRole(role, 'operator');
}

export function canCancelRun(role: Role): boolean {
  return hasMinimumRole(role, 'operator');
}

export function canListRuns(role: Role): boolean {
  return hasMinimumRole(role, 'viewer');
}

export function canManageSurfaces(role: Role): boolean {
  return hasMinimumRole(role, 'admin');
}

export function canViewAudit(role: Role): boolean {
  return hasMinimumRole(role, 'admin');
}
