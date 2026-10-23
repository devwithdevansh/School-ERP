import { useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import type { ScreenType } from '../store';
import { getVisibleModules } from '../config/navigation';
import type { ModuleId, NavContext } from '../config/navigation';
import { usePlan } from '../context/PlanContext';

/** Single adapter between the app store and the navigation registry. */
export function useNav() {
  const { currentUser, isSuperAdmin, isOrgAdmin, client, activePortal, setActivePortal, currentScreen, setScreen, activeStudents } = useApp();
  const { demoRole, isBasic, plan } = usePlan();

  const unpaidCount = useMemo(
    () => activeStudents.filter((s) => s.status !== 'PAID' && s.status !== 'RTE').length,
    [activeStudents],
  );
  // No client info (a backend without multi-tenancy) = everything licensed, as before.
  const enabledModules = useMemo(() => client?.enabledModules ?? ['FEES', 'ERP'], [client]);
  const effectiveRole = demoRole || currentUser?.role;
  const ctx: NavContext = useMemo(
    () => ({ role: effectiveRole, isSuperAdmin: effectiveRole === 'ADMIN' && isSuperAdmin, isOrgAdmin, enabledModules, unpaidCount, planTier: plan }),
    [effectiveRole, isSuperAdmin, isOrgAdmin, enabledModules, unpaidCount, plan],
  );
  const modules = useMemo(() => getVisibleModules(ctx), [ctx]);
  const activeModule = modules.find((m) => m.id === activePortal) ?? modules[0];

  // If the stored module is not allowed for this user (switched account, module disabled by the organization),
  // fall back to the first one they can see — and to its first screen, since the old screen may not exist there.
  useEffect(() => {
    if (activeModule && activeModule.id !== activePortal) {
      setActivePortal(activeModule.id);
      const first = activeModule.groups[0]?.items[0];
      if (first) setScreen(first.id);
    }
  }, [activeModule, activePortal, setActivePortal, setScreen]);

  const navigate = useCallback((moduleId: ModuleId, screen: ScreenType) => {
    if (moduleId !== activePortal) setActivePortal(moduleId);
    setScreen(screen);
  }, [activePortal, setActivePortal, setScreen]);

  const switchModule = useCallback((m: ModuleId) => {
    const target = modules.find((x) => x.id === m);
    const first = target?.groups[0]?.items[0];
    if (target && first) navigate(m, first.id);
  }, [modules, navigate]);

  const roleLabel = isOrgAdmin ? 'Organization Admin'
    : effectiveRole === 'ADMIN' ? 'Administrator'
    : effectiveRole === 'TEACHER' ? 'Class Teacher' : 'Staff Member';

  return { ctx, modules, activeModule, currentScreen, navigate, switchModule, roleLabel };
}
