import { useCallback, useState } from 'react';

/** 'split'  = icon rail (module switcher) + second sidebar (module menu)
 *  'merged' = one sidebar, each module is a collapsible dropdown */
export type LayoutMode = 'split' | 'merged';
const KEY = 'erp.layoutMode';

export function useLayoutMode(): [LayoutMode, (m: LayoutMode) => void] {
  const [mode, setModeState] = useState<LayoutMode>(() => {
    try { return localStorage.getItem(KEY) === 'merged' ? 'merged' : 'split'; } catch { return 'split'; }
  });
  const setMode = useCallback((m: LayoutMode) => {
    setModeState(m);
    try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  }, []);
  return [mode, setMode];
}
