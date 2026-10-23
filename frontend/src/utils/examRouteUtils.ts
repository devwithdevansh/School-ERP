/**
 * examRouteUtils.ts
 * Utilities for URL synchronization for Exams (/academics/exams/:id/:tab)
 * and Results (/academics/results/:id/:tab) modules.
 */

export interface ExamRouteState {
  screen: 'exams' | 'results' | null;
  examId: string | null;
  tab: string | null;
}

export function parseExamRoute(pathname = window.location.pathname): ExamRouteState {
  const parts = pathname.split('/').filter(Boolean);

  // Expected patterns:
  // /academics/exams or /academics/exams/:id or /academics/exams/:id/:tab
  // /academics/results or /academics/results/:id or /academics/results/:id/:tab
  if (parts[0] === 'academics') {
    if (parts[1] === 'exams') {
      return {
        screen: 'exams',
        examId: parts[2] || null,
        tab: parts[3] || null,
      };
    }
    if (parts[1] === 'results') {
      return {
        screen: 'results',
        examId: parts[2] || null,
        tab: parts[3] || null,
      };
    }
  }

  // Fallback direct paths
  if (parts[0] === 'exams') {
    return {
      screen: 'exams',
      examId: parts[1] || null,
      tab: parts[2] || null,
    };
  }
  if (parts[0] === 'results') {
    return {
      screen: 'results',
      examId: parts[1] || null,
      tab: parts[2] || null,
    };
  }

  return { screen: null, examId: null, tab: null };
}

export function updateExamRoute(
  module: 'exams' | 'results',
  examId?: string | null,
  tab?: string | null,
  replace = false
) {
  let path = `/academics/${module}`;
  if (examId) {
    path += `/${examId}`;
    if (tab) {
      path += `/${tab}`;
    }
  }

  if (window.location.pathname !== path) {
    if (replace) {
      window.history.replaceState({ module, examId, tab }, '', path);
    } else {
      window.history.pushState({ module, examId, tab }, '', path);
    }
  }
}
