import React from 'react';
import { LogOut, PanelLeft } from 'lucide-react';
import { brand } from '../config/brand';
import type { NavModule, ModuleId } from '../config/navigation';

interface Props {
  modules: NavModule[];
  activeId: ModuleId;
  onSwitch: (m: ModuleId) => void;
  onMerge: () => void;
  onLogout: () => void;
  userInitials: string;
}

/** Slim dark rail: one button per module + layout/user actions. */
export const IconRail: React.FC<Props> = ({ modules, activeId, onSwitch, onMerge, onLogout, userInitials }) => (
  <nav className="side-scroll flex h-full w-[76px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-[var(--color-rail)] py-4">
    <img src={brand.logo} alt={brand.productName} className="mb-3 h-10 w-10 rounded-xl ring-1 ring-white/10" />
    {modules.map((m) => {
      const Icon = m.icon;
      const active = m.id === activeId;
      return (
        <button
          key={m.id}
          onClick={() => onSwitch(m.id)}
          title={m.label}
          className={`flex w-14 flex-col items-center gap-1 rounded-2xl py-2.5 text-[10px] font-semibold ${
            active
              ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/50'
              : 'text-slate-500 hover:bg-white/8 hover:text-white'
          }`}
        >
          <Icon className="h-5 w-5" />
          {m.short}
        </button>
      );
    })}
    <div className="mt-auto flex flex-col items-center gap-2">
      <button onClick={onMerge} title="Switch to merged sidebar" className="rounded-xl p-2 text-slate-500 hover:bg-white/10 hover:text-white">
        <PanelLeft className="h-5 w-5" />
      </button>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-xs font-bold text-slate-900">{userInitials}</div>
      <button onClick={onLogout} title="Log out" className="rounded-xl p-2 text-slate-500 hover:bg-white/10 hover:text-rose-300">
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  </nav>
);
