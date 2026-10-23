import React from 'react';
import type { NavGroup, ModuleId, NavContext } from '../config/navigation';
import type { ScreenType } from '../store';

interface Props {
  moduleId: ModuleId;
  groups: NavGroup[];
  /** Pass undefined when this module is not the active one (nothing highlighted). */
  currentScreen?: ScreenType;
  ctx: NavContext;
  onNavigate: (m: ModuleId, s: ScreenType) => void;
}

/** Nav items, designed for the dark sidebar surface. */
export const NavList: React.FC<Props> = ({ moduleId, groups, currentScreen, ctx, onNavigate }) => (
  <div className="space-y-5">
    {groups.map((group) => (
      <div key={group.title}>
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{group.title}</p>
        <ul className="space-y-0.5">
          {group.items.map((item) => {
            const active = currentScreen === item.id;
            const badge = item.badge?.(ctx);
            const Icon = item.icon;
            return (
              <li key={item.id + item.label}>
                <button
                  disabled={item.disabled}
                  onClick={() => onNavigate(moduleId, item.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500/25 to-violet-500/5 text-white'
                      : item.disabled
                      ? 'cursor-not-allowed opacity-30 text-slate-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-400" />}
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-200'}`} />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {badge ? (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{badge}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </div>
);
