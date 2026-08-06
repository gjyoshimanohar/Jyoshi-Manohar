import { Project, Folder } from '../types';
import { determineProjectByTitle } from './autoCategorize';

export interface ParsedTaskResult {
  cleanTitle: string;
  priority?: number; // 1 | 2 | 3 | 4
  projectId?: string;
  projectName?: string;
  folderId?: string;
  folderName?: string;
  tags: string[];
}

/**
 * Parses priority (e.g. '!!' -> P1, 'p2' -> P2) and project/folder associations (e.g. '#ProjectName') from a task title.
 */
export function parseTaskTitleInput(
  rawTitle: string,
  projects: Project[] = [],
  folders: Folder[] = [],
  currentBaseProjectId: string = 'inbox'
): ParsedTaskResult {
  let text = rawTitle;
  let parsedPriority: number | undefined = undefined;
  let matchedProjectId: string | undefined = undefined;
  let matchedProjectName: string | undefined = undefined;
  let matchedFolderId: string | undefined = undefined;
  let matchedFolderName: string | undefined = undefined;
  const tags: string[] = [];

  if (!text || !text.trim()) {
    return {
      cleanTitle: '',
      tags: [],
    };
  }

  // 1. PARSE PRIORITY TOKENS
  // P1: '!!', '!!!', 'p1', '!p1', '!1', '!urgent'
  const p1Regex = /(?:^|\s)(!{2,3}|!p1|p1|!1|!urgent)(?=\s|$)/i;
  // P2: 'p2', '!p2', '!2', '!high'
  const p2Regex = /(?:^|\s)(!p2|p2|!2|!high)(?=\s|$)/i;
  // P3: 'p3', '!p3', '!3', '!medium', or single '!'
  const p3Regex = /(?:^|\s)(!p3|p3|!3|!medium|!)(?=\s|$)/i;
  // P4: 'p4', '!p4', '!4', '!low'
  const p4Regex = /(?:^|\s)(!p4|p4|!4|!low)(?=\s|$)/i;

  if (p1Regex.test(text)) {
    parsedPriority = 1;
    text = text.replace(p1Regex, ' ');
  } else if (p2Regex.test(text)) {
    parsedPriority = 2;
    text = text.replace(p2Regex, ' ');
  } else if (p3Regex.test(text)) {
    parsedPriority = 3;
    text = text.replace(p3Regex, ' ');
  } else if (p4Regex.test(text)) {
    parsedPriority = 4;
    text = text.replace(p4Regex, ' ');
  }

  // 2. PARSE HASHTAGS (#ProjectName, #FolderName, or #Tag)
  // We match tokens starting with #
  const hashtagRegex = /#([^\s#]+)/g;
  let match: RegExpExecArray | null;

  // We accumulate tokens to replace from string
  const tokensToRemove: string[] = [];

  while ((match = hashtagRegex.exec(text)) !== null) {
    const fullTag = match[0]; // e.g. "#CA_Final" or "#Work"
    const rawName = match[1]; // e.g. "CA_Final" or "Work"
    const normalizedToken = rawName.toLowerCase().replace(/[\-_]/g, ' ').trim();
    const slugToken = rawName.toLowerCase().replace(/[\s\-_]/g, '');

    tokensToRemove.push(fullTag);

    // Try to match against projects first
    const matchedProject = projects.find((p) => {
      const pNorm = p.name.toLowerCase().trim();
      const pSlug = p.name.toLowerCase().replace(/[\s\-_]/g, '');
      return (
        pNorm === normalizedToken ||
        pSlug === slugToken ||
        pNorm.replace(/\s+/g, '') === slugToken
      );
    });

    if (matchedProject) {
      matchedProjectId = matchedProject.id;
      matchedProjectName = matchedProject.name;
      if (matchedProject.folderId) {
        matchedFolderId = matchedProject.folderId;
        const parentFolder = folders.find((f) => f.id === matchedProject.folderId);
        if (parentFolder) matchedFolderName = parentFolder.name;
      }
      continue;
    }

    // Try to match against folders next
    const matchedFolder = folders.find((f) => {
      const fNorm = f.name.toLowerCase().trim();
      const fSlug = f.name.toLowerCase().replace(/[\s\-_]/g, '');
      return (
        fNorm === normalizedToken ||
        fSlug === slugToken ||
        fNorm.replace(/\s+/g, '') === slugToken
      );
    });

    if (matchedFolder) {
      matchedFolderId = matchedFolder.id;
      matchedFolderName = matchedFolder.name;
      // Find a project inside this folder if available
      const childProject = projects.find((p) => p.folderId === matchedFolder.id);
      if (childProject) {
        matchedProjectId = childProject.id;
        matchedProjectName = childProject.name;
      }
      continue;
    }

    // Otherwise, treat as task tag
    tags.push(rawName);
  }

  // Remove matched/unmatched hashtag tokens from title text
  for (const token of tokensToRemove) {
    text = text.replace(token, ' ');
  }

  // Clean extra spaces
  let cleanTitle = text.replace(/\s+/g, ' ').trim();

  // 3. FALLBACK AUTO-CATEGORIZATION IF NO PROJECT SPECIFIED
  if (!matchedProjectId) {
    const autoResult = determineProjectByTitle(cleanTitle || rawTitle, projects, currentBaseProjectId);
    matchedProjectId = autoResult.projectId;
    matchedProjectName = autoResult.matchedProjectName;
    if (matchedProjectId) {
      const projObj = projects.find((p) => p.id === matchedProjectId);
      if (projObj?.folderId) {
        matchedFolderId = projObj.folderId;
        const parentFolder = folders.find((f) => f.id === projObj.folderId);
        if (parentFolder) matchedFolderName = parentFolder.name;
      }
    }
  }

  return {
    cleanTitle: cleanTitle || rawTitle.trim(),
    priority: parsedPriority,
    projectId: matchedProjectId,
    projectName: matchedProjectName,
    folderId: matchedFolderId,
    folderName: matchedFolderName,
    tags,
  };
}
