import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '../store';
import { brand } from '../config/brand';
import { NavList } from './NavList';
import { IconRail } from './IconRail';
import { MergedSidebar } from './MergedSidebar';
import { useNav } from './useNav';
import { useLayoutMode } from './useLayoutMode';

/**
 * Application chrome. Two interchangeable layouts share one navigation registry:
 *  - split:  icon rail (module switcher) + module menu panel
 *  - merged: single sidebar with a dropdown per module
 * Below `lg` both collapse into a slide-over drawer.
 */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, client, isOrgAdmin } = useApp();
  const { ctx, modules, activeModule, currentScreen, navigate, switchModule, roleLabel } = useNav();
  const [mode, setMode] = useLayoutMode();
  const [drawer, setDrawer] = useState(false);

  if (!currentUser) return <>{children}</>;
  if (!activeModule) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] p-6 text-center">
        <img src={brand.logo} alt="" className="h-14 w-14 rounded-xl" />
        <h1 className="text-xl font-bold text-[var(--color-ink)]">No modules are enabled for {client?.name ?? 'your school'}</h1>
        <p className="max-w-md text-sm text-[var(--color-ink-soft)]">Your organization has not activated any product modules for this account yet. Please contact your provider to get access.</p>
        <button onClick={logout} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Sign out</button>
      </div>
    );
  }
  // The platform owner sees the product name; a school's users see their own school.
  const title = isOrgAdmin ? brand.productName : (client?.name ?? brand.schoolName);

  const nav: typeof navigate = (m, s) => { navigate(m, s); setDrawer(false); };
  const initials = currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  const sidebars = mode === 'split' ? (
    <div className="flex h-full">
      <IconRail modules={modules} activeId={activeModule.id} onSwitch={switchModule} onMerge={() => setMode('merged')} onLogout={logout} userInitials={initials} />
      <aside className="flex h-full w-60 shrink-0 flex-col border-l border-white/5 bg-[var(--color-side)]">
        <div className="border-b border-white/5 px-5 py-5">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="text-[11px] font-medium text-slate-500">{activeModule.label} · {roleLabel}</p>
        </div>
        <div className="side-scroll flex-1 overflow-y-auto px-3 py-4">
          <NavList moduleId={activeModule.id} groups={activeModule.groups} currentScreen={currentScreen} ctx={ctx} onNavigate={nav} />
        </div>
      </aside>
    </div>
  ) : (
    <MergedSidebar
      modules={modules} activeId={activeModule.id} currentScreen={currentScreen} ctx={ctx}
      onNavigate={nav} onSplit={() => setMode('split')} onLogout={logout}
      userName={currentUser.name} roleLabel={roleLabel} title={title}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-ink-soft)]">
      <div className="hidden lg:block">{sidebars}</div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 shadow-2xl">{sidebars}</div>
          <button onClick={() => setDrawer(false)} className="absolute right-3 top-3 rounded-full bg-white p-2 shadow"><X className="h-5 w-5" /></button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-5 backdrop-blur">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--color-ink-faint)]">{activeModule.label}</span>
            <span className="text-slate-300">/</span>
            <span className="font-display text-base font-semibold capitalize text-[var(--color-ink)]">{currentScreen.replace(/-/g, ' ')}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm sm:inline">{roleLabel}</span>
            <span className="hidden text-xs font-medium text-[var(--color-ink-soft)] md:inline">{currentUser.name}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[11px] font-bold text-[var(--color-brand-strong)]">{initials}</span>
          </div>
        </header>
        <main className="relative min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
