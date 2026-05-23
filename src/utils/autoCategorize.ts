import { Project } from '../types';

export interface KeywordMapping {
  keywords: string[];
  projectName: string;
}

export const DEFAULT_KEYWORD_MAPPINGS: KeywordMapping[] = [
  { 
    keywords: ['study', 'research', 'paper', 'read', 'learn', 'course', 'lecture', 'assignment', 'book', 'thesis'], 
    projectName: 'Research Items' 
  },
  { 
    keywords: ['audit', 'afm', 'fr', 'exam', 'final', 'class', 'test', 'tax', 'accounts', 'ca', 'revision'], 
    projectName: 'CA Final' 
  },
  { 
    keywords: ['spiritual', 'bible', 'meditation', 'pray', 'church', 'soul', 'devotional'], 
    projectName: 'Spiritual' 
  },
  { 
    keywords: ['work', 'office', 'job', 'meeting', 'task', 'project', 'client', 'invoice', 'presentation', 'email'], 
    projectName: 'Work' 
  },
  { 
    keywords: ['exercise', 'gym', 'workout', 'run', 'walk', 'hydrate', 'water', 'sport', 'cardio', 'fitness', 'stretch'], 
    projectName: 'Exercise' 
  }
];

/**
 * Heuristically determines the matching project ID for a task based on its title keywords.
 * Returns the matched project ID, or the original selected project ID (defaulting to 'inbox') if no match is found.
 */
export function determineProjectByTitle(
  title: string, 
  projects: Project[], 
  currentProjectId: string | null | undefined
): { projectId: string; matchedProjectName?: string } {
  const normTitle = title.toLowerCase();

  // 1. Try mapping keywords to specific default project names
  for (const entry of DEFAULT_KEYWORD_MAPPINGS) {
    if (entry.keywords.some(keyword => normTitle.includes(keyword))) {
      const matchedProj = projects.find(p => p.name.toLowerCase() === entry.projectName.toLowerCase());
      if (matchedProj) {
        return { projectId: matchedProj.id, matchedProjectName: matchedProj.name };
      }
    }
  }

  // 2. Generic fallback: if any other existing project name is a substring of the title, match it!
  for (const p of projects) {
    const projNameLower = p.name.toLowerCase();
    // Only match project names that are at least 3 letters long to avoid spurious short substring matches
    if (projNameLower.length >= 3 && normTitle.includes(projNameLower)) {
      return { projectId: p.id, matchedProjectName: p.name };
    }
  }

  // 3. Fallback: Return original chosen or default to 'inbox'
  return { projectId: currentProjectId || 'inbox' };
}
