import React, { useState } from 'react';
import { ChevronDown, LogOut, Columns2, MoreVertical } from '@/components/icons';
import { brand } from '../config/brand';
import { NavList } from './NavList';
import type { NavModule, ModuleId, NavContext } from '../config/navigation';
import type { ScreenType } from '../store';

import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  modules: NavModule[];
  activeId: ModuleId;
  currentScreen: ScreenType;
  ctx: NavContext;
  onNavigate: (m: ModuleId, s: ScreenType) => void;
  onSplit: () => void;
  onLogout: () => void;
  userName: string;
  roleLabel: string;
  title: string;
}

export const MergedSidebar: React.FC<Props> = ({ modules, activeId, currentScreen, ctx, onNavigate, onSplit, onLogout, userName, roleLabel, title }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => open[id] ?? id === activeId;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-[var(--color-side)] border-r border-white/5">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src={brand.logo} alt="" className="h-10 w-10 rounded-xl ring-1 ring-white/10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{brand.productName}</p>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-3 pb-4">
        <div className="space-y-1.5">
          {modules.map((m) => {
            const Icon = m.icon;
            const expanded = isOpen(m.id);
            const active = m.id === activeId;
            return (
              <Collapsible 
                key={m.id} 
                open={expanded} 
                onOpenChange={(isOpenState) => setOpen((o) => ({ ...o, [m.id]: isOpenState }))}
                className={`rounded-2xl ${expanded ? 'bg-white/[0.04]' : ''}`}
              >
                <CollapsibleTrigger className="w-full">
                  <button className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold hover:bg-white/5 ${active ? 'text-white' : 'text-slate-300'}`}>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-900/50' : 'bg-white/5 text-slate-400'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-left">{m.label}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-2 pb-3 pt-1">
                  <NavList
                    moduleId={m.id}
                    groups={m.groups}
                    currentScreen={active ? currentScreen : undefined}
                    ctx={ctx}
                    onNavigate={onNavigate}
                  />
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-white/5 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full">
            <button className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-white/5 transition-colors">
              <Avatar className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center">
                <AvatarFallback className="bg-transparent text-xs font-bold text-slate-900">
                  {userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{userName}</p>
                <p className="truncate text-[10px] text-slate-500">{roleLabel}</p>
              </div>
              <MoreVertical className="h-4 w-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[var(--color-side)] border-white/10 text-white">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={onSplit} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
              <Columns2 className="mr-2 h-4 w-4" />
              <span>Switch to split layout</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout} className="text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};
