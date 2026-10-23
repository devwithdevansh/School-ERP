import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, Columns2, MoreVertical, X, User } from '@/components/icons';
import { brand } from '../config/brand';
import { NavList } from './NavList';
import type { NavModule, ModuleId, NavContext } from '../config/navigation';
import type { ScreenType } from '../store';

interface Props {
  modules: NavModule[];
  activeId: ModuleId;
  currentScreen: ScreenType;
  ctx: NavContext;
  onNavigate: (m: ModuleId, s: ScreenType) => void;
  onSplit: () => void;
  onLogout: () => void;
  userName: string;
  userEmail?: string;
  roleLabel: string;
  title: string;
}

export const MergedSidebar: React.FC<Props> = ({
  modules,
  activeId,
  currentScreen,
  ctx,
  onNavigate,
  onSplit,
  onLogout,
  userName,
  userEmail,
  roleLabel,
  title,
}) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = (id: string) => open[id] ?? id === activeId;
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  // Close profile popup when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setShowProfileModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <aside className="relative flex h-full min-h-0 w-72 shrink-0 flex-col bg-[var(--color-side)] border-r border-white/5 select-none">
      {/* Brand & Split Toggle Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5 shrink-0">
        <img src={brand.logo} alt="" className="h-10 w-10 rounded-xl ring-1 ring-white/10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{brand.baseName}</p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {brand.edition}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onSplit}
          title="Switch to split layout (rail + menu)"
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
        >
          <Columns2 className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Navigation Options with custom scroll styling */}
      <div className="side-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {modules.map((m) => {
          const Icon = m.icon;
          const expanded = isOpen(m.id);
          const active = m.id === activeId;
          return (
            <div
              key={m.id}
              className={`rounded-2xl transition-colors ${expanded ? 'bg-white/[0.04]' : ''}`}
            >
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [m.id]: !isOpen(m.id) }))}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-white/5 ${
                  active ? 'text-white' : 'text-slate-300'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all shrink-0 ${
                    active
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-900/50'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-left truncate">{m.label}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform duration-200 shrink-0 ${
                    expanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expanded && (
                <div className="px-2 pb-3 pt-1">
                  <NavList
                    moduleId={m.id}
                    groups={m.groups}
                    currentScreen={active ? currentScreen : undefined}
                    ctx={ctx}
                    onNavigate={onNavigate}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile Bar & Layout Switch Footer */}
      <div className="relative border-t border-white/5 p-3 flex items-center gap-2 shrink-0" ref={menuRef}>
        {/* Profile Popover / Dropdown Menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl border border-white/10 bg-[#0c1222] p-2.5 shadow-2xl backdrop-blur-xl z-50">
            <div className="px-3 py-2.5 border-b border-white/10 mb-1.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-xs font-black text-slate-900 shadow-md">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{userName}</p>
                  <p className="truncate text-[11px] text-slate-400">{userEmail || roleLabel}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  {roleLabel}
                </span>
                <span className="text-[10px] text-slate-500">·</span>
                <span className="truncate text-[10px] text-slate-400 font-medium">{title}</span>
              </div>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowProfileModal(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <User className="h-4 w-4 text-slate-400 shrink-0" />
                <span>My Profile Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onSplit();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Columns2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Switch to split layout</span>
              </button>

              <div className="my-1 border-t border-white/10" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}

        {/* Profile Card Button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-white/5 ${
            menuOpen ? 'bg-white/5' : ''
          }`}
          title="User profile and account options"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-xs font-bold text-slate-900 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{userName}</p>
            <p className="truncate text-[10px] font-medium text-slate-400">{roleLabel}</p>
          </div>
          <MoreVertical className="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        {/* Layout split button */}
        <button
          type="button"
          onClick={onSplit}
          title="Switch to split layout"
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
        >
          <Columns2 className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Details Modal Dialog */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f172a] p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white">Account Profile</h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-2xl font-black text-slate-900 shadow-xl shadow-orange-500/10">
                {initials}
              </div>
              <h4 className="mt-3 text-lg font-bold text-white">{userName}</h4>
              <p className="text-xs font-medium text-slate-400">{userEmail || 'Administrator Account'}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                {roleLabel}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl bg-white/5 p-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Organization / School</span>
                <span className="font-semibold text-white">{title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Layout</span>
                <span className="font-semibold text-white">Merged Sidebar</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Account Status</span>
                <span className="font-semibold text-emerald-400">Active</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  onLogout();
                }}
                className="flex-1 rounded-xl bg-rose-500/10 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                Sign out
              </button>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-white hover:bg-white/15 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
