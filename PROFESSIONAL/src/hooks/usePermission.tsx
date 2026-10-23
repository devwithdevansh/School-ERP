import React from 'react';
import { useApp } from '../store';
import { type PermissionId, hasPermission } from '../config/permissionsRegistry';

/**
 * Hook to check if the active user is authorized for a specific screen or action.
 */
export function useHasPermission(perm: PermissionId): boolean {
  const { currentUser, isSuperAdmin } = useApp();
  return hasPermission(
    perm,
    currentUser?.permissions,
    currentUser?.role,
    isSuperAdmin
  );
}

/**
 * Declarative component to wrap buttons or action elements based on user permissions.
 * Example:
 *   <Can permission="STUDENTS:ADD">
 *     <button onClick={openAddModal}>Add Student</button>
 *   </Can>
 */
export const Can: React.FC<{
  permission: PermissionId;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, children, fallback = null }) => {
  const allowed = useHasPermission(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
};
