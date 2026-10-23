import React, { createContext, useContext, useState, useEffect } from 'react';

export type PlanTier = 'BASIC' | 'STANDARD';
export type DemoRole = 'ADMIN' | 'TEACHER';

interface PlanContextType {
  plan: PlanTier;
  setPlan: (plan: PlanTier) => void;
  togglePlan: () => void;
  isBasic: boolean;
  isStandard: boolean;
  demoRole: DemoRole;
  setDemoRole: (role: DemoRole) => void;
  toggleDemoRole: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const STORAGE_KEY_PLAN = 'dwd_school_erp_plan_tier';
const STORAGE_KEY_ROLE = 'dwd_school_erp_demo_role';

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlanState] = useState<PlanTier>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PLAN);
    return saved === 'STANDARD' ? 'STANDARD' : 'BASIC';
  });

  const [demoRole, setDemoRoleState] = useState<DemoRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROLE);
    return saved === 'TEACHER' ? 'TEACHER' : 'ADMIN';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAN, plan);
  }, [plan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROLE, demoRole);
  }, [demoRole]);

  const setPlan = (newPlan: PlanTier) => {
    setPlanState(newPlan);
  };

  const togglePlan = () => {
    setPlanState((prev) => (prev === 'BASIC' ? 'STANDARD' : 'BASIC'));
  };

  const setDemoRole = (newRole: DemoRole) => {
    setDemoRoleState(newRole);
  };

  const toggleDemoRole = () => {
    setDemoRoleState((prev) => (prev === 'ADMIN' ? 'TEACHER' : 'ADMIN'));
  };

  return (
    <PlanContext.Provider
      value={{
        plan,
        setPlan,
        togglePlan,
        isBasic: plan === 'BASIC',
        isStandard: plan === 'STANDARD',
        demoRole,
        setDemoRole,
        toggleDemoRole,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = (): PlanContextType => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};
