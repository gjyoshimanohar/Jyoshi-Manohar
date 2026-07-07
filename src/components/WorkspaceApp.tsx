import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
 Check, Trash2, Plus, GripVertical, Calendar as CalendarIcon, Inbox, 
 MoreHorizontal, ChevronDown, ChevronRight, Menu, LogOut, X, Flag, 
 CalendarDays, Search, Folder, Briefcase, Code, Map, Music, 
 Camera, Book, Heart, Star, Zap, Circle, BarChart2, Clock, Timer,
 Flame, HelpCircle, RefreshCw, Bell, Award, Sparkles, FolderOpen,
 Milestone, BookOpen, Smile, Play, Volume2, ShieldCheck, Target,
 GraduationCap, ArrowUpDown, Hourglass, Lightbulb, Minimize2, Maximize2,
 Settings, FileSpreadsheet, Download, Lock, ListTodo, LayoutGrid
} from 'lucide-react';
import { todoService } from '../services/todoService';
import { FileText, MessageSquare, CornerDownRight, Key } from 'lucide-react';
import { Todo, Project, Folder as FolderType, TaskActivity } from '../types';
import { auth } from '../lib/firebase';
import { format, isToday, isTomorrow, isPast, isSameDay, startOfDay, subDays, addHours, addDays, addWeeks, addMonths, addYears, formatDistanceToNow } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { DayPicker } from 'react-day-picker';
import CustomSelect from './CustomSelect';
import ProfileDropdown from './ProfileDropdown';
import UserProfileModal from './UserProfileModal';
import { signOut } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import PomodoroFocus from './PomodoroFocus';
import EisenhowerMatrix from './EisenhowerMatrix';
import HabitsTracker from './HabitsTracker';
import GuidePopup from './GuidePopup';
import { determineProjectByTitle } from '../utils/autoCategorize';
import ChangePasswordModal from './ChangePasswordModal';

const PROJECT_ICONS: Record<string, React.ElementType> = {
 Folder, Briefcase, Code, Map, Music, Camera, Book, Heart, Star, Zap, Smile, Circle
};

const AVAILABLE_ICONS = Object.keys(PROJECT_ICONS);

const FOLDER_COLORS = [
 '#9ca3af', // gray (default)
 '#ef4444', // red
 'var(--color-secondary)', // orange -> gold
 '#eab308', // yellow
 '#22c55e', // green
 '#06b6d4', // cyan
 '#3b82f6', // blue
 '#8b5cf6', // violet
 '#d946ef', // fuchsia
];

const renderIcon = (name: string | undefined | null, defaultColor: string = '#6b7280', className: string = "w-5 h-5 mr-2") => {
 if (name && PROJECT_ICONS[name]) {
 const IconC = PROJECT_ICONS[name];
 return <IconC className={className} style={{ color: defaultColor }} />;
 }
 if (name && name.length <= 4) {
 return <span className={`${className} flex items-center justify-center text-lg leading-none`}>{name}</span>;
 }
 return null;
};

type ViewMode = 'inbox' | 'today' | 'upcoming' | 'project' | 'folder' | 'trends' | 'completed' | 'trash';

// Helper for safety escaping CSV values
const escapeCSV = (val: any): string => {
	if (val === undefined || val === null) return '';
	let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
	str = str.replace(/"/g, '""');
	if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
		return `"${str}"`;
	}
	return str;
};

// Helper to trigger the download in sandboxed iframe environment
const triggerCSVDownload = (csvContent: string, filename: string) => {
	const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

const renderHighlightedTitleForInput = (title: string, repeatInterval?: string | null) => {
  if (!repeatInterval || !title) return title;
  const regex = new RegExp(`(${repeatInterval})`, 'gi');
  const parts = title.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === repeatInterval.toLowerCase() ? (
          <span key={i} className="bg-primary/10 text-primary px-[3px] -mx-[3px] rounded">
            {part}
          </span>
        ) : (
          <span key={i} className="text-[#202020]">{part}</span>
        )
      )}
    </>
  );
};

function parseMarkdown(text: string): string {
  if (!text) return '';
  // 1. Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 2. Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // 3. Italics: *text* or _text_
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // 4. Links: [anchor](url)
  html = html.replace(/\[(.*?)\]\(((?:https?:\/\/|www\.|\/)[^\s)]+)\)/g, (match, anchor, url) => {
    const href = url.startsWith('www.') ? `https://${url}` : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-semibold" onclick="event.stopPropagation()">${anchor}</a>`;
  });

  // 5. Lists (unordered and ordered)
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.substring(2);
      return `<li class="ml-4 list-disc text-gray-750 my-1">${content}</li>`;
    }
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
      const content = orderedMatch[2];
      return `<li class="ml-4 list-decimal text-gray-750 my-1">${content}</li>`;
    }
    return line;
  });

  html = processedLines.join('\n');

  // 6. Code: `code`
  html = html.replace(/`(.*?)`/g, '<code class="bg-gray-100 text-rose-600 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');

  // 7. Line breaks
  html = html.replace(/\n/g, '<br />');

  return html;
}

export default function WorkspaceApp() {
 const [todos, setTodos] = useState<Todo[]>([]);
 const [projects, setProjects] = useState<Project[]>([]);
 const [folders, setFolders] = useState<FolderType[]>([]);
 const [loading, setLoading] = useState(true);
 const [bootstrapping, setBootstrapping] = useState(false);

  
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => 
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };
  
  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
  };
  
  const handleDropToFolder = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      await todoService.updateProject(projectId, { folderId });
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleExportTasksCSV = () => {
    const headers = ['Task ID', 'Title', 'Description', 'Status', 'Priority', 'Project ID', 'Project Name', 'Tags', 'Created At', 'Due Date', 'Deleted At'];
    
    const rows = todos.map(todo => {
      const projName = todo.projectId === 'inbox' 
        ? 'Inbox' 
        : (projects.find(p => p.id === todo.projectId)?.name || 'Inbox');
        
      return [
        todo.id,
        todo.title,
        todo.description || '',
        todo.completed ? 'Completed' : 'Active',
        todo.priority ? `P${todo.priority}` : 'None',
        todo.projectId || 'inbox',
        projName,
        todo.tags ? todo.tags.join(', ') : '',
        todo.createdAt ? new Date(todo.createdAt).toISOString() : '',
        todo.dueDate ? new Date(todo.dueDate).toISOString() : '',
        todo.deletedAt ? new Date(todo.deletedAt).toISOString() : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    triggerCSVDownload(csvContent, `tasks_backup_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportProjectsCSV = () => {
    const headers = ['Project ID', 'Name', 'Color', 'Icon', 'Folder ID', 'Folder Name', 'View Type', 'Created At'];
    
    const rows = projects.map(proj => {
      const fName = proj.folderId 
        ? (folders.find(f => f.id === proj.folderId)?.name || '') 
        : '';
        
      return [
        proj.id,
        proj.name,
        proj.color,
        proj.icon || '',
        proj.folderId || '',
        fName,
        proj.viewType || 'list',
        proj.createdAt ? new Date(proj.createdAt).toISOString() : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    triggerCSVDownload(csvContent, `projects_backup_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportFoldersCSV = () => {
    const headers = ['Folder ID', 'Name', 'Color', 'Created At'];
    
    const rows = folders.map(fold => [
      fold.id,
      fold.name,
      fold.color || '',
      fold.createdAt ? new Date(fold.createdAt).toISOString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    triggerCSVDownload(csvContent, `folders_backup_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportUniversalCSV = () => {
    const lines: string[] = [];
    
    lines.push('--- FOLDERS BACKUP ---');
    lines.push(['Folder ID', 'Name', 'Color', 'Created At'].join(','));
    folders.forEach(fold => {
      lines.push([
        fold.id,
        fold.name,
        fold.color || '',
        fold.createdAt ? new Date(fold.createdAt).toISOString() : ''
      ].map(escapeCSV).join(','));
    });
    
    lines.push('');
    
    lines.push('--- PROJECTS BACKUP ---');
    lines.push(['Project ID', 'Name', 'Color', 'Icon', 'Folder ID', 'Folder Name', 'View Type', 'Created At'].join(','));
    projects.forEach(proj => {
      const fName = proj.folderId ? (folders.find(f => f.id === proj.folderId)?.name || '') : '';
      lines.push([
        proj.id,
        proj.name,
        proj.color,
        proj.icon || '',
        proj.folderId || '',
        fName,
        proj.viewType || 'list',
        proj.createdAt ? new Date(proj.createdAt).toISOString() : ''
      ].map(escapeCSV).join(','));
    });
    
    lines.push('');
    
    lines.push('--- TASKS BACKUP ---');
    lines.push(['Task ID', 'Title', 'Description', 'Status', 'Priority', 'Project ID', 'Project Name', 'Tags', 'Created At', 'Due Date', 'Deleted At'].join(','));
    todos.forEach(todo => {
      const projName = todo.projectId === 'inbox' 
        ? 'Inbox' 
        : (projects.find(p => p.id === todo.projectId)?.name || 'Inbox');
      lines.push([
        todo.id,
        todo.title,
        todo.description || '',
        todo.completed ? 'Completed' : 'Active',
        todo.priority ? `P${todo.priority}` : 'None',
        todo.projectId || 'inbox',
        projName,
        todo.tags ? todo.tags.join(', ') : '',
        todo.createdAt ? new Date(todo.createdAt).toISOString() : '',
        todo.dueDate ? new Date(todo.dueDate).toISOString() : '',
        todo.deletedAt ? new Date(todo.deletedAt).toISOString() : ''
      ].map(escapeCSV).join(','));
    });

    triggerCSVDownload(lines.join('\n'), `universal_workspace_backup_${new Date().toISOString().split('T')[0]}.csv`);
  };

 // Far-Left Nav Dock Tab Selection
 // 'tasks' (default checklist), 'matrix' (Kanban quadrants), 'habits' (streaks), 'focus' (sound timers), 'starred' (P1 values), 'search' (extended filters)
 const [activeAppTab, setActiveAppTab] = useState<'tasks' | 'matrix' | 'habits' | 'focus' | 'starred' | 'search' | 'settings'>('tasks');

 // Sidebar controls
 const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
 const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const [isProgressBannerExpanded, setIsProgressBannerExpanded] = useState(false);
 const [dailyTaskGoal, setDailyTaskGoal] = useState<number>(5);
 const [searchQuery, setSearchQuery] = useState('');
 const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjectIdInModal, setEditingProjectIdInModal] = useState<string | null>(null);
  const [activeProjectMenu, setActiveProjectMenu] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
 const [newProjectName, setNewProjectName] = useState('');
 const [newProjectIcon, setNewProjectIcon] = useState('');

 const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);
 const [listColor, setListColor] = useState('#1a2b58');
 const [listViewType, setListViewType] = useState<'list' | 'kanban' | 'timeline'>('list');
 const [listFolderId, setListFolderId] = useState<string>('none');
 const [listType, setListType] = useState<'task' | 'note'>('task');
 const [listSmartOption, setListSmartOption] = useState<'all' | 'none'>('all');
 const [isCreatingFolderInModal, setIsCreatingFolderInModal] = useState(false);
 const [newFolderNameInModal, setNewFolderNameInModal] = useState('');

 // Guide Popup Toggle
 const [showHelpGuide, setShowHelpGuide] = useState(false);

 const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);

 // Task Deletion / Decline reason state
 const [deletingTodoState, setDeletingTodoState] = useState<{ id: string; viewModeAtTime: ViewMode } | null>(null);
 const [taskDeclineOrDeleteReason, setTaskDeclineOrDeleteReason] = useState<string>("");

 // Sync animation helper
 const [isSyncing, setIsSyncing] = useState(false);
 const [syncNotice, setSyncNotice] = useState(false);
 const [autoProjectNotice, setAutoProjectNotice] = useState<string | null>(null);

 // Edit Project State
 const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
 const [editProjectName, setEditProjectName] = useState('');
 const [editProjectIcon, setEditProjectIcon] = useState('');
 const [editProjectFolderId, setEditProjectFolderId] = useState<string | null>(null);
 const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);

 // Detail Drawer pickers
 const [editingTodoDateId, setEditingTodoDateId] = useState<string | null>(null);
 const [editingTodoDeadlineId, setEditingTodoDeadlineId] = useState<string | null>(null);
 const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
 const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
 const [detailTab, setDetailTab] = useState<'details' | 'activity'>('details');
 const [initialTitle, setInitialTitle] = useState<string>('');

 useEffect(() => {
   if (selectedTodoId) {
     setDetailTab('details');
   }
 }, [selectedTodoId]);

 // Folder Creating
 const [isAddingFolder, setIsAddingFolder] = useState(false);
 const [newFolderName, setNewFolderName] = useState('');
 const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
 const [editFolderName, setEditFolderName] = useState('');
 const [editFolderColor, setEditFolderColor] = useState('#9ca3af');
 const [showEditFolderColorPicker, setShowEditFolderColorPicker] = useState(false);

 // Standard standalone Pomo State inside Tasks view
 const [isTimerOpen, setIsTimerOpen] = useState(false);
 const [timeRemaining, setTimeRemaining] = useState(25 * 60);
 const [timerRunning, setTimerRunning] = useState(false);
 const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');

 // Add Task State in tasks loop
 const [isAddingTask, setIsAddingTask] = useState(false);
 const [newTaskTitle, setNewTaskTitle] = useState('');
 const [newTaskDesc, setNewTaskDesc] = useState('');
 const [newTaskSubtasks, setNewTaskSubtasks] = useState<string[]>([]);
 const [newTaskProject, setNewTaskProject] = useState<string>('inbox');
 const [newTaskPriority, setNewTaskPriority] = useState<number>(4);
 const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
 const [newTaskDeadline, setNewTaskDeadline] = useState<Date | undefined>(undefined);
 const [showDatePicker, setShowDatePicker] = useState(false);
 const [showNotesField, setShowNotesField] = useState(false);
 const [showSubtasksField, setShowSubtasksField] = useState(false);
  const [newTaskRepeatInterval, setNewTaskRepeatInterval] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null>(null);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
 const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
 const [showProjectPicker, setShowProjectPicker] = useState(false);
 const [showPriorityPicker, setShowPriorityPicker] = useState(false);

 // Detail Modal Picker States
 const [showDetailDatePicker, setShowDetailDatePicker] = useState(false);
 const [showDetailPriorityPicker, setShowDetailPriorityPicker] = useState(false);
 const [showDetailRepeatPicker, setShowDetailRepeatPicker] = useState(false);
 const [showDetailBlockingPicker, setShowDetailBlockingPicker] = useState(false);
 const [isNotesPreviewMode, setIsNotesPreviewMode] = useState(false);

 // Collapsible Checked Category State (Replicates visual checked list expander)
 const [isCompletedSectionExpanded, setIsCompletedSectionExpanded] = useState(true);
 const [isCountdownExpanded, setIsCountdownExpanded] = useState(true);
 const [isPendingExpanded, setIsPendingExpanded] = useState(true);
 const [sortOrder, setSortOrder] = useState<'priority' | 'date'>('priority');
 const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
 const [showSmartTips, setShowSmartTips] = useState(false);

 // Kanban Board Custom Section Action States
 const [isAddingSection, setIsAddingSection] = useState(false);
 const [newSectionValue, setNewSectionValue] = useState('');
 const [editingSectionName, setEditingSectionName] = useState<string | null>(null);
 const [editingSectionValue, setEditingSectionValue] = useState('');
 const [activeSectionMenu, setActiveSectionMenu] = useState<string | null>(null);
 const [activeAddingSection, setActiveAddingSection] = useState<string | null>(null);
 const [newTaskTitleInline, setNewTaskTitleInline] = useState('');
 const [newTaskDescInline, setNewTaskDescInline] = useState('');
 const [newTaskSubtasksInline, setNewTaskSubtasksInline] = useState<string[]>([]);
 const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
 const [draggingOverSection, setDraggingOverSection] = useState<string | null>(null);

 // Tags and Kanban placeholder variables to satisfy legacy types / bypassed conditional loops safely
 const sidebarSelectedTag: string | null = null;
 const kanbanSelectedTag: string | null = null;
 const collapsedKanbanColumns: Record<string, boolean> = {};
 const newTaskTagsInline = '';
 const setSidebarSelectedTag = (val: any) => {};
 const setKanbanSelectedTag = (val: any) => {};
 const setCollapsedKanbanColumns = (val: any) => {};
 const setNewTaskTagsInline = (val: string) => {};

 // Standard Pomo countdown ticker in standard task loops
 useEffect(() => {
 let interval: NodeJS.Timeout;
 if (timerRunning && timeRemaining > 0) {
 interval = setInterval(() => {
 setTimeRemaining(prev => prev - 1);
 }, 1000);
 } else if (timeRemaining === 0) {
 setTimerRunning(false);
 if (timerMode === 'work') {
 setTimerMode('break');
 setTimeRemaining(5 * 60);
 } else {
 setTimerMode('work');
 setTimeRemaining(25 * 60);
 }
 }
 return () => clearInterval(interval);
 }, [timerRunning, timeRemaining, timerMode]);

 // Synchronous bootstrapper
 const ensureTickTickBootstrap = async (uid: string) => {
 const bootstrappedKey = `ticktick_bootstrapped_${uid}`;
 if (localStorage.getItem(bootstrappedKey)) return;

 setBootstrapping(true);
 try {
 // Create Study Folder
 const studyFolder = await todoService.createFolder("Study", uid);
 if (studyFolder) {
 // Research Items project (P3 blue)
 const research = await todoService.createProject("Research Items", "#3b82f6", uid, "Book");
 if (research) {
 await todoService.updateProject(research.id, { folderId: studyFolder.id });
 await todoService.createTodo({
 title: "Study research methodologies",
 userId: uid,
 completed: false,
 projectId: research.id,
 priority: 3,
 dueDate: Date.now(),
 tags: ["Research"],
 });
 }

 // CA Final project (P1 red/green bullet)
 const caFinal = await todoService.createProject("CA Final", "#22c55e", uid, "Award");
 if (caFinal) {
 await todoService.updateProject(caFinal.id, { folderId: studyFolder.id });
 
 await todoService.createTodo({
 title: "Audit Class/Study",
 userId: uid,
 completed: false,
 projectId: caFinal.id,
 priority: 1, // Red
 dueDate: Date.now(),
 tags: ["CAFinal"],
 });

 await todoService.createTodo({
 title: "AFM Class/Study",
 userId: uid,
 completed: false,
 projectId: caFinal.id,
 priority: 1, // Red
 dueDate: Date.now(),
 tags: ["CAFinal"],
 });

 await todoService.createTodo({
 title: "FR Class/Study",
 userId: uid,
 completed: false,
 projectId: caFinal.id,
 priority: 1, // Red
 dueDate: Date.now(),
 tags: ["CAFinal"],
 });
 }
 
 const spiritual = await todoService.createProject("Spiritual", "#d946ef", uid, "Heart");
 if (spiritual) {
 await todoService.updateProject(spiritual.id, { folderId: studyFolder.id });
 await todoService.createTodo({
 title: "Morning Meditation",
 userId: uid,
 completed: false,
 projectId: spiritual.id,
 priority: 4,
 dueDate: Date.now(),
 tags: ["Meditation"],
 });
 }
 }

 await todoService.createProject("Work", "#ef4444", uid, "Briefcase");
 await todoService.createProject("Exercise", "#eab308", uid, "Zap");

 await todoService.createTodo({
 title: "Welcome to your new workspace! Try creating a task.",
 userId: uid,
 completed: false,
 projectId: null, // Inbox
 priority: 4,
 dueDate: Date.now(),
 tags: ["Welcome"],
 });

 localStorage.setItem(bootstrappedKey, "true");
 } catch (err) {
 console.error("Failed to bootstrap data", err);
 } finally {
 setBootstrapping(false);
 }
 };

 // Firestore Listeners Subscription
 useEffect(() => {
 if (!auth.currentUser) return;
 
 let unsubTodos = () => {};
 let unsubProjects = () => {};
 let unsubFolders = () => {};

 try {
 unsubTodos = todoService.subscribeToUserTodos(auth.currentUser.uid, (fetchedTodos) => {
 setTodos(fetchedTodos);
 setLoading(false);
 });
 unsubProjects = todoService.subscribeToProjects(auth.currentUser.uid, (fetchedProjects) => {
 setProjects(fetchedProjects);
 });
 unsubFolders = todoService.subscribeToFolders(auth.currentUser.uid, (fetchedFolders) => {
 setFolders(fetchedFolders);
 });
 } catch(e) {
 console.error(e);
 setLoading(false);
 }
 
 return () => {
 unsubTodos();
 unsubProjects();
 unsubFolders();
 };
 }, []);

 // Bootstrap hook if data are empty after load completes
 useEffect(() => {
 if (loading || !auth.currentUser || bootstrapping) return;
 if (projects.length === 0 && folders.length === 0) {
 ensureTickTickBootstrap(auth.currentUser.uid);
 }
 }, [loading, projects.length, folders.length, auth.currentUser]);

 // Keep track of tasks we've already notified about in this session
 const notifiedTaskIds = useRef<Set<string>>(new Set());

 // Ask for notification permission on mount
 useEffect(() => {
 if ("Notification" in window && Notification.permission === "default") {
 Notification.requestPermission().catch(console.error);
 }
 }, []);

 // Check for upcoming or reached due dates
 useEffect(() => {
 if (!("Notification" in window) || Notification.permission !== "granted") return;

 const checkReminders = () => {
 const now = Date.now();
 todos.forEach((todo) => {
 if (!todo.completed && todo.dueDate && !notifiedTaskIds.current.has(todo.id)) {
 // Trigger notification if due date is reached or approaching (e.g., within 30 minutes)
 const timeUntilDue = todo.dueDate - now;
 // Notify if it's within 30 minutes from now, up to 1 day overdue
 if (timeUntilDue > -86400000 && timeUntilDue <= 30 * 60 * 1000) {
 try {
 new Notification("Task Reminder", {
 body: `The task "${todo.title}" is due ${timeUntilDue <= 0 ? 'now' : 'soon'}.`,
 });
 notifiedTaskIds.current.add(todo.id);
 } catch (e) {
 console.error("Error showing notification:", e);
 }
 }
 }
 });
 };

 // Check immediately and then every minute
 checkReminders();
 const interval = setInterval(checkReminders, 60000);
 return () => clearInterval(interval);
 }, [todos]);

 const handleLogout = () => signOut(auth);

 const handleClearAllData = async () => {
 if (confirm('Are you sure you want to clear ALL your tasks, projects, and folders? This cannot be undone.')) {
 try {
 for (const todo of todos) {
 await todoService.deleteTodo(todo.id);
 }
 for (const project of projects) {
 await todoService.deleteProject(project.id);
 }
 for (const folder of folders) {
 await todoService.deleteFolder(folder.id);
 }
 localStorage.removeItem(`ticktick_bootstrapped_${auth.currentUser?.uid}`);
 alert('All data cleared successfully.');
 } catch (err) {
 console.error('Failed to clear data', err);
 alert('Failed to clear some data');
 }
 }
 };

 const handleAddTask = async () => {
 if (!newTaskTitle.trim() || !auth.currentUser) return;
 
 const currentBaseProjId = (viewMode === 'project' && selectedProjectId) ? selectedProjectId : 'inbox';
 const { projectId: targetProjectId, matchedProjectName } = determineProjectByTitle(
 newTaskTitle.trim(),
 projects,
 currentBaseProjId
 );

 await todoService.createTodo({
 title: newTaskTitle.trim(),
 description: newTaskDesc.trim(),
 userId: auth.currentUser.uid,
 completed: false,
 projectId: targetProjectId,
 priority: newTaskPriority,
 dueDate: newTaskDueDate ? newTaskDueDate.getTime() : null,
 deadline: newTaskDeadline ? newTaskDeadline.getTime() : null,
 });

 if (matchedProjectName && targetProjectId !== currentBaseProjId) {
 setAutoProjectNotice(`Auto-categorized task to "${matchedProjectName}"`);
 setTimeout(() => setAutoProjectNotice(null), 4000);
 }
 
 setNewTaskTitle('');
 setNewTaskDesc('');
 setNewTaskDeadline(undefined);
 setIsAddingTask(false);
 };

 const handleAddTodayTask = async (title: string) => {
 if (!title.trim() || !auth.currentUser) return;
 
 const currentBaseProjId = (viewMode === 'project' && selectedProjectId) ? selectedProjectId : 'inbox';
 const { projectId: targetProjectId, matchedProjectName } = determineProjectByTitle(
 title.trim(),
 projects,
 currentBaseProjId
 );

 await todoService.createTodo({
 title: title.trim(),
 userId: auth.currentUser.uid,
 completed: false,
 projectId: targetProjectId,
 priority: 4,
 dueDate: Date.now(),
 });

 if (matchedProjectName && targetProjectId !== currentBaseProjId) {
 setAutoProjectNotice(`Auto-categorized task to "${matchedProjectName}"`);
 setTimeout(() => setAutoProjectNotice(null), 4000);
 }
 };

 const handleUnifiedQuickAdd = async (titleStr: string) => {
 if (!titleStr.trim() || !auth.currentUser) return;
 
 const isTodayView = viewMode === 'today';
 const isUpcomingView = viewMode === 'upcoming';
 const currentBaseProjId = (viewMode === 'project' && selectedProjectId) ? selectedProjectId : 'inbox';
 
 // Auto-detect hashtags: e.g. "FR Class #Study"
 const hashtagRegex = /#(\w+)/g;
 const detectedTags: string[] = [];
 let match;
 while ((match = hashtagRegex.exec(titleStr)) !== null) {
 detectedTags.push(match[1]);
 }
 // Clean hashtags from titleStr
 const cleanedTitle = titleStr.replace(hashtagRegex, '').trim();

 const { projectId: targetProjectId, matchedProjectName } = determineProjectByTitle(
 cleanedTitle,
 projects,
 currentBaseProjId
 );

 // Calculate due date based on user state or view mode fallback
 let dueDateVal: number | null = null;
 if (newTaskDueDate) {
 dueDateVal = startOfDay(newTaskDueDate).getTime();
 } else {
 // Keep view tab fallback if no custom date is chosen
 if (isTodayView) {
 dueDateVal = startOfDay(new Date()).getTime();
 } else if (isUpcomingView) {
 dueDateVal = startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000)).getTime();
 }
 }

 await todoService.createTodo({
 title: cleanedTitle,
 description: newTaskDesc.trim(),
 subtasks: newTaskSubtasks.length > 0 ? newTaskSubtasks.map(t => ({ id: Math.random().toString(), title: t, completed: false })) : undefined,
 userId: auth.currentUser.uid,
 completed: false,
 projectId: targetProjectId,
 priority: newTaskPriority,
 dueDate: dueDateVal,
 repeatInterval: newTaskRepeatInterval,
      tags: detectedTags.length > 0 ? detectedTags : undefined,
 });

 if (matchedProjectName && targetProjectId !== currentBaseProjId) {
 setAutoProjectNotice(`Auto-categorized task to "${cleanedTitle !== titleStr ? cleanedTitle : matchedProjectName}"`);
 setTimeout(() => setAutoProjectNotice(null), 4000);
 }

 // Reset task creator state values
 setNewTaskTitle('');
 setNewTaskDesc('');
 setNewTaskSubtasks([]);
 setNewTaskPriority(4);
      setNewTaskRepeatInterval(null);
 setNewTaskDueDate(undefined);
 setShowDatePicker(false);
 setShowPriorityPicker(false);
 setShowNotesField(false);
 setShowSubtasksField(false);
 };

 const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setConfirmDialog({
 isOpen: true,
 message: 'Are you sure you want to delete this project?',
 onConfirm: async () => {
 await todoService.deleteProject(projectId);
 if (selectedProjectId === projectId) {
 setViewMode('inbox');
 setSelectedProjectId(null);
 }
 setConfirmDialog(null);
 }
 });
 };

 const handleMoveProjectToFolder = async (projectId: string, folderId: string | null) => {
 await todoService.updateProject(projectId, { folderId });
 };

 const handleCreateFolder = async (name: string) => {
 if (!name.trim() || !auth.currentUser) return;
 await todoService.createFolder(name.trim(), auth.currentUser.uid);
 };

 const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setConfirmDialog({
 isOpen: true,
 message: 'Are you sure you want to delete this folder? Inside projects will be disconnected.',
 onConfirm: async () => {
 await todoService.deleteFolder(folderId);
 // Reset and remove connection to this folder
 const inside = projects.filter(p => p.folderId === folderId);
 for (const p of inside) {
 await todoService.updateProject(p.id, { folderId: null });
 }
 setConfirmDialog(null);
 }
 });
 };

 const handleSaveEditFolder = async (folderId: string, e: React.FormEvent) => {
 e.preventDefault();
 if (!editFolderName.trim()) return;
 await todoService.updateFolder(folderId, { name: editFolderName.trim(), color: editFolderColor });
 setEditingFolderId(null);
 setShowEditFolderColorPicker(false);
 };

 const handleStartEditFolder = (folder: FolderType, e: React.MouseEvent) => {
 e.stopPropagation();
 setEditingFolderId(folder.id);
 setEditFolderName(folder.name);
 setEditFolderColor(folder.color || '#9ca3af');
 };

 const handleStartEditProject = (project: Project, e: React.MouseEvent) => {
 e.stopPropagation();
 setEditingProjectId(project.id);
 setEditProjectName(project.name);
 setEditProjectIcon(project.icon || '');
 setEditProjectFolderId(project.folderId || '');
 };

 const handleSaveEditProject = async (projectId: string, e: React.FormEvent) => {
 e.preventDefault();
 if (!editProjectName.trim()) return;
 await todoService.updateProject(projectId, { 
 name: editProjectName.trim(), 
 icon: editProjectIcon || null,
 folderId: editProjectFolderId || null
 });
 setEditingProjectId(null);
 };

 const handleToggleTodo = async (todo: Todo) => {
 const isCompleting = !todo.completed;
 const now = Date.now();
 const newActivity = {
   id: Math.random().toString(36).substring(2, 9),
   type: 'status' as const,
   field: 'Status',
   oldValue: todo.completed ? 'Completed' : 'Active',
   newValue: isCompleting ? 'Completed' : 'Active',
   createdAt: now,
   user: 'You'
 };
 const updatedActivities = [...(todo.activities || []), newActivity];
 await todoService.updateTodo(todo.id, { completed: isCompleting, activities: updatedActivities });

 if (isCompleting && todo.repeatInterval) {
 const baseDate = todo.dueDate ? new Date(todo.dueDate) : new Date();
 let nextDate = new Date(baseDate);

 if (todo.repeatInterval === 'daily') {
 nextDate = addDays(nextDate, 1);
 } else if (todo.repeatInterval === 'weekly') {
 nextDate = addWeeks(nextDate, 1);
 } else if (todo.repeatInterval === 'monthly') {
 nextDate = addMonths(nextDate, 1);
 }

 const nextDueDateTimestamp = startOfDay(nextDate).getTime();

 // Avoid duplicate repeating tasks if tomorrow/future repeat task is already scheduled
 const isAlreadyScheduled = todos.some(t => 
 !t.completed && 
 !t.deletedAt && 
 t.title.trim().toLowerCase() === todo.title.trim().toLowerCase() && 
 t.projectId === todo.projectId && 
 t.repeatInterval === todo.repeatInterval && 
 t.dueDate && startOfDay(new Date(t.dueDate)).getTime() === nextDueDateTimestamp
 );

 if (!isAlreadyScheduled && auth.currentUser) {
 await todoService.createTodo({
 title: todo.title,
 description: todo.description,
 userId: auth.currentUser.uid,
 completed: false,
 projectId: todo.projectId,
 priority: todo.priority || 4,
 dueDate: nextDueDateTimestamp,
 deadline: todo.deadline,
 tags: todo.tags,
 sectionName: todo.sectionName,
 repeatInterval: todo.repeatInterval
 });
 }
 }
 };

 // Kanban Board custom sections helper handlers
 const formatCardDate = (timestamp: number | null | undefined) => {
 if (!timestamp) return null;
 const dateObj = new Date(timestamp);
 if (isToday(dateObj)) return "Today";
 if (isTomorrow(dateObj)) return "Tomorrow";
 const yesterday = new Date();
 yesterday.setDate(yesterday.getDate() - 1);
 if (isSameDay(dateObj, yesterday)) return "Yesterday";
 return format(dateObj, 'MMM dd');
 };

 const handleCreateSection = async () => {
 if (!newSectionValue.trim() || !selectedProjectId) return;
 const nameTrimmed = newSectionValue.trim();
 const currentProj = projects.find(p => p.id === selectedProjectId);
 if (!currentProj) return;
 const currentSections = currentProj.sections || [];
 if (currentSections.includes(nameTrimmed)) {
 setIsAddingSection(false);
 return;
 }
 const updatedSections = [...currentSections, nameTrimmed];
 await todoService.updateProject(selectedProjectId, { sections: updatedSections });
 setNewSectionValue('');
 setIsAddingSection(false);
 };

 const handleSaveRenameSection = async (oldName: string) => {
 if (!editingSectionValue.trim() || !selectedProjectId) return;
 const newName = editingSectionValue.trim();
 if (newName === oldName) {
 setEditingSectionName(null);
 return;
 }
 const currentProj = projects.find(p => p.id === selectedProjectId);
 if (!currentProj) return;
 
 const updatedSections = (currentProj.sections || []).map(s => s === oldName ? newName : s);
 await todoService.updateProject(selectedProjectId, { sections: updatedSections });
 
 const matchingTodos = todos.filter(t => t.projectId === selectedProjectId && t.sectionName === oldName);
 for (const t of matchingTodos) {
 await todoService.updateTodo(t.id, { sectionName: newName });
 }
 setEditingSectionName(null);
 };

 const handleDeleteSection = async (sectionName: string) => {
 if (!selectedProjectId) return;
 const currentProj = projects.find(p => p.id === selectedProjectId);
 if (!currentProj) return;
 
 const updatedSections = (currentProj.sections || []).filter(s => s !== sectionName);
 await todoService.updateProject(selectedProjectId, { sections: updatedSections });
 
 const matchingTodos = todos.filter(t => t.projectId === selectedProjectId && t.sectionName === sectionName);
 for (const t of matchingTodos) {
 await todoService.updateTodo(t.id, { sectionName: null });
 }
 };

 const handleAddTaskToSection = async (sectionName: string, titleStr: string, tagsStr: string = '', descStr: string = '', subtasksArr: string[] = []) => {
 if (!titleStr.trim() || !auth.currentUser || !selectedProjectId) return;
 
 const tagsArray = tagsStr.trim()
 ? tagsStr.split(',').map(t => t.trim()).filter(Boolean)
 : [];
 
 await todoService.createTodo({
 title: titleStr.trim(),
 description: descStr.trim() || undefined,
 subtasks: subtasksArr.length > 0 ? subtasksArr.map(t => ({ id: Math.random().toString(), title: t, completed: false })) : undefined,
 userId: auth.currentUser.uid,
 completed: false,
 projectId: selectedProjectId,
 priority: 4,
 dueDate: Date.now(),
 sectionName: sectionName === "Not Sectioned" ? null : sectionName,
 tags: tagsArray.length > 0 ? tagsArray : undefined,
 });
 };

 const handleMoveTodoToSection = async (todoId: string, sectionName: string) => {
 const targetSection = sectionName === "Not Sectioned" ? null : sectionName;
 await todoService.updateTodo(todoId, { sectionName: targetSection });
 };

 const handleDeleteTodo = (todoId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setDeletingTodoState({ id: todoId, viewModeAtTime: viewMode });
 setTaskDeclineOrDeleteReason("No longer applicable or required");
 };

 const handleConfirmDeleteTodo = async () => {
 if (!deletingTodoState) return;
 const { id: todoId, viewModeAtTime } = deletingTodoState;
 try {
 const reasonToSave = taskDeclineOrDeleteReason.trim() || "No longer applicable or required";
 
 // Save reason to task's metadata
 await todoService.updateTodo(todoId, {
 deleteReason: reasonToSave,
 declineReason: reasonToSave,
 metadata: {
 deleteReason: reasonToSave,
 declineReason: reasonToSave,
 deletedAt: Date.now()
 }
 });
 
 if (viewModeAtTime === 'trash') {
 await todoService.deleteTodo(todoId);
 } else {
 await todoService.softDeleteTodo(todoId);
 }
 
 setDeletingTodoState(null);
 setTaskDeclineOrDeleteReason("");
 } catch (error) {
 console.error("Error deleting task:", error);
 }
 };

 const handleRestoreTodo = async (todoId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 await todoService.restoreTodo(todoId);
 };

 const handleTriggerSync = () => {
 setIsSyncing(true);
 setTimeout(() => {
 setIsSyncing(false);
 setSyncNotice(true);
 setTimeout(() => setSyncNotice(false), 3000);
 }, 1200);
 };

 // Streaks calculator occurrence helper
 const getNextOccurrenceDate = (currentDate: Date, pattern: string) => {
 if (pattern === 'none') return null;
 const next = new Date(currentDate);
 if (pattern === 'hourly') next.setHours(next.getHours() + 1);
 else if (pattern === 'daily') next.setDate(next.getDate() + 1);
 else if (pattern === 'weekly') next.setDate(next.getDate() + 7);
 else if (pattern === 'monthly') next.setMonth(next.getMonth() + 1);
 else if (pattern === 'yearly') next.setFullYear(next.getFullYear() + 1);
 return next;
 };

 // Trends calculation
 const getTrendsData = () => {
 const data = [];
 for (let i = 6; i >= 0; i--) {
 const d = subDays(new Date(), i);
 const dayStart = startOfDay(d).getTime();
 const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
 
 const createdThatDay = todos.filter(t => t.createdAt >= dayStart && t.createdAt <= dayEnd);
 const completedTasks = createdThatDay.filter(t => t.completed).length;
 const pendingTasks = createdThatDay.filter(t => !t.completed).length;
 
 data.push({
 name: format(d, 'MMM dd'),
 completed: completedTasks,
 pending: pendingTasks,
 total: createdThatDay.length
 });
 }
 return data;
 };

 // Filter Tasks
 const getFilteredTodos = (includeCompleted = false) => {
 let baseTodos = todos;
 
 if (viewMode === 'trash') {
 baseTodos = todos.filter(t => t.deletedAt);
 } else if (viewMode === 'completed') {
 baseTodos = todos.filter(t => t.completed && !t.deletedAt);
 } else {
 if (includeCompleted) {
 baseTodos = todos.filter(t => !t.deletedAt);
 } else {
 baseTodos = todos.filter(t => !t.completed && !t.deletedAt);
 }
 }

 if (searchQuery.trim()) {
 const lowerQuery = searchQuery.toLowerCase();
 baseTodos = baseTodos.filter(t => 
 t.title.toLowerCase().includes(lowerQuery) || 
 (t.description && t.description.toLowerCase().includes(lowerQuery))
 );
 }

 switch (viewMode) {
 case 'inbox':
 return baseTodos.filter(t => !t.projectId || t.projectId === 'inbox');
 case 'today':
 return baseTodos.filter(t => {
 const due = t.dueDate ? new Date(t.dueDate) : null;
 const dl = t.deadline ? new Date(t.deadline) : null;
 return (due && (isToday(due) || isPast(due))) || (dl && (isToday(dl) || isPast(dl)));
 });
 case 'upcoming':
 return baseTodos.filter(t => {
 const due = t.dueDate ? new Date(t.dueDate) : null;
 const dl = t.deadline ? new Date(t.deadline) : null;
 return (due && (!isPast(due) || isToday(due))) || (dl && (!isPast(dl) || isToday(dl)));
 });
 case 'project':
      return baseTodos.filter(t => t.projectId === selectedProjectId);
    case 'folder':
      const folderProjectIds = projects.filter(p => p.folderId === selectedFolderId).map(p => p.id);
      return baseTodos.filter(t => t.projectId && folderProjectIds.includes(t.projectId));
 case 'completed':
 case 'trash':
 case 'trends':
 default:
 return baseTodos;
 }
 };

 const filteredTodos = getFilteredTodos();
 
 // Sorting: High priority first, then date
 filteredTodos.sort((a, b) => {
 if ((a.priority || 4) !== (b.priority || 4)) return (a.priority || 4) - (b.priority || 4);
 const dateA = a.deadline || a.dueDate;
 const dateB = b.deadline || b.dueDate;
 if (dateA && dateB) return dateA - dateB;
 if (dateA) return -1;
 if (dateB) return 1;
 return 0;
 });

 const allActiveViewTodos = getFilteredTodos(true);
 allActiveViewTodos.sort((a, b) => {
 if (sortOrder === 'priority') {
 if ((a.priority || 4) !== (b.priority || 4)) return (a.priority || 4) - (b.priority || 4);
 const dateA = a.deadline || a.dueDate;
 const dateB = b.deadline || b.dueDate;
 if (dateA && dateB) return dateA - dateB;
 if (dateA) return -1;
 if (dateB) return 1;
 return 0;
 } else {
 const dateA = a.deadline || a.dueDate;
 const dateB = b.deadline || b.dueDate;
 if (dateA && dateB) {
 if (dateA !== dateB) return dateA - dateB;
 return (a.priority || 4) - (b.priority || 4);
 }
 if (dateA) return -1;
 if (dateB) return 1;
 return (a.priority || 4) - (b.priority || 4);
 }
 });

 const currentViewType = (viewMode === 'project' && selectedProjectId)
   ? (projects.find(p => p.id === selectedProjectId)?.viewType || 'list')
   : listViewType;

 const getViewTitle = () => {
 switch (viewMode) {
 case 'inbox': return 'Inbox';
 case 'today': return 'Today';
 case 'upcoming': return 'Upcoming';
 case 'trends': return 'Trends & Analytics';
 case 'completed': return 'Completed Tasks';
 case 'trash': return 'Trash';
 case 'project': {
      const p = projects.find(p => p.id === selectedProjectId);
      if (!p) return 'Project';
      return (
        <span className="flex items-center">
          {renderIcon(p.icon, p.color, "w-6 h-6 mr-2")}
          {p.name}
        </span>
      );
    }
    case 'folder': {
      const f = folders.find(f => f.id === selectedFolderId);
      if (!f) return 'Folder';
      return (
        <span className="flex items-center">
          <Folder className="w-6 h-6 mr-2 text-primary" />
          {f.name}
        </span>
      );
    }
 }
 };

 const getPriorityColor = (priority?: number) => {
 switch(priority) {
 case 1: return 'text-red-400 fill-red-400/40 hover:text-red-500 hover:fill-red-400/60';
 case 2: return 'text-orange-400 fill-orange-400/40 hover:text-orange-500 hover:fill-orange-400/60';
 case 3: return 'text-blue-400 fill-blue-400/40 hover:text-blue-500 hover:fill-blue-400/60';
 default: return 'text-slate-400';
 }
 };

 // Bullet priorities for Custom checkbox circular surrounds matching the TickTick mockup
 const getPriorityCheckboxStyle = (priority?: number) => {
 switch (priority) {
 case 1: return 'border-red-300 hover:bg-red-50/50 text-red-400 bg-red-50/20';
 case 2: return 'border-orange-300 hover:bg-orange-50/50 text-orange-400 bg-orange-50/20';
 case 3: return 'border-blue-300 hover:bg-blue-50/50 text-blue-400 bg-blue-50/20';
 default: return 'border-gray-200 hover:bg-gray-50 text-gray-400';
 }
 };

 const formatTaskDate = (time?: number | null) => {
 if (!time) return '';
 const d = new Date(time);
 if (isToday(d)) return 'Today';
 if (isTomorrow(d)) return 'Tomorrow';
 return format(d, 'MMM d');
 };

 const formatTaskDeadline = (time?: number | null) => {
 if (!time) return '';
 return format(new Date(time), 'EEE, MMM d');
 };

 const getProjectPendingCount = (projectId: string) => {
 return todos.filter(t => !t.completed && !t.deletedAt && t.projectId === projectId).length;
 };

 const renderItemProjectBadge = (todo: Todo) => {
 if (!todo.projectId || todo.projectId === 'inbox') return null;
 const p = projects.find(proj => proj.id === todo.projectId);
 if (!p) return null;

 let IconComponent = BookOpen;
 if (p.name.toLowerCase() === 'ca final') {
 IconComponent = GraduationCap;
 } else if (p.name.toLowerCase() === 'spiritual') {
 IconComponent = Smile;
 } else if (p.name.toLowerCase() === 'work') {
 IconComponent = Briefcase;
 } else if (p.name.toLowerCase() === 'exercise') {
 IconComponent = Zap;
 } else if (p.name.toLowerCase() === 'research items') {
 IconComponent = BookOpen;
 }

 return (
 <span className="flex items-center text-xs sm:text-xs font-semibold text-gray-500 bg-transparent transition-colors leading-none shrink-0 border border-gray-100 px-1.5 py-0.5 rounded-full select-none">
 <IconComponent className="w-3 h-3 mr-1 text-gray-400" style={{ color: p.color || '#6B7280' }} />
 <span style={{ color: p.color ? `${p.color}e0` : '#6B7280' }}>{p.name}</span>
 </span>
 );
 };

 // Study items counter inside Study Collapsible folder
 const getFolderPendingCount = (folderId: string) => {
 const folderProjects = projects.filter(p => p.folderId === folderId);
 let count = 0;
 folderProjects.forEach(p => {
 count += getProjectPendingCount(p.id);
 });
 return count;
 };

 // Render project individual listings in direct sidebars
 const renderProjectItem = (project: Project) => (
 <div key={project.id} draggable onDragStart={(e) => handleDragStart(e, project.id)} className="group relative flex items-center justify-between pl-2 cursor-grab active:cursor-grabbing">
 {editingProjectId === project.id ? (
 <form onSubmit={(e) => handleSaveEditProject(project.id, e)} className="flex items-center space-x-2 w-full p-1 bg-white border border-gray-100 rounded shadow-sm z-10">
 <input
 type="text"
 autoFocus
 value={editProjectName}
 onChange={(e) => setEditProjectName(e.target.value)}
 className="text-xs focus:ring-1 focus:ring-primary rounded border px-1.5 py-1 w-full outline-none text-black"
 />
 <button type="submit" disabled={!editProjectName.trim()} className="p-1 text-white bg-primary rounded">
 <Check className="w-3 h-3" />
 </button>
 <button type="button" onClick={() => setEditingProjectId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
 <X className="w-3 h-3" />
 </button>
 </form>
 ) : (
 <div className="flex items-center justify-between w-full group">
 <button
 onDragOver={(e) => {
   if (e.dataTransfer.types.includes("text/plain")) {
     e.preventDefault();
   }
 }}
 onDrop={async (e) => {
   const taskId = e.dataTransfer.getData("text/plain");
   if (taskId) {
     e.preventDefault();
     setTodos(prev => prev.map(t => t.id === taskId ? { ...t, projectId: project.id, sectionName: null } : t));
     await todoService.updateTodo(taskId, { projectId: project.id, sectionName: null });
   }
 }}
 onClick={() => { 
 setViewMode('project'); 
 setSelectedProjectId(project.id); 
 setIsAddingTask(false); 
 setActiveAppTab('tasks');
 if (window.innerWidth < 768) setIsSidebarOpen(false);
 }}
 className={`flex-grow flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors ${viewMode === 'project' && selectedProjectId === project.id && activeAppTab === 'tasks' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
 >
 <div className="flex items-center space-x-2.5 truncate text-[#333333]">
 {/* Colored bullet circle dot mimicking TickTick */}
 <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color || '#9ca3af' }} />
 <span className="truncate">{project.name}</span>
 </div>
 
 {/* Project tasks count badge */}
 <div className="flex items-center">
 {getProjectPendingCount(project.id) > 0 && (
 <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.2 rounded-full mr-1.5">
 {getProjectPendingCount(project.id)}
 </span>
 )}
 </div>
 </button>

 {/* Over-Hover options trigger */}
 <div className="absolute right-1 hidden group-hover:flex items-center bg-[#fafafa] pl-1.5 relative">
 <span 
 onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(activeProjectMenu === project.id ? null : project.id); }} 
 className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 mr-0.5 cursor-pointer"
 title="Options"
 >
 <MoreHorizontal className="w-3 h-3" />
 </span>
 {activeProjectMenu === project.id && (
  <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 text-xs">
   <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); }}></div>
   <button onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); setEditingProjectIdInModal(project.id); setNewProjectName(project.name); setListColor(project.color || '#1a2b58'); setListFolderId(project.folderId || 'none'); setListViewType(project.viewType || 'list'); setIsProjectModalOpen(true); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700">Edit</button>
   <button onClick={async (e) => { e.stopPropagation(); setActiveProjectMenu(null); await todoService.updateProject(project.id, { isPinned: !project.isPinned }); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700">{project.isPinned ? 'Unpin' : 'Pin'}</button>
   <button onClick={async (e) => { e.stopPropagation(); setActiveProjectMenu(null); await todoService.createProject(project.name + ' (Copy)', project.color, project.userId, project.icon, project.folderId, project.viewType, project.sections); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700">Duplicate</button>
   <button onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); handleDeleteProject(project.id, e); }} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600">Delete</button>
  </div>
 )}
 </div>
 </div>
 )}
 </div>
 );

 const renderProjectList = () => (
 <div className="space-y-0.5 mt-2">
 {folders.map(folder => (
 <div key={folder.id} className="mb-2.5 bg-gray-50/50 rounded-xl p-1.5 relative border border-gray-100/40">
 {editingFolderId === folder.id ? (
 <form onSubmit={(e) => handleSaveEditFolder(folder.id, e)} className="flex items-center space-x-1 p-1 bg-white border border-gray-100 rounded-lg shadow-sm">
 <div className="relative flex-1">
 <input
 type="text"
 autoFocus
 value={editFolderName}
 onChange={(e) => setEditFolderName(e.target.value)}
 className="text-xs px-2 pr-7 py-1 border focus:border-primary focus:ring-1 focus:ring-primary rounded w-full outline-none text-black font-semibold"
 />
 <button
 type="button"
 onClick={() => setActiveEmojiPicker(activeEmojiPicker === `edit-folder-${folder.id}` ? null : `edit-folder-${folder.id}`)}
 className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 rounded-full"
 >
 <Smile className="w-3.5 h-3.5" />
 </button>
 <AnimatePresence>
 {activeEmojiPicker === `edit-folder-${folder.id}` && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute left-0 top-full mt-2 z-[150] shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setEditFolderName(prev => emojiData.emoji + " " + prev);
                                          setActiveEmojiPicker(null);
                                          }}
                                          width={220}
 height={350}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 <button type="submit" disabled={!editFolderName.trim()} className="text-white bg-primary p-1 rounded-md shrink-0">
 <Check className="w-3.5 h-3.5" />
 </button>
 <button type="button" onClick={() => { setEditingFolderId(null); setActiveEmojiPicker(null); }} className="text-gray-400 hover:bg-gray-100 p-1 rounded-md shrink-0">
 <X className="w-3.5 h-3.5" />
 </button>
 </form>
 ) : (
 <div className="flex items-center justify-between p-1 rounded group" onDrop={(e) => handleDropToFolder(e, folder.id)} onDragOver={handleDragOver}>
 <div className="flex items-center space-x-1 w-full cursor-pointer" onClick={() => {
  setViewMode('folder');
  setSelectedFolderId(folder.id);
  setSelectedProjectId(null);
  setIsAddingTask(false);
  setActiveAppTab('tasks');
  if (window.innerWidth < 768) setIsSidebarOpen(false);
 }}>
 <div onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }} className="p-0.5 hover:bg-gray-200 rounded">
  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 hover:text-gray-600 shrink-0 transition-transform ${expandedFolders.includes(folder.id) ? '' : '-rotate-90'}`} />
 </div>
 <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
 <span className={`text-xs font-medium truncate max-w-[120px] ${viewMode === 'folder' && selectedFolderId === folder.id ? 'text-primary' : 'text-gray-700'}`}>{folder.name}</span>
 {getFolderPendingCount(folder.id) > 0 && (
 <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-1 py-0.2 rounded-full">
 {getFolderPendingCount(folder.id)}
 </span>
 )}
 </div>
 <div className="opacity-0 group-hover:opacity-100 flex items-center">
 <span 
 onClick={(e) => handleStartEditFolder(folder, e)} 
 className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 mr-0.5 cursor-pointer"
 title="Rename folder"
 >
 <MoreHorizontal className="w-3 h-3" />
 </span>
 <span 
 onClick={(e) => handleDeleteFolder(folder.id, e)}
 className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 cursor-pointer"
 title="Delete folder"
 >
 <Trash2 className="w-3 h-3" />
 </span>
 </div>
 </div>
 )}
 {/* Subproject listings inside Folder */}
  {expandedFolders.includes(folder.id) && (
 <div className="pl-3.5 border-l border-gray-200 ml-3.5 mt-1 space-y-0.5">
 {projects.filter(p => p.folderId === folder.id).map(renderProjectItem)}
 {projects.filter(p => p.folderId === folder.id).length === 0 && (
 <div className="text-xs text-gray-400 pl-1 py-1 italic">Empty folders list</div>
 )}
 </div>
 )}
 </div>
 ))}
 
 <div onDrop={(e) => handleDropToFolder(e, null)} onDragOver={handleDragOver} className="min-h-[20px]">
  {/* Direct Lists that are not nested inside Folders */}
 {projects.filter(p => !p.folderId).map(renderProjectItem)}
 
 </div>
  {projects.length === 0 && folders.length === 0 && !isProjectModalOpen && (
 <div className="text-xs text-center text-gray-400 italic py-2">No lists created</div>
 )}
 </div>
 );

 if (loading) {
 return (
 <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white min-h-[300px]">
 <div className="w-8 h-8 border-3 border-[#1a2b58] border-t-transparent rounded-full animate-spin"></div>
 <span className="text-xs text-gray-400 mt-4 font-semibold tracking-wider">Syncing with Cloud...</span>
 </div>
 );
 }

 // Tasks Filter counters
 const inboxCount = todos.filter(t => !t.completed && !t.deletedAt && (!t.projectId || t.projectId === 'inbox')).length;
 const todayCount = todos.filter(t => !t.completed && !t.deletedAt && ((t.dueDate && (isToday(new Date(t.dueDate)) || isPast(new Date(t.dueDate)))) || (t.deadline && (isToday(new Date(t.deadline)) || isPast(new Date(t.deadline)))))).length;

 return (
 <div className="flex flex-1 overflow-hidden h-full relative font-sans text-black">
 
 {/* FAR-LEFT SLIM APP DOCK (Iconic TickTick styling) */}
 <div className="hidden md:flex flex-col items-center py-5 bg-[#F4F5F7] border-r border-[#E3E4E6] w-[60px] shrink-0 justify-between select-none">
 <div className="flex flex-col items-center space-y-5 w-full">
 {/* User profile avatar on top with Active ring indicators */}
 <div className="relative group cursor-pointer hover:scale-105 transition-all">
 <div className="w-9 h-9 rounded-full bg-[#1a2b58] text-white flex items-center justify-center text-sm shadow border border-white">
 {auth.currentUser?.email?.charAt(0).toUpperCase()}
 </div>
 <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-yellow-400 text-xs flex items-center justify-center rounded-full text-black ring-1 ring-white" title="VIP Account">
 ★
 </div>
 <div className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl whitespace-nowrap z-[100] transition-all origin-left">
 {auth.currentUser?.email} (Pro Account)
 </div>
 </div>

 <div className="h-px bg-gray-300/60 w-8 my-1" />

 {/* Active app subtabs lists */}
 <button 
 onClick={() => { setActiveAppTab('tasks'); setViewMode('today'); }}
 className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'tasks' ? 'bg-[#1a2b58]/10 text-[#1a2b58]' : 'text-gray-500 hover:bg-gray-200'}`}
 title="Tasks Checklist"
 >
 <ShieldCheck className="w-5 h-5" />
 <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
 Tasks Checklist
 </span>
 </button>

 <button 
 onClick={() => setActiveAppTab('matrix')}
 className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'matrix' ? 'bg-[#1a2b58]/10 text-[#1a2b58]' : 'text-gray-500 hover:bg-gray-200'}`}
 title="Eisenhower Matrix"
 >
 <GripVertical className="w-5 h-5" />
 <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
 Eisenhower Matrix
 </span>
 </button>

 <button 
 onClick={() => setActiveAppTab('habits')}
 className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'habits' ? 'bg-[#1a2b58]/10 text-[#1a2b58]' : 'text-gray-500 hover:bg-gray-200'}`}
 title="Habit Streaks"
 >
 <Target className="w-5 h-5" />
 <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
 Habits tracker
 </span>
 </button>

 <button 
 onClick={() => setActiveAppTab('focus')}
 className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'focus' ? 'bg-[#1a2b58]/10 text-[#1a2b58]' : 'text-gray-500 hover:bg-gray-200'}`}
 title="Focus Timer Space"
 >
 <Clock className="w-5 h-5" />
 <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
 Timer Space
 </span>
 </button>

 <button 
 onClick={() => setActiveAppTab('starred')}
 className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'starred' ? 'bg-[#1a2b58]/10 text-[#1a2b58]' : 'text-gray-500 hover:bg-gray-200'}`}
 title="Starred Goals"
 >
 <Star className="w-5 h-5" />
 <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
 Starred Goals
 </span>
 </button>

 <button 
 onClick={() => setActiveAppTab('search')}
 className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'search' ? 'bg-[#1a2b58]/10 text-[#1a2b58]' : 'text-gray-500 hover:bg-gray-200'}`}
 title="Search Index"
 >
 <Search className="w-5 h-5" />
 <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
 Search Filters
 </span>
 </button>
 </div>

 {/* Sync, alerts & Guidance at the bottom of left docker */}
 <div className="flex flex-col items-center space-y-4 w-full">
		<button 
			onClick={() => setActiveAppTab('settings')}
			className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'settings' ? 'bg-[#1a2b58]/10 text-[#1a2b58]' : 'text-gray-500 hover:bg-gray-200'}`}
			title="Settings & Export"
		>
			<Settings className="w-4 h-4" />
			<span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
				Settings & Export
			</span>
		</button>
 <button 
 onClick={handleTriggerSync}
 className={`p-2.5 text-gray-500 hover:bg-gray-200 rounded-xl relative group ${isSyncing ? 'animate-spin text-[#1a2b58]' : ''}`}
 title="Cloud Synchronize"
 >
 <RefreshCw className="w-4 h-4" />
 <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
 Sync Network
 </span>
 </button>

 <div className="relative group cursor-pointer hover:bg-gray-200 p-2 text-gray-500 rounded-xl">
 <Bell className="w-4 h-4" />
 <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
 <div className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-white border-none text-gray-700 text-xs p-3 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] z-50 whitespace-nowrap origin-left transition-all text-left">
 <span className="font-medium text-[#1a2b58] block mb-1">Alert Inbox</span>
 <span>All systems fully connected online ✓</span>
 </div>
 </div>

 <button 
 onClick={() => setShowHelpGuide(true)} 
 className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-xl group relative"
 title="TickTick Guideline Help"
 >
 <HelpCircle className="w-4 h-4" />
 <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
 Help Manual
 </span>
 </button>
 </div>
 </div>

 {/* MOBILE APP TABS BOTTOM NAVIGATION (Aesthetic excellence) */}
 <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 grid grid-cols-7 gap-0.5 z-[100] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
	<button 
	onClick={() => setActiveAppTab('settings')}
	className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'settings' ? 'text-[#1a2b58] bg-[#1a2b58]/5' : 'text-gray-400'}`}
	>
	<Settings className="w-5 h-5" />
	<span className="text-xs font-medium mt-1">Settings</span>
	</button>
 <button 
 onClick={() => { setActiveAppTab('tasks'); setViewMode('today'); }}
 className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'tasks' ? 'text-[#1a2b58] bg-[#1a2b58]/5' : 'text-gray-400'}`}
 >
 <ShieldCheck className="w-5 h-5" />
 <span className="text-xs font-medium mt-1">Checklist</span>
 </button>
 <button 
 onClick={() => setActiveAppTab('matrix')}
 className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'matrix' ? 'text-[#1a2b58] bg-[#1a2b58]/5' : 'text-gray-400'}`}
 >
 <GripVertical className="w-5 h-5" />
 <span className="text-xs font-medium mt-1">Matrix</span>
 </button>
 <button 
 onClick={() => setActiveAppTab('habits')}
 className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'habits' ? 'text-[#1a2b58] bg-[#1a2b58]/5' : 'text-gray-400'}`}
 >
 <Target className="w-5 h-5" />
 <span className="text-xs font-medium mt-1">Habits</span>
 </button>
 <button 
 onClick={() => setActiveAppTab('focus')}
 className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'focus' ? 'text-[#1a2b58] bg-[#1a2b58]/5' : 'text-gray-400'}`}
 >
 <Clock className="w-5 h-5" />
 <span className="text-xs font-medium mt-1">Focus</span>
 </button>
 <button 
 onClick={() => setActiveAppTab('starred')}
 className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'starred' ? 'text-[#1a2b58] bg-[#1a2b58]/5' : 'text-gray-400'}`}
 >
 <Star className="w-5 h-5" />
 <span className="text-xs font-medium mt-1">Starred</span>
 </button>
 <button 
 onClick={() => setActiveAppTab('search')}
 className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'search' ? 'text-[#1a2b58] bg-[#1a2b58]/5' : 'text-gray-400'}`}
 >
 <Search className="w-5 h-5" />
 <span className="text-xs font-medium mt-1">Search</span>
 </button>
 </div>

 {/* MIDDLE SIDEBAR - LIST SELECTORS & MAIN CONTROLS (Only holds active tasks hierarchy) */}
 <AnimatePresence>
 {isSidebarOpen && activeAppTab === 'tasks' && (
 <>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setIsSidebarOpen(false)}
 className="md:hidden absolute inset-0 z-20 bg-black/20 backdrop-blur-sm"
 />
 <motion.aside
 initial={{ width: 0, opacity: 0 }}
 animate={{ width: 240, opacity: 1 }}
 exit={{ width: 0, opacity: 0 }}
 className="absolute md:relative bg-[#FAFAFA] border-r border-[#ECECEC] shrink-0 h-full overflow-y-auto z-30 select-none pb-20 md:pb-6"
 >
 <div className="p-4 w-[240px]">
 {/* Inbox today metrics filters */}
 <nav className="space-y-0.5">
 <button
 onClick={() => { setViewMode('today'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setSidebarSelectedTag(null); }}
 className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'today' ? 'bg-[#FFEFEE] text-[#e53935] ' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}
 >
 <div className="flex items-center space-x-2.5">
 <CalendarIcon className="w-4 h-4 text-green-600" />
 <span>Today</span>
 </div>
 {todayCount > 0 && <span className="text-xs text-gray-500 font-medium bg-white/65 px-1.5 py-0.2 rounded">{todayCount}</span>}
 </button>

 <button
 onClick={() => { setViewMode('upcoming'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setSidebarSelectedTag(null); }}
 className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'upcoming' ? 'bg-primary/5 text-[#1a2b58] ' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}
 >
 <div className="flex items-center space-x-2.5">
 <CalendarDays className="w-4 h-4 text-purple-600" />
 <span>Next 7 Days</span>
 </div>
 </button>

 <button
 onClick={() => { setViewMode('inbox'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setSidebarSelectedTag(null); }}
 className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'inbox' ? 'bg-blue-50 text-blue-800 ' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}
 >
 <div className="flex items-center space-x-2.5">
 <Inbox className="w-4 h-4 text-[#1a2b58]" />
 <span>Inbox</span>
 </div>
 {inboxCount > 0 && <span className="text-xs text-gray-500 font-medium bg-white/65 px-1.5 py-0.2 rounded">{inboxCount}</span>}
 </button>
 </nav>

 <div className="h-px bg-gray-200/60 my-4" />

 {/* Lists section heading */}
 <div className="mb-2">
 <div className="flex items-center justify-between px-2 text-gray-400 text-xs uppercase tracking-widest mb-2 group">
 <span>Projects</span>
							<button onClick={() => { 
    setEditingProjectIdInModal(null);
    setNewProjectName('');
    setListColor('#1a2b58');
    setListViewType('list');
    setListFolderId('none');
    setIsProjectModalOpen(true);
  }} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors hidden group-hover:block" title="Add Project"><Plus className="w-3.5 h-3.5" /></button>
 </div>
 
 {/* Adding Folder inline card */}
 {isAddingFolder && (
 <form 
 onSubmit={async (e) => {
 e.preventDefault();
 handleCreateFolder(newFolderName);
 setNewFolderName('');
 setIsAddingFolder(false);
 }}
 className="flex items-center p-1 bg-white border border-gray-100 shadow rounded-lg mb-2.5 space-x-1.5"
 >
 <div className="relative flex-1">
 <input
 type="text"
 autoFocus
 placeholder="Folder name"
 value={newFolderName}
 onChange={(e) => setNewFolderName(e.target.value)}
 className="text-xs focus:ring-1 focus:ring-primary rounded border px-2 pr-7 py-1 outline-none w-full text-black"
 />
 <button
 type="button"
 onClick={() => setActiveEmojiPicker(activeEmojiPicker === "folder" ? null : "folder")}
 className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 rounded-full"
 >
 <Smile className="w-3.5 h-3.5" />
                      </button>
                      <AnimatePresence>
                        {activeEmojiPicker === "folder" && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute left-0 top-full mt-2 z-[150] shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setNewFolderName(prev => emojiData.emoji + " " + prev);
                                          setActiveEmojiPicker(null);
                                          }}
                                          width={220}
 height={350}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 <button type="submit" disabled={!newFolderName.trim()} className="text-white bg-green-500 p-1.5 rounded disabled:opacity-50">
 <Check className="w-3 h-3" />
 </button>
 <button type="button" onClick={() => setIsAddingFolder(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded">
 <X className="w-3 h-3" />
 </button>
 </form>
 )}

 
 {renderProjectList()}
 </div>

 {/* Completed trash anchors */}
 <div className="h-px bg-gray-200/60 my-4" />
 <div className="space-y-0.5">
 <button
 onClick={() => { setViewMode('completed'); selectedProjectId && setSelectedProjectId(null); setSidebarSelectedTag(null); }}
 className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'completed' ? 'bg-gray-200/50 text-gray-900 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
 >
 <div className="flex items-center space-x-2.5">
 <Check className="w-4 h-4 text-green-500" />
 <span>Completed Logs</span>
 </div>
 </button>
 <button
 onClick={() => { setViewMode('trash'); selectedProjectId && setSelectedProjectId(null); setSidebarSelectedTag(null); }}
 className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'trash' ? 'bg-red-50 text-red-600 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
 >
 <div className="flex items-center space-x-2.5">
 <Trash2 className="w-4 h-4 text-red-400" />
 <span>Trash bin</span>
 </div>
 </button>
 </div>

 <div className="mt-12 border-t border-gray-200 pt-4">
 
 </div>
 </div>
 </motion.aside>
 </>
 )}
 </AnimatePresence>

 {/* SYNC TOAST FLOATING BANNER */}
 <AnimatePresence>
 {syncNotice && (
 <motion.div 
 initial={{ opacity: 0, y: -40, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -40 }}
 className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white font-semibold text-xs py-2.5 px-5 rounded-full shadow-2xl z-[150] flex items-center border border-gray-800"
 >
 <ShieldCheck className="w-4 h-4 mr-2 text-green-400" />
 <span>Sync Complete: Cloud databases up-to-date!</span>
 </motion.div>
 )}
 </AnimatePresence>

 {/* AUTO PROJECT CATEGORIZATION TOAST */}
 <AnimatePresence>
 {autoProjectNotice && (
 <motion.div 
 initial={{ opacity: 0, y: -40, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -40 }}
 className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white font-semibold text-xs py-2.5 px-5 rounded-full shadow-2xl z-[150] flex items-center border border-gray-800"
 >
 <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
 <span>{autoProjectNotice}</span>
 </motion.div>
 )}
 </AnimatePresence>

 {/* CORE DISPLAY WINDOW VIEW */}
 <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} isAdmin={true} />
      <main className="flex-1 overflow-y-auto bg-white flex flex-col items-center pb-24 md:pb-6 relative h-full">
 {/* Header container */}
 <div className="w-full max-w-[900px] px-6 py-5 md:py-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
 <div className="flex items-center">
 {activeAppTab === 'tasks' && (
 <button 
 onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
 className="mr-3 p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
 title="Toggle Workspace Sidebar"
 >
 <Menu className="w-4.5 h-4.5" />
 </button>
 )}
 <h1 className="text-xl text-gray-900 flex items-center tracking-tight">
 {activeAppTab === 'tasks' ? getViewTitle() : activeAppTab.toUpperCase()}
 {activeAppTab === 'tasks' && viewMode === 'today' && (
 <span className="text-xs text-gray-400 font-normal ml-2.5 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full select-none">
 {format(new Date(), 'EEE MMM d')}
 </span>
 )}
 </h1>
 </div>

 {/* Large dynamic quick actions toolbar right */}
 <div className="flex items-center space-x-2.5">
 {activeAppTab === 'tasks' && (
 <>
 {/* Search */}
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
 <Search className="h-3.5 w-3.5 text-gray-400" />
 </span>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search tasks..."
 className="block w-40 md:w-48 pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-gray-50 transition-all text-black"
 />
 {searchQuery && (
 <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-2 flex.items-center">
 <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 mt-2" />
 </button>
 )}
 </div>


 </>
 )}


 {/* Smart Tips bulb */}
 <button 
 onClick={() => { setShowSmartTips(!showSmartTips); setIsHeaderMenuOpen(false); }}
 className={`p-1.5 border hover:bg-gray-50 text-gray-600 rounded-lg shadow-sm transition-all relative ${showSmartTips ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'border-gray-200 bg-white'}`}
 title="Smart Categories Tip"
 >
 <Lightbulb className="w-4 h-4" />
 </button>

 {/* Sorting config toggle */}
 <button 
 onClick={() => { 
 setSortOrder(prev => prev === 'priority' ? 'date' : 'priority');
 setAutoProjectNotice(`Sorted active view by ${sortOrder === 'priority' ? 'due date' : 'priority priority'}`);
 setTimeout(() => setAutoProjectNotice(null), 3000);
 }}
 className={`p-1.5 border hover:bg-gray-50 text-gray-600 rounded-lg shadow-sm transition-all flex items-center ${sortOrder === 'date' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 bg-white'}`}
 title={`Sorting: ${sortOrder === 'priority' ? 'High Priorities First' : 'Due Date First'}`}
 >
 <ArrowUpDown className="w-4 h-4" />
 <span className="text-xs font-medium ml-1 hidden sm:inline uppercase">{sortOrder}</span>
 </button>

 
        {/* View options switcher (replacing Progress trigger button) */}
        {activeAppTab === 'tasks' && (
          <div className="flex items-center bg-gray-100/80 border border-gray-200 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={async () => {
                if (viewMode === 'project' && selectedProjectId) {
                  await todoService.updateProject(selectedProjectId, { viewType: 'list' });
                } else {
                  setListViewType('list');
                }
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentViewType === 'list'
                  ? 'bg-white border border-gray-200/50 text-[#1a2b58] shadow-sm'
                  : 'border border-transparent text-gray-400 hover:text-gray-600'
              }`}
              title="Sequential List View"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={async () => {
                if (viewMode === 'project' && selectedProjectId) {
                  await todoService.updateProject(selectedProjectId, { viewType: 'kanban' });
                } else {
                  setListViewType('kanban');
                }
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentViewType === 'kanban'
                  ? 'bg-white border border-gray-200/50 text-[#1a2b58] shadow-sm'
                  : 'border border-transparent text-gray-400 hover:text-gray-600'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        )}

{/* Sync trigger mini button */}
 <button 
 onClick={handleTriggerSync}
 className="p-1.5 border border-gray-200 hover:bg-gray-50 text-gray-650 rounded-lg shadow-sm bg-white transition-all"
 title="Cloud Sync Database"
 >
 <RefreshCw className="w-4 h-4" />
 </button>

 {/* More details / Options menu triple dot */}
 <div className="relative">
 <button 
 onClick={() => { setIsHeaderMenuOpen(!isHeaderMenuOpen); setShowSmartTips(false); }}
 className={`p-1.5 border hover:bg-gray-50 text-gray-600 rounded-lg shadow-sm transition-all bg-white ${isHeaderMenuOpen ? 'border-primary' : 'border-gray-200'}`}
 title="Viewport Options"
 >
 <MoreHorizontal className="w-4 h-4" />
 </button>

 {isHeaderMenuOpen && (
 <div className="absolute top-8 right-0 w-52 bg-white border-none rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 z-50 text-left scale-95 origin-top-right transition-transform animate-in fade-in duration-100">
 <div className="text-xs uppercase tracking-wider text-gray-400 px-2 py-1 border-b mb-1">List operations</div>
 <button 
 onClick={() => { setIsProgressBannerExpanded(!isProgressBannerExpanded); setIsHeaderMenuOpen(false); }}
 className="w-full text-left text-xs p-2 text-gray-700 hover:bg-gray-50 flex items-center rounded-lg"
 >
 <Target className="w-3.5 h-3.5 mr-2 text-gray-500" />
 {isProgressBannerExpanded ? 'Hide progress tracker' : 'Show progress tracker'}
 </button>
 <button 
 onClick={() => { handleTriggerSync(); setIsHeaderMenuOpen(false); }}
 className="w-full text-left text-xs p-2 text-gray-700 hover:bg-gray-50 flex items-center rounded-lg"
 >
 <RefreshCw className="w-3.5 h-3.5 mr-2 text-gray-500" />
 Force database sync
 </button>
 <button 
 onClick={async () => {
 const completedInView = allActiveViewTodos.filter(t => t.completed);
 for (const todo of completedInView) {
 await todoService.deleteTodo(todo.id);
 }
 setIsHeaderMenuOpen(false);
 setAutoProjectNotice("Cleared completed viewport tasks");
 setTimeout(() => setAutoProjectNotice(null), 3000);
 }}
 className="w-full text-left text-xs p-2 text-red-600 hover:bg-red-50 flex items-center rounded-lg font-medium"
 >
 <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
 Clear Completed
 </button>
 </div>
 )}
 </div>
 <ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} onViewProfile={() => setShowProfileModal(true)} className="ml-1" />
 </div>
 </div>

 {/* Smart auto-categorization keywords study tip modal overlay */}
 {showSmartTips && (
 <div className="w-full max-w-[900px] px-6 mt-1 flex justify-end">
 <div className="w-full max-w-[360px] bg-white border border-yellow-200 rounded-2xl shadow-2xl p-4 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200">
 <div className="flex items-center justify-between mb-2 pb-1 border-b border-yellow-50">
 <h4 className="text-xs font-medium text-gray-800 flex items-center">
 <Lightbulb className="w-4 h-4 text-yellow-500 mr-1.5" />
 Smart Keywords Reference
 </h4>
 <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowSmartTips(false)}>
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 <p className="font-medium text-base text-gray-500 leading-normal mb-3">
 Type any keyword in your task title to instantly auto-categorize into its perfect project!
 </p>
 <div className="space-y-2">
 <div className="text-xs bg-red-50/50 p-2 rounded-lg border border-red-100 flex items-start gap-1.5">
 <GraduationCap className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
 <div>
 <span className="font-medium text-red-900 block">CA Final</span>
 <span className="text-gray-500 font-mono">audit, ca, final, accounts, revision, test, exam</span>
 </div>
 </div>
 <div className="text-xs bg-purple-50/50 p-2 rounded-lg border border-purple-100 flex items-start gap-1.5">
 <Smile className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
 <div>
 <span className="font-medium text-purple-900 block">Spiritual</span>
 <span className="text-gray-500 font-mono">spiritual, bible, meditation, pray, devotional</span>
 </div>
 </div>
 <div className="text-xs bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex items-start gap-1.5">
 <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
 <div>
 <span className="font-medium text-blue-900 block">Research Items</span>
 <span className="text-gray-500 font-mono">study, research, paper, assignment, read, lecture</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 
  {/* Progress Tracker popup overlay */}
  {isProgressBannerExpanded && (
    <div className="w-full max-w-[900px] px-6 mt-1 flex justify-end absolute right-0 z-50">
      <div className="w-full max-w-[360px] bg-white border border-[#1a2b58]/10 rounded-2xl shadow-2xl p-4.5 text-left animate-in fade-in slide-in-from-top-3 duration-200">
        {(() => {
          const totalViewCount = allActiveViewTodos.length;
          const completedViewCount = allActiveViewTodos.filter(t => t.completed).length;
          const completionPercent = totalViewCount > 0 ? Math.round((completedViewCount / totalViewCount) * 100) : 0;
          
          const circleRadius = 22;
          const circleCircumference = 2 * Math.PI * circleRadius;
          const circleDashoffset = circleCircumference - (completionPercent / 100) * circleCircumference;

          const pendingViewCount = totalViewCount - completedViewCount;

          const projColor = (viewMode === 'project' ? projects.find(p => p.id === selectedProjectId)?.color : null) || '#1a2b58';

          return (
            <>
              <style>{`
                .dynamic-progress-text {
                  color: var(--banner-accent);
                }
                .dynamic-progress-text-80 {
                  color: color-mix(in srgb, var(--banner-accent) 80%, transparent);
                }
                .dynamic-progress-text-70 {
                  color: color-mix(in srgb, var(--banner-accent) 70%, transparent);
                }
                .dynamic-progress-divider {
                  background-color: color-mix(in srgb, var(--banner-accent) 10%, transparent);
                }
              `}</style>
              <div style={{ '--banner-accent': projColor } as React.CSSProperties}>
                <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                  <h4 className="text-xs uppercase tracking-widest dynamic-progress-text-80 font-bold flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    {viewMode === 'project' 
                      ? `${projects.find(p => p.id === selectedProjectId)?.name || 'Project'} Progress`
                      : `${getViewTitle()} Progress`
                    }
                  </h4>
                  <button className="text-gray-400 hover:text-gray-600 cursor-pointer" onClick={() => setIsProgressBannerExpanded(false)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex flex-col gap-4">
                  <p className="text-gray-500 text-xs font-semibold leading-relaxed">
                    {totalViewCount > 0
                      ? `${completedViewCount} of ${totalViewCount} tasks completed (${completionPercent}%)`
                      : "No tasks created in this view yet"
                    }
                  </p>
                  
                  <div className="flex items-center justify-between">
                    {totalViewCount > 0 && (
                      <span className="text-[10px] dynamic-progress-text-70 font-mono uppercase tracking-wider font-semibold max-w-[65%]">
                        {completionPercent === 100 
                          ? "🎉 All targets hit! Phenomenal work!" 
                          : completionPercent >= 75 
                          ? "🎯 Almost there, keep pushing!" 
                          : completionPercent >= 50 
                          ? "⚡ Halfway mark cleared!" 
                          : "🚀 Build momentum and start finishing!"}
                      </span>
                    )}
                    
                    <div className="relative flex items-center justify-center w-14 h-14 shrink-0 transition-transform duration-300">
                      <svg className="w-14 h-14 transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r={circleRadius}
                          className="text-gray-200/70"
                          strokeWidth="4.5"
                          stroke="currentColor"
                          fill="transparent"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r={circleRadius}
                          className="dynamic-progress-text transition-all duration-500 ease-in-out"
                          strokeWidth="4.5"
                          strokeDasharray={circleCircumference}
                          strokeDashoffset={circleDashoffset}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold font-mono dynamic-progress-text">
                        {completionPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {totalViewCount > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-col gap-2.5">
                      <div className="h-px w-full dynamic-progress-divider mb-1"></div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
                              <Check className="w-2.5 h-2.5 text-[#10B981]" />
                            </div>
                            <span className="text-xs font-medium text-gray-700">Completed</span>
                            <span className="text-xs font-bold font-mono text-[#10B981] ml-1">{completedViewCount}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                              <Clock className="w-2.5 h-2.5 text-blue-500" />
                            </div>
                            <span className="text-xs font-medium text-gray-700">Remaining</span>
                            <span className="text-xs font-bold font-mono text-blue-600 ml-1">{pendingViewCount}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Visual Distribution Bar */}
                      <div className="h-2 w-full bg-blue-100/50 rounded-full mt-1 flex overflow-hidden">
                        <div 
                          className="h-full bg-[#10B981] transition-all duration-1000 ease-out" 
                          style={{ width: `${completionPercent}%` }}
                        ></div>
                        <div 
                          className="h-full bg-blue-100/30 transition-all duration-1000 ease-out" 
                          style={{ width: `${100 - completionPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  )}

{/* WORKSPACE SECTIONS RENDER ROUTERS */}
 <div className="w-full max-w-[900px] px-6 py-6 flex-1">
 {/* 1. SECTOR: UNIFIED FLAT TIKTIK MAIN LISTVIEW */}
 {activeAppTab === 'tasks' && (
 <div className="text-left w-full">
 {viewMode === 'trends' ? (
 <div className="py-8 bg-white border border-[#f0f0f0] rounded-2xl shadow-xl p-6 mb-8 text-center max-w-2xl mx-auto">
 <h2 className="text-sm text-gray-500 mb-6 uppercase tracking-wider">Historical Analytics (Last 7 Days)</h2>
 <div className="h-64 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={getTrendsData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
 <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
 <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
 <Bar dataKey="completed" name="Completed Tasks" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
 <Bar dataKey="pending" name="Pending Tasks" fill="#DBEAFE" radius={[4, 4, 0, 0]} maxBarSize={40} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 ) : (
 <div className="w-full">
    

 {currentViewType === 'kanban' ? (
 <div className="w-full">
 {/* ELEGANT TAGS/LABELS FILTER BAR FOR ORGANIZATIONAL FILTERING */}
 {(() => {
 const projectTodos = allActiveViewTodos.filter(t => !t.deletedAt);
 const uniqueProjectTags = Array.from(new Set(projectTodos.flatMap(t => t.tags || [])));
 
 if (uniqueProjectTags.length === 0) return null;
 return (
 <div className="bg-gray-50/50 border border-gray-150 rounded-2xl p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
 <div className="flex items-center gap-2.5 overflow-x-auto select-none no-scrollbar" style={{ scrollbarWidth: 'none' }}>
 <span className="text-xs text-gray-400 uppercase tracking-widest shrink-0">
 Filter by label:
 </span>
 <button
 onClick={() => setKanbanSelectedTag(null)}
 className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
 !kanbanSelectedTag 
 ? 'bg-[#1a2b58] text-white shadow-sm' 
 : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
 }`}
 >
 All ({projectTodos.length})
 </button>
 {uniqueProjectTags.map((tag) => {
 const count = projectTodos.filter(t => t.tags && t.tags.includes(tag)).length;
 return (
 <button
 key={tag}
 onClick={() => setKanbanSelectedTag(kanbanSelectedTag === tag ? null : tag)}
 className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
 kanbanSelectedTag === tag 
 ? 'bg-[#1a2b58] text-white shadow-sm' 
 : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
 }`}
 >
 <span>🏷️ {tag}</span>
 <span className={`text-xs font-medium rounded-full px-1.5 ${
 kanbanSelectedTag === tag 
 ? 'bg-white/25 text-white' 
 : 'bg-gray-100 text-gray-500'
 }`}>
 {count}
 </span>
 </button>
 );
 })}
 </div>
 
 {kanbanSelectedTag && (
 <button 
 onClick={() => setKanbanSelectedTag(null)}
 className="text-xs font-medium text-[#1a2b58] hover:text-primary hover:opacity-80 shrink-0 text-left sm:text-right"
 >
 Clear filter
 </button>
 )}
 </div>
 );
 })()}

 <div className="w-full max-w-full overflow-x-auto text-left py-2" style={{ scrollbarWidth: 'thin' }}>
 <div className="flex gap-6 items-start h-full pb-6 min-w-max select-none">
 {(() => {
 const currentProj = projects.find(p => p.id === selectedProjectId);
 const rawSections = currentProj?.sections || [];
 // Replicate visual alignment from image: "Not Sectioned" is always the starting default section columns
 const sectionsList = rawSections.includes("Not Sectioned") 
 ? rawSections 
 : ["Not Sectioned", ...rawSections];

 return (
 <>
 {sectionsList.map((sectionName) => {
 const sectionTasks = allActiveViewTodos.filter(t => {
 const matchesSection = sectionName === "Not Sectioned" 
 ? (!t.sectionName || t.sectionName === "Not Sectioned") 
 : t.sectionName === sectionName;
 if (!matchesSection) return false;
 if (kanbanSelectedTag) {
 return t.tags && t.tags.includes(kanbanSelectedTag);
 }
 return true;
 });
 const inactiveTasks = sectionTasks.filter(t => !t.completed);
 const completedTasksList = sectionTasks.filter(t => t.completed);
 
 const isColumnCollapsed = collapsedKanbanColumns[sectionName] ?? false;

 if (isColumnCollapsed) {
 return (
 <div 
 key={sectionName}
 onClick={() => setCollapsedKanbanColumns(prev => ({ ...prev, [sectionName]: false }))}
 className="w-[56px] min-h-[480px] bg-gray-50/50 border border-gray-150 rounded-2xl p-2.5 flex flex-col items-center justify-start gap-4 transition-all shrink-0 select-none cursor-pointer hover:bg-gray-100/30 group/collapsedCol border-dashed hover:border-blue-300"
 title={`Maximize "${sectionName}" Column`}
 >
 <button
 onClick={(e) => {
 e.stopPropagation();
 setCollapsedKanbanColumns(prev => ({ ...prev, [sectionName]: false }));
 }}
 className="p-1.5 hover:bg-gray-200 text-gray-500 rounded-lg transition"
 >
 <Maximize2 className="w-3.5 h-3.5" />
 </button>
 <div className="flex flex-col items-center gap-2 pt-1">
 <span className="text-xs bg-gray-150 text-gray-600 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
 {inactiveTasks.length}
 </span>
 </div>
 <div 
 className="text-xs text-gray-500 capitalize tracking-wider flex-1 text-center select-none"
 style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
 >
 {sectionName}
 </div>
 </div>
 );
 }

 const isCollapsed = collapsedSections[sectionName] ?? false;
 const isDraggingOver = draggingOverSection === sectionName;

 // Show max 5 completed inline to prevent clutter; link the rest to "View more"
 const showAllCompleted = false; // can link or expand or show "View more"
 const visibleCompleted = completedTasksList.slice(0, 5);
 const hasMoreCompleted = completedTasksList.length > 5;

 return (
 <div 
 key={sectionName}
 onDragOver={(e) => e.preventDefault()}
 onDragEnter={() => setDraggingOverSection(sectionName)}
 onDragLeave={() => {
 // Only cancel drag-over if moving to another element
 }}
 onDrop={(e) => {
 e.preventDefault();
 }}
 className={`w-[290px] min-h-[480px] bg-transparent rounded-2xl p-2.5 flex flex-col transition-all shrink-0 ${
 isDraggingOver ? 'bg-blue-50/40 border-2 border-dashed border-blue-400/50' : 'border border-transparent'
 }`}
 >
 {/* SECTION COLUMN HEADER */}
 <div className="mb-4 pb-2 border-b border-gray-100/50 flex items-center justify-between">
 {editingSectionName === sectionName ? (
 <div className="flex items-center gap-1.5 w-full">
 <input
 type="text"
 value={editingSectionValue}
 onChange={(e) => setEditingSectionValue(e.target.value)}
 onKeyDown={async (e) => {
 if (e.key === 'Enter') {
 await handleSaveRenameSection(sectionName);
 } else if (e.key === 'Escape') {
 setEditingSectionName(null);
 }
 }}
 className="text-xs font-medium border border-gray-200 focus:border-primary focus:outline-[#3b82f6] rounded-lg px-2 py-1 bg-white text-black w-full"
 autoFocus
 />
 <button
 onClick={() => handleSaveRenameSection(sectionName)}
 className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
 >
 <Check className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => setEditingSectionName(null)}
 className="p-1.5 bg-gray-150 hover:bg-gray-200 text-gray-500 rounded-lg transition"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ) : (
 <div className="flex items-center justify-between w-full group/secHeader">
 <div className="flex items-center gap-1.5 min-w-0">
 <h3 className="text-xs text-gray-700 capitalize tracking-wide truncate">
 {sectionName}
 </h3>
 <span className="text-xs text-gray-400 ">
 {inactiveTasks.length}
 </span>
 </div>
 
 <div className="flex items-center gap-1 opacity-0 group-hover/secHeader:opacity-100 focus-within:opacity-100 transition-opacity">
 <button
 onClick={() => {
 setNewTaskTitleInline('');
 setActiveAddingSection(sectionName === activeAddingSection ? null : sectionName);
 }}
 className="p-1 hover:bg-gray-100 text-gray-500 rounded-md transition"
 title="Add task to section"
 >
 <Plus className="w-3.5 h-3.5" />
 </button>

 <button
 onClick={() => setCollapsedKanbanColumns(prev => ({ ...prev, [sectionName]: true }))}
 className="p-1 hover:bg-gray-100 text-gray-450 hover:text-gray-650 rounded-md transition"
 title="Minimize column"
 >
 <Minimize2 className="w-3.5 h-3.5" />
 </button>
 
 <div className="relative">
 <button
 onClick={() => setActiveSectionMenu(activeSectionMenu === sectionName ? null : sectionName)}
 className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-md transition"
 >
 <MoreHorizontal className="w-3.5 h-3.5" />
 </button>
 
 {activeSectionMenu === sectionName && (
 <>
 <div className="fixed inset-0 z-30" onClick={() => setActiveSectionMenu(null)} />
 <div className="absolute right-0 mt-1 bg-white border-none rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] py-1 w-36 z-40 text-left">
 <button
 onClick={() => {
 setCollapsedKanbanColumns(prev => ({ ...prev, [sectionName]: true }));
 setActiveSectionMenu(null);
 }}
 className="w-full text-xs font-medium text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-left block"
 >
 Minimize Column
 </button>
 {sectionName !== "Not Sectioned" ? (
 <>
 <button
 onClick={() => {
 setEditingSectionName(sectionName);
 setEditingSectionValue(sectionName);
 setActiveSectionMenu(null);
 }}
 className="w-full text-xs font-medium text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-left block"
 >
 Rename Section
 </button>
 <button
 onClick={async () => {
 setActiveSectionMenu(null);
 if (confirm(`Are you sure you want to delete section "${sectionName}"? Tasks in this column will be moved to 'Not Sectioned'.`)) {
 await handleDeleteSection(sectionName);
 }
 }}
 className="w-full text-xs font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 text-left block"
 >
 Delete Section
 </button>
 </>
 ) : (
 <div className="px-3 py-1 bg-gray-50 text-xs text-gray-400 font-medium border-t border-gray-100">
 Default project column
 </div>
 )}
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 )}
 </div>

 {/* INNER TASK CARDS CONTAINER */}
 <div className="space-y-1 flex-1 overflow-y-auto max-h-[460px] pr-1 pb-24" style={{ scrollbarWidth: 'none' }}>
 {/* Quick task adder inline top of column */}
 {activeAddingSection === sectionName && (
 <div className="bg-white border border-gray-150 rounded-2xl p-2.5 mb-3 shadow-md animate-in fade-in zoom-in-95 duration-100">
 <input
 type="text"
 placeholder="What needs to be done?"
 value={newTaskTitleInline}
 onChange={(e) => setNewTaskTitleInline(e.target.value)}
 onKeyDown={async (e) => {
 if (e.key === 'Enter' && newTaskTitleInline.trim()) {
 await handleAddTaskToSection(sectionName, newTaskTitleInline, newTaskTagsInline, newTaskDescInline, newTaskSubtasksInline);
 setNewTaskTitleInline('');
 setNewTaskTagsInline('');
 setNewTaskDescInline('');
 setNewTaskSubtasksInline([]);
 setActiveAddingSection(null);
 } else if (e.key === 'Escape') {
 setActiveAddingSection(null);
 }
 }}
 className="w-full text-xs font-medium border border-gray-100 focus:outline-none focus:border-blue-400 rounded-lg p-2 bg-gray-50/50 text-black placeholder:text-gray-400"
 autoFocus
 />
 <textarea
 rows={2}
 placeholder="Add detailed notes or description (optional)"
 value={newTaskDescInline}
 onChange={(e) => setNewTaskDescInline(e.target.value)}
 onKeyDown={async (e) => {
 if (e.key === 'Enter' && !e.shiftKey && newTaskTitleInline.trim()) {
 e.preventDefault();
 await handleAddTaskToSection(sectionName, newTaskTitleInline, newTaskTagsInline, newTaskDescInline, newTaskSubtasksInline);
 setNewTaskTitleInline('');
 setNewTaskTagsInline('');
 setNewTaskDescInline('');
 setNewTaskSubtasksInline([]);
 setActiveAddingSection(null);
 } else if (e.key === 'Escape') {
 setActiveAddingSection(null);
 }
 }}
 className="w-full text-xs font-medium border border-gray-100 focus:outline-none focus:border-blue-400 rounded-lg p-2 bg-gray-50/50 text-black placeholder:text-gray-400 mt-1.5 resize-none"
 />
 {newTaskSubtasksInline.length > 0 && (
 <div className="mt-1 space-y-1">
 {newTaskSubtasksInline.map((st, i) => (
 <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50/50 p-1 rounded-md px-2 border border-gray-100">
 <div className="w-3 h-3 border border-gray-300 rounded-sm shrink-0" />
 <span className="flex-1 truncate">{st}</span>
 <button type="button" onClick={() => setNewTaskSubtasksInline(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
 <X className="w-3 h-3" />
 </button>
 </div>
 ))}
 </div>
 )}
 <div className="flex items-center gap-1.5 mt-1 border border-gray-100 bg-gray-50/50 rounded-lg p-2 focus-within:border-blue-400 transition-colors">
 <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
 <input
 type="text"
 placeholder="Add subtask... (Press Enter)"
 className="text-xs font-medium bg-transparent outline-none text-black placeholder:text-gray-400 w-full"
 onKeyDown={(e) => {
 if (e.key === 'Enter' && e.currentTarget.value.trim()) {
 e.preventDefault();
 setNewTaskSubtasksInline([...newTaskSubtasksInline, e.currentTarget.value.trim()]);
 e.currentTarget.value = '';
 }
 }}
 />
 </div>
 <input
 type="text"
 placeholder="Labels / Sub-categories (comma-sep)"
 value={newTaskTagsInline}
 onChange={(e) => setNewTaskTagsInline(e.target.value)}
 onKeyDown={async (e) => {
 if (e.key === 'Enter' && newTaskTitleInline.trim()) {
 await handleAddTaskToSection(sectionName, newTaskTitleInline, newTaskTagsInline, newTaskDescInline, newTaskSubtasksInline);
 setNewTaskTitleInline('');
 setNewTaskTagsInline('');
 setNewTaskDescInline('');
 setNewTaskSubtasksInline([]);
 setActiveAddingSection(null);
 } else if (e.key === 'Escape') {
 setActiveAddingSection(null);
 }
 }}
 className="w-full text-xs font-semibold border border-gray-100 focus:outline-none focus:border-blue-400 rounded-lg p-2 bg-gray-50/50 text-black placeholder:text-gray-400 mt-1.5"
 />
 <div className="flex justify-end gap-1.5 mt-2">
 <button
 onClick={() => {
 setActiveAddingSection(null);
 setNewTaskTagsInline('');
 setNewTaskDescInline('');
 setNewTaskSubtasksInline([]);
 }}
 className="text-xs text-gray-500 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg font-medium"
 >
 Cancel
 </button>
 <button
 onClick={async () => {
 if (newTaskTitleInline.trim()) {
 await handleAddTaskToSection(sectionName, newTaskTitleInline, newTaskTagsInline, newTaskDescInline, newTaskSubtasksInline);
 setNewTaskTitleInline('');
 setNewTaskTagsInline('');
 setNewTaskDescInline('');
 setNewTaskSubtasksInline([]);
 setActiveAddingSection(null);
 }
 }}
 className="text-xs text-white bg-primary hover:bg-primary hover:opacity-90 px-3 py-1.5 rounded-lg font-medium"
 >
 Add
 </button>
 </div>
 </div>
 )}

 {/* ACTIVE PENDING TASKS */}
 {[
 { level: 1, label: 'P1 Urgent', borderLeft: 'border-l-[3px] border-red-300 bg-red-50/40', text: 'text-red-500' },
 { level: 2, label: 'P2 High', borderLeft: 'border-l-[3px] border-orange-300 bg-orange-50/40', text: 'text-orange-500' },
 { level: 3, label: 'P3 Medium', borderLeft: 'border-l-[3px] border-blue-300 bg-blue-50/40', text: 'text-blue-500' },
 { level: 4, label: 'P4 Standard', borderLeft: 'border-l-[3px] border-slate-200 bg-slate-50/40', text: 'text-slate-500' }
 ].map(prio => {
 const prioTasks = inactiveTasks.filter(t => (t.priority || 4) === prio.level);
 
 return (
 <div 
 key={prio.level} 
 className="mb-4 min-h-[50px] flex flex-col relative group/swim"
 onDragOver={(e) => e.preventDefault()}
 onDragEnter={() => setDraggingOverSection(sectionName + '-' + prio.level)}
 onDrop={async (e) => {
 e.preventDefault();
 const id = e.dataTransfer.getData("text/plain");
 if (id) {
 setTodos(prev => prev.map(t => t.id === id ? { ...t, sectionName: sectionName === "Not Sectioned" ? null : sectionName, priority: prio.level } : t));
 await handleMoveTodoToSection(id, sectionName);
 await todoService.updateTodo(id, { priority: prio.level });
 }
 setDraggingOverSection(null);
 }}
 >
 <div className={`flex items-center justify-between px-2.5 py-1.5 w-full mb-2 rounded-md border ${prio.borderLeft} bg-white shadow-sm ${prio.text}`}>
 <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest">
 <span className={`w-1.5 h-1.5 rounded-full ${prio.text.replace('text-', 'bg-')}`} />
 <span>{prio.label}</span>
 </div>
 <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-500 border border-gray-100">
 {prioTasks.length}
 </span>
 </div>
 <div className={`space-y-2.5 flex-1 p-2 -mx-1 min-h-[40px] rounded-xl transition-all duration-200 ${draggingOverSection === sectionName + '-' + prio.level ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-gray-50/30 border border-gray-100'}`}>
 {prioTasks.map((todo) => {
 // Priority specific border and hover styles to replicate circular checkboxes perfectly
 let borderPrio = "border-gray-300 hover:border-primary";
 let checkColor = "text-primary";
 if (todo.priority === 1) {
 borderPrio = "border-red-300 hover:bg-red-50/50 text-red-400 bg-red-50/15";
 } else if (todo.priority === 2) {
 borderPrio = "border-orange-300 hover:bg-orange-50/50 text-orange-400 bg-orange-50/15";
 } else if (todo.priority === 3) {
 borderPrio = "border-blue-300 hover:bg-blue-50/50 text-blue-400 bg-blue-50/15";
 }

 const formattedDate = formatCardDate(todo.dueDate);
 const isOverdue = todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime();

 return (
 <motion.div
 key={todo.id}
 layoutId={todo.id}
 draggable
 onDragStart={(e: any) => {
 e.dataTransfer.setData("text/plain", todo.id);
 }}
 className={`bg-white rounded-2xl border border-gray-100 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all cursor-grab active:cursor-grabbing text-left flex flex-col gap-1.5 group select-none relative duration-100 ${
 todo.priority === 1 ? 'border-l-2 border-l-red-300 pl-3' : todo.priority === 2 ? 'border-l-2 border-l-orange-300 pl-3' : todo.priority === 3 ? 'border-l-2 border-l-blue-300 pl-3' : ''
 }`}
 onClick={() => setSelectedTodoId(todo.id)}
 >
 <div className="flex items-start gap-2.5">
 {/* Beautiful Round TickTick Checkbox to complete */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleToggleTodo(todo);
 }}
 className={`mt-0.5 w-[16px] h-[16px] shrink-0 rounded-full border-2 flex items-center justify-center bg-white transition-colors duration-200 ${borderPrio}`}
 >
 <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-100 text-current transition-opacity duration-150" />
 </button>

 <div className="min-w-0 flex-1">
 <span className="text-xs font-medium text-gray-800 break-words leading-relaxed leading-snug flex items-center gap-1">
 {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-primary flex-shrink-0" />}
 {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-rose-500 flex-shrink-0" />}
 {todo.title}
 </span>
 {todo.description && (
 <p className="text-base text-gray-400 font-medium leading-relaxed mt-0.5 line-clamp-2">
 {todo.description}
 </p>
 )}
 {todo.subtasks && todo.subtasks.length > 0 && (
   <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-400 font-medium select-none" onClick={(e) => e.stopPropagation()}>
     <ListTodo className="w-3.5 h-3.5 text-gray-400 shrink-0" />
     <span>{todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length} Subtasks</span>
   </div>
 )}
 </div>

 {/* Clean delete option within hover actions */}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteTodo(todo.id, e);
 }}
 className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded transition shrink-0"
 title="Delete task"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>

 {/* Beautiful Label Pills */}
 {todo.tags && todo.tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-1 pl-[23px]">
 {todo.tags.map((tg, idx) => (
 <span 
 key={idx} 
 className="px-1.5 py-0.5 bg-gray-50 text-xs font-medium text-[#1a2b58] rounded border border-gray-150 flex items-center gap-1 hover:bg-white transition"
 >
 🏷️ {tg}
 </span>
 ))}
 </div>
 )}

 {/* Date / Recurrence cycle line */}
 {formattedDate && (
 <div className={`flex items-center gap-1.5 text-xs tracking-wide pl-[23px] mt-0.5 ${isOverdue ? 'text-red-500 font-semibold' : 'text-primary'}`}>
 <span>{isOverdue ? `Overdue (${formattedDate})` : formattedDate}</span>
 </div>
 )}
 </motion.div>
 );
 })}
 {prioTasks.length === 0 && (
 <div className="h-full flex items-center justify-center text-[10px] text-gray-300 font-medium py-3 select-none pointer-events-none opacity-0 group-hover/swim:opacity-100 transition-opacity">
 Drop to {prio.label.split(' ')[0]}
 </div>
 )}
 </div>
 </div>
 )
 })}

 {inactiveTasks.length === 0 && (
 <div 
 onClick={() => {
 setNewTaskTitleInline('');
 setActiveAddingSection(sectionName);
 }}
 className="text-center py-6 border border-dashed border-gray-100 rounded-2xl text-xs text-gray-400 cursor-pointer hover:bg-gray-50/50 hover:text-gray-500 transition-colors"
 >
 No tasks. Click + to add.
 </div>
 )}

 {/* COMPLETED TASKS COLLAPSIBLE */}
 {completedTasksList.length > 0 && (
 <div className="pt-2 duration-100">
 <button
 onClick={() => setCollapsedSections(prev => ({
 ...prev,
 [sectionName]: !prev[sectionName]
 }))}
 className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition tracking-wide py-1.5 w-full text-left"
 >
 {!isCollapsed ? (
 <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
 ) : (
 <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
 )}
 <span>Completed</span>
 <span className="bg-gray-100 px-1.5 py-0.5 rounded-full text-xs font-medium">
 {completedTasksList.length}
 </span>
 </button>

 {!isCollapsed && (
 <div className="space-y-2 mt-2 pl-0.5 duration-100 animate-in slide-in-from-top-1 duration-150">
 {visibleCompleted.map((todo) => (
 <div
 key={todo.id}
 className="bg-white/55 rounded-xl border border-gray-100/60 p-2.5 flex items-start gap-2.5 text-left opacity-70 group"
 onClick={() => setSelectedTodoId(todo.id)}
 >
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleToggleTodo(todo);
 }}
 className="mt-0.5 w-[14px] h-[14px] shrink-0 rounded-full border border-gray-400 bg-gray-100 flex items-center justify-center text-gray-400"
 >
 <Check className="w-2 h-2 text-gray-500 font-medium" />
 </button>

 <div className="min-w-0 flex-1">
 <span className="text-xs font-medium text-gray-400 line-through truncate block flex items-center gap-1.5 mt-0.5">
 {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-gray-400 flex-shrink-0" />}
 {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-gray-400 flex-shrink-0" />}
 {todo.title}
 </span>
 <div className="text-xs text-gray-400 font-medium tracking-wide mt-0.5">
 Completed {formatCardDate(todo.dueDate) || "Today"}
 </div>
 </div>

 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteTodo(todo.id, e);
 }}
 className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 rounded transition shrink-0"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </div>
 ))}

 {hasMoreCompleted && (
 <button
 onClick={() => {
 setViewMode('completed');
 setSelectedProjectId(null);
 }}
 className="text-xs text-primary hover:text-primary hover:opacity-80 tracking-wide block pt-1.5 pl-5 cursor-pointer"
 >
 View more completed logs
 </button>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
 })}

 {/* ADDS INLINE NEW SECTION COLUMN */}
 {isAddingSection ? (
 <div className="w-[280px] shrink-0 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
 <input
 type="text"
 placeholder="Enter Column Section Name..."
 value={newSectionValue}
 onChange={(e) => setNewSectionValue(e.target.value)}
 onKeyDown={async (e) => {
 if (e.key === 'Enter') {
 await handleCreateSection();
 } else if (e.key === 'Escape') {
 setIsAddingSection(false);
 }
 }}
 className="text-xs font-medium border border-gray-200 focus:outline-[#3b82f6] rounded-xl p-2.5 bg-white text-black"
 autoFocus
 />
 <div className="flex items-center gap-2 justify-end">
 <button
 onClick={() => setIsAddingSection(false)}
 className="text-xs text-gray-500 hover:bg-gray-100 font-medium px-2.5 py-1.5 rounded-lg transition"
 >
 Cancel
 </button>
 <button
 onClick={handleCreateSection}
 disabled={!newSectionValue.trim()}
 className="text-xs text-white bg-primary hover:bg-primary hover:opacity-90 font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
 >
 Add Section
 </button>
 </div>
 </div>
 ) : (
 <button
 onClick={() => {
 setNewSectionValue('');
 setIsAddingSection(true);
 }}
 className="flex items-center gap-1.5 text-xs text-primary hover:text-primary hover:opacity-80 hover:bg-primary/5 px-4 py-2 rounded-xl transition-all shrink-0 mt-1"
 >
 <Plus className="w-4 h-4" />
 <span>New section</span>
 </button>
 )}
 </>
 );
 })()}
 </div>
 </div>
 </div>
 ) : (
 <div className="w-full">
 {/* Unified capsule quick task input (hidden in trash and completed views) */}
 {viewMode !== 'trash' && viewMode !== 'completed' && (
 <div className="bg-white border border-gray-200 shadow-md rounded-2xl p-4 mb-6 transition-all focus-within:shadow-lg focus-within:border-gray-300">
 {/* Title & Input Row */}
 <div className="flex items-start gap-2.5">
 <span className="mt-1 flex items-center justify-center text-gray-400 shrink-0">
 <Plus className="w-4 h-4 text-primary" />
 </span>
 <div className="relative flex-1 space-y-1.5">
 <input
 type="text"
 placeholder={`+ Add task to "${viewMode === 'project' ? (projects.find(p=>p.id===selectedProjectId)?.name || 'Inbox') : viewMode === 'folder' ? (folders.find(f=>f.id===selectedFolderId)?.name || 'Folder') : 'Inbox'}"... (Press Enter)`}
 value={newTaskTitle}
 onChange={(e) => { const text = e.target.value; setNewTaskTitle(text); const lower = text.toLowerCase(); if (/(daily|every day)/.test(lower)) setNewTaskRepeatInterval('daily'); else if (/(weekly|every week)/.test(lower)) setNewTaskRepeatInterval('weekly'); else if (/(monthly|every month)/.test(lower)) setNewTaskRepeatInterval('monthly'); else if (/(quarterly|every quarter)/.test(lower)) setNewTaskRepeatInterval('quarterly'); else if (/(yearly|every year|annually)/.test(lower)) setNewTaskRepeatInterval('yearly'); else setNewTaskRepeatInterval(null); }}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && newTaskTitle.trim()) {
 handleUnifiedQuickAdd(newTaskTitle);
 }
 }}
 className="w-full pr-10 text-xs sm:text-sm bg-transparent outline-none text-[#202020] placeholder:text-gray-400 font-medium"
 />
 <button
 type="button"
 onClick={() => setActiveEmojiPicker(activeEmojiPicker === "task" ? null : "task")}
 className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 rounded-full"
 >
 <Smile className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                          {activeEmojiPicker === "task" && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute right-0 top-6 z-[150] shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setNewTaskTitle(prev => prev + emojiData.emoji);
                                  setActiveEmojiPicker(null);
 }}
 width={280}
 height={350}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 <div className="h-px bg-gray-100 my-3" />

 {/* Tool Options Action Bar */}
 <div className="flex flex-wrap items-center justify-between gap-2.5">
 <div className="flex flex-wrap items-center gap-1.5">
 
 {/* 1. Due Date Selector */}
 <div className="relative">
 <button
 type="button"
 onClick={() => { setShowDatePicker(!showDatePicker); setShowPriorityPicker(false); setShowRepeatPicker(false); }}
 className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all border ${newTaskDueDate ? 'bg-primary/5 text-primary border-primary/20' : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'}`}
 >
 <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
 <span>{newTaskDueDate ? format(newTaskDueDate, 'MMM d, yyyy') : 'No Date'}</span>
 <ChevronDown className="w-2.5 h-2.5 opacity-60" />
 </button>
 <AnimatePresence>
                          {showDatePicker && (
                            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.12 }} className="absolute left-0 mt-2 z-50 bg-white border-none rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 w-44" onClick={(e) => e.stopPropagation()}>
                              {[ { label: "Today", date: startOfDay(new Date()), color: "bg-green-500" }, { label: "Tomorrow", date: startOfDay(addDays(new Date(), 1)), color: "bg-primary" }, { label: "Next Week", date: startOfDay(addWeeks(new Date(), 1)), color: "bg-purple-500" }, ].map((preset) => { const isSelected = newTaskDueDate && isSameDay(newTaskDueDate, preset.date); return ( <button key={preset.label} type="button" onClick={() => { setNewTaskDueDate(preset.date); setShowDatePicker(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${isSelected ? "bg-primary/5 text-primary" : "hover:bg-gray-50 text-gray-700"}`} > <span className="flex items-center gap-2"> <span className={`w-1.5 h-1.5 rounded-full ${preset.color}`} /> {preset.label} </span> {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />} </button> ); })}
                              <button type="button" onClick={() => { setNewTaskDueDate(undefined); setShowDatePicker(false); }} className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${!newTaskDueDate ? "bg-primary/5 text-primary" : "hover:bg-gray-50 text-gray-700"}`} > <span className="flex items-center gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Clear Date </span> {!newTaskDueDate && <Check className="w-3.5 h-3.5 text-primary shrink-0" />} </button>
                              <div className="mx-1 h-px bg-gray-100 my-1.5" /> <div className="px-1.5 pb-1"> <label className="text-[10px] uppercase font-semibold text-gray-400 mb-1 block tracking-widest px-1">Custom Date</label> <input type="date" className="w-full text-xs p-1.5 border border-gray-200 rounded-md outline-none focus:border-primary/50 text-gray-700 cursor-text bg-gray-50" value={newTaskDueDate ? format(newTaskDueDate, "yyyy-MM-dd") : ""} onClick={(e) => e.stopPropagation()} onChange={(e) => { if (e.target.value) { setNewTaskDueDate(startOfDay(new Date(e.target.value + "T00:00:00"))); setShowDatePicker(false); } else { setNewTaskDueDate(undefined); setShowDatePicker(false); } }} /> </div>
                            </motion.div>
                          )}
 </AnimatePresence>
 </div>

 {/* 2. Priority Selector */}
 <div className="relative">
 <button
 type="button"
 onClick={() => { setShowPriorityPicker(!showPriorityPicker); setShowDatePicker(false); setShowRepeatPicker(false); }}
 className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all border ${newTaskPriority < 4 ? 'bg-primary/5 text-primary border-primary/20' : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'}`}
 >
 <Flag className={`w-3.5 h-3.5 ${getPriorityColor(newTaskPriority)} ${newTaskPriority < 4 ? 'fill-current' : ''}`} />
 <span>P{newTaskPriority}</span>
 <ChevronDown className="w-2.5 h-2.5 opacity-60" />
 </button>
 <AnimatePresence>
 {showPriorityPicker && (
 <motion.div
 initial={{ opacity: 0, y: 8, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.95 }}
 transition={{ duration: 0.12 }}
 className="absolute left-0 mt-2 z-50 bg-white border-none rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 w-40"
 >
 {[
 { level: 1, label: 'P1 Urgent' },
 { level: 2, label: 'P2 High' },
 { level: 3, label: 'P3 Medium' },
 { level: 4, label: 'P4 None' }
 ].map(({ level, label }) => {
 const isSelected = newTaskPriority === level;
 return (
 <button
 key={level}
 type="button"
 onClick={() => {
 setNewTaskPriority(level);
 setShowPriorityPicker(false);
 }}
 className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
 >
 <span className="flex items-center">
 <Flag className={`w-3.5 h-3.5 mr-2 ${getPriorityColor(level)} ${level < 4 ? 'fill-current' : ''}`} />
 {label}
 </span>
 {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
 </button>
 );
 })}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 {/* 3. Repeat Selector */}
 <div className="relative">
 <button
 type="button"
 onClick={() => { setShowRepeatPicker(!showRepeatPicker); setShowPriorityPicker(false); setShowDatePicker(false); }}
 className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all border ${newTaskRepeatInterval ? 'bg-primary/5 text-primary border-primary/20' : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'}`}
 >
 <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${newTaskRepeatInterval ? 'text-primary' : 'text-gray-400'}`} />
 <span>{newTaskRepeatInterval ? newTaskRepeatInterval.charAt(0).toUpperCase() + newTaskRepeatInterval.slice(1) : 'Repeat'}</span>
 <ChevronDown className="w-2.5 h-2.5 opacity-60" />
 </button>
 <AnimatePresence>
 {showRepeatPicker && (
 <motion.div
 initial={{ opacity: 0, y: 8, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.95 }}
 transition={{ duration: 0.12 }}
 className="absolute left-0 mt-2 z-50 bg-white border-none rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 w-32"
 >
 {[
 { value: null, label: 'None' },
 { value: 'daily', label: 'Daily' },
 { value: 'weekly', label: 'Weekly' },
 { value: 'monthly', label: 'Monthly' }
 ].map(({ value, label }) => {
 const isSelected = newTaskRepeatInterval === value || (!newTaskRepeatInterval && !value);
 return (
 <button
 key={value || 'none'}
 type="button"
 onClick={() => {
 setNewTaskRepeatInterval(value as any);
 setShowRepeatPicker(false);
 }}
 className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
 >
 <span className="flex items-center">
 {label}
 </span>
 {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
 </button>
 );
 })}
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* 4. Notes Selector */}
 <div className="relative">
 <button
 type="button"
 onClick={() => { setShowNotesField(!showNotesField); setShowRepeatPicker(false); setShowPriorityPicker(false); setShowDatePicker(false); }}
 className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all border ${showNotesField || newTaskDesc ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10' : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'}`}
 >
 <FileText className={`w-3.5 h-3.5 shrink-0 ${showNotesField || newTaskDesc ? 'text-primary' : 'text-gray-400'}`} />
 <span>Notes</span>
 </button>
 </div>

 {/* 5. Subtasks Selector */}
 <div className="relative">
 <button
 type="button"
 onClick={() => { setShowSubtasksField(!showSubtasksField); setShowRepeatPicker(false); setShowPriorityPicker(false); setShowDatePicker(false); }}
 className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all border ${showSubtasksField || newTaskSubtasks.length > 0 ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10' : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'}`}
 >
 <ListTodo className={`w-3.5 h-3.5 shrink-0 ${showSubtasksField || newTaskSubtasks.length > 0 ? 'text-primary' : 'text-gray-400'}`} />
 <span>Subtasks</span>
 </button>
 </div>
 </div>

 {/* Submit Button */}
 <button
 type="button"
 onClick={() => handleUnifiedQuickAdd(newTaskTitle)}
 disabled={!newTaskTitle.trim()}
 className="flex items-center gap-1 px-4 py-1.5 text-xs bg-primary text-white rounded-xl disabled:opacity-40 font-medium transition-all shadow-md hover:bg-[#203673] duration-150 select-none cursor-pointer"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>Add Task</span>
 </button>

 {/* Collapsible Notes Section */}
 {(showNotesField || newTaskDesc) && (
 <div className="w-full mt-3 bg-gray-50/60 border border-gray-100 rounded-xl p-3.5 space-y-2 transition-all text-left animate-in fade-in slide-in-from-top-1 duration-150">
 <div className="flex items-center gap-1.5 text-gray-400 font-semibold text-[10px] uppercase tracking-widest">
 <FileText className="w-3.5 h-3.5 text-primary" />
 <span>Notes</span>
 </div>
 
 <textarea
 rows={2}
 placeholder="Add detailed notes or description (optional)"
 value={newTaskDesc}
 onChange={(e) => setNewTaskDesc(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey && newTaskTitle.trim()) {
 e.preventDefault();
 handleUnifiedQuickAdd(newTaskTitle);
 }
 }}
 className="w-full text-xs bg-white border border-gray-100 rounded-lg p-2 outline-none text-gray-700 placeholder:text-gray-400 font-medium resize-none shadow-[0_1px_2px_rgba(0,0,0,0.01)] focus:border-primary/30"
 />
 </div>
 )}

 {/* Collapsible Subtasks Section */}
 {(showSubtasksField || newTaskSubtasks.length > 0) && (
 <div className="w-full mt-3 bg-gray-50/60 border border-gray-100 rounded-xl p-3.5 space-y-3 transition-all text-left animate-in fade-in slide-in-from-top-1 duration-150">
 <div className="flex items-center gap-1.5 text-gray-400 font-semibold text-[10px] uppercase tracking-widest">
 <ListTodo className="w-3.5 h-3.5 text-primary" />
 <span>Subtasks</span>
 </div>
 
 {newTaskSubtasks.length > 0 && (
 <div className="space-y-1.5 max-h-36 overflow-y-auto">
 {newTaskSubtasks.map((st, i) => (
 <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-white p-1.5 rounded-lg px-2.5 border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
 <div className="w-3.5 h-3.5 border border-gray-300 rounded shrink-0" />
 <span className="flex-1 truncate">{st}</span>
 <button type="button" onClick={() => setNewTaskSubtasks(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 transition-colors">
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 </div>
 )}
 
 <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
 <Plus className="w-4 h-4 text-gray-400 shrink-0" />
 <input
 type="text"
 placeholder="Add subtask... (Press Enter)"
 className="text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 font-medium w-full"
 onKeyDown={(e) => {
 if (e.key === 'Enter' && e.currentTarget.value.trim()) {
 e.preventDefault();
 setNewTaskSubtasks([...newTaskSubtasks, e.currentTarget.value.trim()]);
 e.currentTarget.value = '';
 }
 }}
 />
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 
          {/* UPCOMING DEADLINES & PRIORITY DASHBOARD */}
          {viewMode === 'today' && (
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Upcoming Deadlines Widget */}
              <div className="lg:col-span-2 bg-gradient-to-br from-[#1a2b58]/5 to-transparent border border-[#1a2b58]/10 rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] text-[#1a2b58] pointer-events-none">
                  <Target className="w-40 h-40" />
                </div>
                <h3 className="text-sm font-semibold text-[#1a2b58] mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Upcoming Deadlines (Next 48 Hours)
                </h3>
                {(() => {
                  const now = Date.now();
                  const upcomingDeadlines = todos.filter(t => 
                    !t.completed && 
                    !t.deletedAt && 
                    t.dueDate && 
                    t.dueDate > now - 12 * 60 * 60 * 1000 && 
                    t.dueDate <= now + 48 * 60 * 60 * 1000
                  ).sort((a, b) => a.dueDate! - b.dueDate!);
                  
                  if (upcomingDeadlines.length === 0) {
                    return <p className="text-xs text-gray-500 italic relative z-10">No pressing deadlines in the next 48 hours.</p>;
                  }
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                      {upcomingDeadlines.slice(0, 6).map(task => {
                        const proj = projects.find(p => p.id === task.projectId);
                        const isOverdue = task.dueDate! < now;
                        const hoursLeft = Math.max(0, Math.floor((task.dueDate! - now) / (1000 * 60 * 60)));
                        
                        return (
                          <div key={task.id} className="bg-white/80 backdrop-blur border border-white/50 p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between min-h-[72px]" onClick={() => setSelectedTodoId(task.id)}>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <span className="text-xs font-normal text-gray-900 truncate leading-tight" title={task.title}>{task.title}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : hoursLeft < 24 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                {isOverdue ? 'Overdue' : hoursLeft === 0 ? '< 1h' : `${hoursLeft}h`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                              {proj ? (
                                <>
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.color || '#9ca3af' }} />
                                  <span className="truncate max-w-[80px]" title={proj.name}>{proj.name}</span>
                                  <span className="text-gray-300">•</span>
                                </>
                              ) : (
                                <>
                                  <Inbox className="w-3 h-3 shrink-0 text-gray-400" />
                                  <span>Inbox</span>
                                  <span className="text-gray-300">•</span>
                                </>
                              )}
                              <span className="truncate flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 opacity-70" />
                                {formatCardDate(task.dueDate)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {upcomingDeadlines.length > 6 && (
                        <div className="flex items-center justify-center p-3 rounded-xl border border-dashed border-[#1a2b58]/20 bg-white/30 text-xs font-semibold text-[#1a2b58]/70 hover:text-[#1a2b58] cursor-pointer hover:bg-white/60 transition-colors h-full min-h-[72px]" onClick={() => setViewMode('upcoming')}>
                          +{upcomingDeadlines.length - 6} more deadlines
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Priority Breakdown Widget */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                  <Flag className="w-32 h-32 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 relative z-10">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    Today's Priorities
                  </h3>
                  {(() => {
                    // get todays tasks
                    const todaysTasks = todos.filter(t => {
                      if (t.completed || t.deletedAt) return false;
                      const due = t.dueDate ? new Date(t.dueDate) : null;
                      const dl = t.deadline ? new Date(t.deadline) : null;
                      return (due && (isToday(due) || isPast(due))) || (dl && (isToday(dl) || isPast(dl)));
                    });
                    
                    if (todaysTasks.length === 0) {
                      return <p className="text-xs text-gray-500 italic relative z-10">No active tasks for today.</p>;
                    }
                    
                    const p1Count = todaysTasks.filter(t => t.priority === 1).length;
                    const p2Count = todaysTasks.filter(t => t.priority === 2).length;
                    const p3Count = todaysTasks.filter(t => t.priority === 3).length;
                    const p4Count = todaysTasks.filter(t => !t.priority || t.priority === 4).length;
                    const totalCount = todaysTasks.length;
                    
                    return (
                      <div className="space-y-3 relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-6 text-[10px] font-bold text-gray-500">P1</div>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-300 rounded-full" style={{ width: `${(p1Count / totalCount) * 100}%` }} />
                          </div>
                          <div className="w-4 text-[10px] font-semibold text-gray-700 text-right">{p1Count}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 text-[10px] font-bold text-gray-500">P2</div>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-300 rounded-full" style={{ width: `${(p2Count / totalCount) * 100}%` }} />
                          </div>
                          <div className="w-4 text-[10px] font-semibold text-gray-700 text-right">{p2Count}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 text-[10px] font-bold text-gray-500">P3</div>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-300 rounded-full" style={{ width: `${(p3Count / totalCount) * 100}%` }} />
                          </div>
                          <div className="w-4 text-[10px] font-semibold text-gray-700 text-right">{p3Count}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 text-[10px] font-bold text-gray-500">P4</div>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-300 rounded-full" style={{ width: `${(p4Count / totalCount) * 100}%` }} />
                          </div>
                          <div className="w-4 text-[10px] font-semibold text-gray-700 text-right">{p4Count}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* GROUP A: "Countdown" collapsible section (only shown if countdown tasks exist and not in trash/completed view) */}
 {allActiveViewTodos.filter(t => !t.completed && t.tags && t.tags.includes('Countdown')).length > 0 && viewMode !== 'trash' && viewMode !== 'completed' && (
 <div className="mb-6">
 <button
 onClick={() => setIsCountdownExpanded(!isCountdownExpanded)}
 className="flex items-center space-x-1.5 text-xs text-gray-400 uppercase tracking-widest mb-3.5 bg-transparent border-none outline-none select-none cursor-pointer"
 >
 {isCountdownExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
 <span>Countdown</span>
 <span className="text-xs bg-gray-100 px-1.5 py-0.2 rounded font-medium text-gray-400 ml-1.5">
 {allActiveViewTodos.filter(t => !t.completed && t.tags && t.tags.includes('Countdown')).length}
 </span>
 </button>

 {isCountdownExpanded && (
 <div className="space-y-0.5 border-t border-b border-gray-100/50">
 <AnimatePresence>
 {allActiveViewTodos.filter(t => !t.completed && t.tags && t.tags.includes('Countdown')).map(todo => (
 <motion.div
 key={todo.id}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="group flex items-center justify-between py-3 border-b border-[#f4f4f4]/60 hover:bg-[#fafafa]/80 transition-colors px-1"
 >
 <div className="flex items-center min-w-0 flex-1">
 {/* Hourglass Icon Badge mimicking TickTick Screenshot */}
 <div className="bg-[#ebf3ff]/90 text-[#1a2b58] border border-blue-100/50 rounded-xl p-1.5 w-7.5 h-7.5 flex items-center justify-center shrink-0 mr-3.5 select-none">
 <Hourglass className="w-4 h-4 animate-spin-slow" />
 </div>
 <span 
 className="text-xs sm:text-sm text-[#202020] font-medium truncate cursor-pointer hover:text-primary flex items-center gap-1.5"
 onClick={() => setSelectedTodoId(todo.id)}
 >
 {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-primary flex-shrink-0" />}
 {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-rose-500 flex-shrink-0" />}
 {todo.title}
 </span>
 </div>

 <div className="flex items-center space-x-2 shrink-0">
 {renderItemProjectBadge(todo)}
 <span className={`text-xs sm:text-xs font-medium px-2 py-0.5 rounded-full flex items-center select-none shrink-0 leading-none ${todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? 'bg-red-50 text-red-600' : 'bg-[#ebf3ff]/70 text-[#1a2b58]'}`}>
 {todo.repeatInterval ? <RefreshCw className="w-3 h-3 mr-1 opacity-70" /> : null}
 {todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? `Overdue (${formatCardDate(todo.dueDate)})` : formatCardDate(todo.dueDate) || 'Today'}
 </span>
 <button
 onClick={(e) => handleDeleteTodo(todo.id, e)}
 className="p-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 rounded transition-opacity ml-2"
 title="Delete task"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 )}
 </div>
 )}

 {/* GROUP B: "Current View Actions/Pending" section */}
 <div className="mb-6">
 <button
 onClick={() => setIsPendingExpanded(!isPendingExpanded)}
 className="flex items-center space-x-1.5 text-xs text-gray-400 uppercase tracking-widest mb-3.5 bg-transparent border-none outline-none select-none cursor-pointer"
 >
 {isPendingExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
 <span>
 {viewMode === 'today' ? `${format(new Date(), 'EEEE')}, Today` : viewMode === 'trash' ? 'Deleted Trash Bin' : viewMode === 'completed' ? 'Historical Active Logs' : getViewTitle()}
 </span>
 <span className="text-xs bg-gray-100 px-1.5 py-0.2 rounded font-medium text-gray-400 ml-1.5">
 {allActiveViewTodos.filter(t => !t.completed).length}
 </span>
 </button>

 {isPendingExpanded && (
 <div className="space-y-0.5 border-t border-b border-gray-100/50">
 <AnimatePresence>
 {viewMode === 'folder' ? (
    (() => {
      const folderProjects = projects.filter(p => p.folderId === selectedFolderId);
      const activeTasks = allActiveViewTodos.filter(t => !t.completed);

      return folderProjects.map(project => {
        const projectTasks = activeTasks.filter(t => t.projectId === project.id);
        if (projectTasks.length === 0) return null;

        return (
          <div key={project.id} className="mb-6 last:mb-2 text-left">
            <div 
              className="flex items-center justify-between px-3 py-2 bg-gray-50/70 hover:bg-gray-50/90 rounded-xl mb-2 border border-gray-100/80 transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              onClick={() => {
                setViewMode('project');
                setSelectedProjectId(project.id);
                setActiveAppTab('tasks');
              }}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: project.color || '#9ca3af' }} />
                {renderIcon(project.icon, project.color, "w-4 h-4 text-gray-500 shrink-0")}
                <span className="text-xs font-bold text-gray-800 tracking-tight truncate">{project.name}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${project.color}15`, color: project.color || '#4B5563' }}>
                {projectTasks.length} pending
              </span>
            </div>

            <div className="pl-3.5 space-y-0.5 border-l-[3px] ml-3 mb-4 text-left" style={{ borderColor: project.color }}>
              {projectTasks.map(todo => {
                const hasPriority = todo.priority && todo.priority < 4;
                return (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`group flex items-center justify-between py-2.5 border-b border-[#f4f4f4]/60 hover:bg-[#fafafa]/80 transition-colors px-1 ${
                      hasPriority 
                        ? todo.priority === 1 
                          ? 'border-l-[3px] border-red-300 pl-3' 
                          : todo.priority === 2 
                            ? 'border-l-[3px] border-orange-300 pl-3' 
                            : 'border-l-[3px] border-blue-300 pl-3'
                        : ''
                    }`}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <button
                        onClick={() => handleToggleTodo(todo)}
                        className={`mr-3.5 w-[17px] h-[17px] flex shrink-0 items-center justify-center rounded-full border-2 transition-all ${getPriorityCheckboxStyle(todo.priority)}`}
                        title="Mark complete"
                      >
                        <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-100 text-current transition-opacity" />
                      </button>

                      <div className="min-w-0 flex-1 cursor-pointer pr-4" onClick={() => setSelectedTodoId(todo.id)}>
                        <span className="text-xs sm:text-sm text-[#202020] font-normal leading-relaxed flex items-center gap-1.5">
                          {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-primary flex-shrink-0" />}
                          {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-rose-500 flex-shrink-0" />}
                          {todo.title}
                        </span>
                        {todo.description && (
                          <p className="text-base text-gray-400 line-clamp-1 leading-normal font-medium mt-0.5">{todo.description}</p>
                        )}
                        {todo.subtasks && todo.subtasks.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400 font-medium select-none" onClick={(e) => e.stopPropagation()}>
                            <ListTodo className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length} Subtasks</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 shrink-0 pl-2">
                      {renderItemProjectBadge(todo)}

                      <span className={`text-xs sm:text-xs font-medium px-2 py-0.5 rounded-full flex items-center select-none shrink-0 border border-blue-100/10 leading-none ${todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? 'bg-red-50 text-red-600' : 'bg-[#ebf3ff]/70 text-[#1a2b58]'}`}>
                        {todo.repeatInterval ? <RefreshCw className="w-3 h-3 mr-1 opacity-70" /> : <CalendarIcon className="w-3 h-3 mr-1 opacity-70" />}
                        {todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? `Overdue (${formatCardDate(todo.dueDate)})` : formatCardDate(todo.dueDate) || 'No date'}
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => handleDeleteTodo(todo.id, e)}
                          className="p-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 rounded transition-opacity"
                          title="Trash task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      });
    })()
  ) : (
    allActiveViewTodos.filter(t => !t.completed).map(todo => {
      const hasPriority = todo.priority && todo.priority < 4;
      return (
        <motion.div
          key={todo.id}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`group flex items-center justify-between py-2.5 border-b border-[#f4f4f4]/60 hover:bg-[#fafafa]/80 transition-colors px-1 ${
            hasPriority 
              ? todo.priority === 1 
                ? 'border-l-[3px] border-red-300 pl-3' 
                : todo.priority === 2 
                  ? 'border-l-[3px] border-orange-300 pl-3' 
                  : 'border-l-[3px] border-blue-300 pl-3'
              : ''
          }`}
        >
          <div className="flex items-center min-w-0 flex-1">
            <button
              onClick={() => handleToggleTodo(todo)}
              className={`mr-3.5 w-[17px] h-[17px] flex shrink-0 items-center justify-center rounded-full border-2 transition-all ${getPriorityCheckboxStyle(todo.priority)}`}
              title="Mark complete"
            >
              <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-100 text-current transition-opacity" />
            </button>

            <div className="min-w-0 flex-1 cursor-pointer pr-4" onClick={() => setSelectedTodoId(todo.id)}>
              <span className="text-xs sm:text-sm text-[#202020] font-normal leading-relaxed flex items-center gap-1.5">
                {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-primary flex-shrink-0" />}
                {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-rose-500 flex-shrink-0" />}
                {todo.title}
              </span>
              {todo.description && (
                <p className="text-base text-gray-400 line-clamp-1 leading-normal font-medium mt-0.5">{todo.description}</p>
              )}
              {todo.subtasks && todo.subtasks.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400 font-medium select-none" onClick={(e) => e.stopPropagation()}>
                  <ListTodo className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length} Subtasks</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0 pl-2">
            {renderItemProjectBadge(todo)}

            {viewMode !== 'trash' && (
              <span className={`text-xs sm:text-xs font-medium px-2 py-0.5 rounded-full flex items-center select-none shrink-0 border border-blue-100/10 leading-none ${todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? 'bg-red-50 text-red-600' : 'bg-[#ebf3ff]/70 text-[#1a2b58]'}`}>
                {todo.repeatInterval ? <RefreshCw className="w-3 h-3 mr-1 opacity-70" /> : <CalendarIcon className="w-3 h-3 mr-1 opacity-70" />}
                {todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? `Overdue (${formatCardDate(todo.dueDate)})` : formatCardDate(todo.dueDate) || 'No date'}
              </span>
            )}

            <div className="flex items-center space-x-1">
              {viewMode === 'trash' && (
                <button
                  onClick={(e) => handleRestoreTodo(todo.id, e)}
                  className="p-1 px-1.5 opacity-0 group-hover:opacity-100 text-xs font-medium text-green-700 bg-green-50 rounded border border-green-100 hover:bg-green-100 transition-opacity"
                  title="Restore task"
                >
                  Restore
                </button>
              )}
              <button
                onClick={(e) => handleDeleteTodo(todo.id, e)}
                className="p-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 rounded transition-opacity"
                title={viewMode === 'trash' ? 'Delete permanently' : 'Trash task'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      );
    })
  )}
 </AnimatePresence>

 {allActiveViewTodos.filter(t => !t.completed).length === 0 && (
 <div className="text-center py-12 bg-white rounded-xl select-none">
 <ShieldCheck className="w-8 h-8 text-green-300 mx-auto mb-2" />
 <h4 className="font-medium text-xs text-gray-700">All targets met</h4>
 <p className="font-medium text-base text-gray-400">Enjoy the rest of training day cycles.</p>
 </div>
 )}
 </div>
 )}
 </div>

 {/* GROUP C: "Completed" COLLAPSIBLE BLOCK representation */}
 {viewMode !== 'trash' && (
 <div className="mt-8">
 <button
 onClick={() => setIsCompletedSectionExpanded(!isCompletedSectionExpanded)}
 className="flex items-center space-x-1.5 text-xs text-gray-400 uppercase tracking-widest mb-3.5 bg-transparent border-none outline-none select-none cursor-pointer"
 >
 {isCompletedSectionExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
 <span>Completed</span>
 <span className="text-xs bg-gray-100 px-1.5 py-0.2 rounded font-medium text-gray-400 ml-1.5">
 {allActiveViewTodos.filter(t => t.completed).length}
 </span>
 </button>

 {isCompletedSectionExpanded && (
 <div className="space-y-0.5 border-t border-b border-gray-100/50">
 <AnimatePresence>
 {viewMode === 'folder' ? (
    (() => {
      const folderProjects = projects.filter(p => p.folderId === selectedFolderId);
      const completedTasks = allActiveViewTodos.filter(t => t.completed);

      return folderProjects.map(project => {
        const projectTasks = completedTasks.filter(t => t.projectId === project.id);
        if (projectTasks.length === 0) return null;

        return (
          <div key={project.id} className="mb-6 last:mb-2 text-left">
            <div 
              className="flex items-center justify-between px-3 py-2 bg-gray-50/70 hover:bg-gray-50/90 rounded-xl mb-2 border border-gray-100/80 transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              onClick={() => {
                setViewMode('project');
                setSelectedProjectId(project.id);
                setActiveAppTab('tasks');
              }}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: project.color || '#9ca3af' }} />
                {renderIcon(project.icon, project.color, "w-4 h-4 text-gray-500 shrink-0")}
                <span className="text-xs font-bold text-gray-800 tracking-tight truncate">{project.name}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                {projectTasks.length} completed
              </span>
            </div>

            <div className="pl-3.5 space-y-0.5 border-l-[3px] ml-3 mb-4 text-left" style={{ borderColor: project.color }}>
              {projectTasks.map(todo => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group flex items-center justify-between py-2.5 border-b border-[#f4f4f4]/40 hover:bg-[#fafafa]/80 transition-colors px-1"
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleTodo(todo)}
                      className="mr-3.5 w-[17px] h-[17px] flex shrink-0 items-center justify-center rounded-full bg-gray-200 border-2 border-gray-300 text-gray-500 hover:bg-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
                      title="Mark active"
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </button>

                    <div className="min-w-0 flex-1 cursor-pointer pr-4" onClick={() => setSelectedTodoId(todo.id)}>
                      <span className="text-xs sm:text-sm text-gray-400 line-through font-normal leading-relaxed truncate block flex items-center gap-1.5">
                        {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-gray-400 flex-shrink-0" />}
                        {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-gray-400 flex-shrink-0" />}
                        {todo.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 shrink-0 pl-2">
                    {renderItemProjectBadge(todo)}
                    <span className="text-xs sm:text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full flex items-center select-none">
                      {todo.repeatInterval ? <RefreshCw className="w-3 h-3 mr-1 opacity-70" /> : null}
                      {formatCardDate(todo.dueDate) || 'No date'}
                    </span>
                    <button
                      onClick={(e) => handleDeleteTodo(todo.id, e)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 rounded transition-opacity ml-2"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      });
    })()
  ) : (
    allActiveViewTodos.filter(t => t.completed).map(todo => (
      <motion.div
        key={todo.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="group flex items-center justify-between py-2.5 border-b border-[#f4f4f4]/40 hover:bg-[#fafafa]/80 transition-colors px-1"
      >
        <div className="flex items-center min-w-0 flex-1">
          <button
            onClick={() => handleToggleTodo(todo)}
            className="mr-3.5 w-[17px] h-[17px] flex shrink-0 items-center justify-center rounded-full bg-gray-200 border-2 border-gray-300 text-gray-500 hover:bg-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
            title="Mark active"
          >
            <Check className="w-2.5 h-2.5 text-white" />
          </button>

          <div className="min-w-0 flex-1 cursor-pointer pr-4" onClick={() => setSelectedTodoId(todo.id)}>
            <span className="text-xs sm:text-sm text-gray-400 line-through font-normal leading-relaxed truncate block flex items-center gap-1.5">
              {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-gray-400 flex-shrink-0" />}
              {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-gray-400 flex-shrink-0" />}
              {todo.title}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0 pl-2">
          {renderItemProjectBadge(todo)}
          <span className="text-xs sm:text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full flex items-center select-none">
            {todo.repeatInterval ? <RefreshCw className="w-3 h-3 mr-1 opacity-70" /> : null}
            {formatCardDate(todo.dueDate) || 'No date'}
          </span>
          <button
            onClick={(e) => handleDeleteTodo(todo.id, e)}
            className="p-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 rounded transition-opacity ml-2"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    ))
  )}
 </AnimatePresence>

 {allActiveViewTodos.filter(t => t.completed).length === 0 && (
 <div className="text-xs text-gray-400 italic font-semibold py-4 pl-1">
 No completed items log in this view yet.
 </div>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 )}

 {/* 3. SECTOR: GENERAL ADDERS INLINE FOR OTHER TABS */}
 {activeAppTab === 'tasks' && viewMode !== 'today' && isAddingTask && (
 <div className="mt-4 border border-[#e5e7eb] bg-white rounded-xl shadow-lg p-4 text-left">
 <div className="relative mb-2">
 <input
 autoFocus
 type="text"
 placeholder="Task title"
 value={newTaskTitle}
 onChange={(e) => { const text = e.target.value; setNewTaskTitle(text); const lower = text.toLowerCase(); if (/(daily|every day)/.test(lower)) setNewTaskRepeatInterval('daily'); else if (/(weekly|every week)/.test(lower)) setNewTaskRepeatInterval('weekly'); else if (/(monthly|every month)/.test(lower)) setNewTaskRepeatInterval('monthly'); else if (/(quarterly|every quarter)/.test(lower)) setNewTaskRepeatInterval('quarterly'); else if (/(yearly|every year|annually)/.test(lower)) setNewTaskRepeatInterval('yearly'); else setNewTaskRepeatInterval(null); }}
 onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
 className="w-full font-medium text-[#202020] text-sm outline-none placeholder:text-gray-400 bg-transparent"
 />
 </div>
 <textarea
 placeholder="Description / Notes"
 value={newTaskDesc}
 onChange={(e) => setNewTaskDesc(e.target.value)}
 className="w-full text-xs text-gray-600 outline-none placeholder:text-gray-400 resize-none h-12 mb-2"
 />
 <div className="flex justify-end space-x-2">
 <button onClick={() => setIsAddingTask(false)} className="px-3 py-1.5 text-xs hover:bg-gray-100 text-gray-600 rounded">
 Cancel
 </button>
 <button onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="px-3 py-1.5 text-xs bg-primary text-white rounded disabled:opacity-50 font-medium">
 Add Task
 </button>
 </div>
 </div>
 )}

 {/* 4. SECTOR: EISENHOWER QUADRANTS GRID TAB */}
 {activeAppTab === 'matrix' && (
 <EisenhowerMatrix 
 todos={todos} 
 todoService={todoService} 
 onSelectTodoId={setSelectedTodoId} 
 userId={auth.currentUser?.uid || ''} 
 projects={projects}
 onAutoCategorize={(matchedName) => {
 setAutoProjectNotice(`Auto-categorized task to "${matchedName}"`);
 setTimeout(() => setAutoProjectNotice(null), 4000);
 }}
 onToggleTodo={handleToggleTodo}
 />
 )}

 {/* 5. SECTOR: HABITS GRAPH STREAK LOGGER TAB */}
 {activeAppTab === 'habits' && (
 <HabitsTracker userId={auth.currentUser?.uid || ''} />
 )}

 {/* 6. SECTOR: STANDALONE POMODORO FOCUS ROOM TAB */}
 {activeAppTab === 'focus' && (
 <PomodoroFocus />
 )}

 {/* 7. SECTOR: STARRED P1 VALUES ONLY GOALBOARD TAB */}
 {activeAppTab === 'starred' && (
 <div className="text-left">
 <div className="mb-4">
 <h2 className="text-xl text-gray-900 flex items-center">
 <Star className="w-5 h-5 mr-2 text-[#1a2b58] fill-[#1a2b58]" />
 Starred High-Priorities
 </h2>
 <p className="font-medium text-base text-gray-500">Focus solely on critical urgent P1 tasks.</p>
 </div>
 <div className="space-y-2">
 {todos.filter(t => !t.completed && !t.deletedAt && t.priority === 1).map(todo => (
 <div key={todo.id} onClick={() => setSelectedTodoId(todo.id)} className="p-3.5 bg-red-50/30 border border-red-100 rounded-xl hover:shadow transition-all cursor-pointer flex justify-between items-center">
 <div className="flex items-center space-x-2.5">
 <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
 <span className="text-xs font-medium text-gray-800 flex items-center gap-1.5">
 {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-primary flex-shrink-0" />}
 {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-rose-500 flex-shrink-0" />}
 {todo.title}
 </span>
 </div>
 <span className="text-xs bg-red-100/75 text-red-700 font-medium px-2 py-0.5 rounded-full uppercase">P1 High Target</span>
 </div>
 ))}
 {todos.filter(t => !t.completed && !t.deletedAt && t.priority === 1).length === 0 && (
 <div className="text-center py-12 border rounded-xl border-dashed">
 <Sparkles className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
 <span className="text-xs text-gray-400">No critical high-priorities remaining! Excellent.</span>
 </div>
 )}
 </div>
 </div>
 )}

 {/* 8. SECTOR: SEARCH AND FILTER PARAMETERS TAB */}
 {activeAppTab === 'settings' && (
		<div className="text-left w-full h-full max-w-3xl mx-auto py-2 focus:outline-none">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
						<Settings className="w-6 h-6 text-yellow-500" />
						Account Settings &amp; Portability
					</h2>
					<p className="font-normal text-sm text-gray-400 mt-1">
						Manage your offline backup policies, view synchronization metrics, and request a database dump.
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
					<span className="text-xs text-gray-400 uppercase tracking-widest block font-medium">CHECKLIST DOSSIER</span>
					<span className="text-3xl font-bold text-white mt-1 block">{todos.length}</span>
					<span className="text-xs text-green-500 font-medium block mt-1">✓ Active &amp; Archive cached</span>
				</div>
				<div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
					<span className="text-xs text-gray-400 uppercase tracking-widest block font-medium">WORKSPACE PROJECTS</span>
					<span className="text-3xl font-bold text-white mt-1 block">{projects.length}</span>
					<span className="text-xs text-indigo-400 font-medium block mt-1">★ Multi-view hubs loaded</span>
				</div>
				<div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
					<span className="text-xs text-gray-400 uppercase tracking-widest block font-medium">FOLDERS TREES</span>
					<span className="text-3xl font-bold text-white mt-1 block">{folders.length}</span>
					<span className="text-xs text-purple-400 font-medium block mt-1">⚙ Structural directories</span>
				</div>
			</div>

			<div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm mb-6">
				<div className="p-5 border-b border-slate-800 bg-slate-950">
					<h3 className="text-base font-semibold text-white flex items-center gap-2">
						<FileSpreadsheet className="w-5 h-5 text-indigo-400" />
						CSV Document Offline Portability Backups
					</h3>
					<p className="text-xs text-gray-400 mt-1">
						Export your complete workspace as standard UTF-8 encoded comma-separated structures. Ideal for offline storage, backups, or raw integration.
					</p>
				</div>

				<div className="divide-y divide-slate-800 text-sm font-sans">
					{/* ITEM 1: UNIVERSAL ALL-IN-ONE */}
					<div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors">
						<div>
							<div className="font-semibold text-white flex items-center gap-1.5">
								<span className="p-1 bg-red-950 text-red-400 rounded font-mono text-center leading-none">★</span>
								Universal Multi-Dossier Consolidated Backup
							</div>
							<p className="text-xs text-gray-400 mt-0.5 max-w-xl">
								A comprehensive relational dump merging folders trees, custom projects registries, and tasks databases in a single consolidated document.
							</p>
						</div>
						<button 
							onClick={handleExportUniversalCSV}
							className="shrink-0 px-4 py-2 bg-indigo-605 hover:bg-indigo-700 bg-[#1a2b58] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-sm hover:shadow"
						>
							<Download className="w-4 h-4" />
							Export Master Hub
						</button>
					</div>

					{/* ITEM 2: TASKS CHECKLISTS */}
					<div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors">
						<div>
							<div className="font-semibold text-white flex items-center gap-1.5">
								<span className="p-1 bg-green-950 text-green-400 rounded font-mono text-center leading-none">✓</span>
								Checklist Tasks Sheet
							</div>
							<p className="text-xs text-gray-400 mt-0.5 max-w-xl">
								Downloads lists of tasks with fields: Description notes, Completed Status, Priorities, assigned Project Names, Tag collections, and timestamp records.
							</p>
						</div>
						<button 
							onClick={handleExportTasksCSV}
							className="shrink-0 px-4 py-2 border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-750 text-gray-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
						>
							<Download className="w-4 h-4 text-gray-400" />
							Export Tasks (.csv)
						</button>
					</div>

					{/* ITEM 3: PROJECTS DOCK */}
					<div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors">
						<div>
							<div className="font-semibold text-white flex items-center gap-1.5">
								<span className="p-1 bg-blue-950 text-blue-400 rounded font-mono text-center leading-none">⊞</span>
								Workspace Projects Sheet
							</div>
							<p className="text-xs text-gray-400 mt-0.5 max-w-xl">
								Downloads lists of all your customized projects, assigned colors, display icons, custom views (Kanban/List/Timeline), and corresponding folders.
							</p>
						</div>
						<button 
							onClick={handleExportProjectsCSV}
							className="shrink-0 px-4 py-2 border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-750 text-gray-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
						>
							<Download className="w-4 h-4 text-gray-400" />
							Export Projects (.csv)
						</button>
					</div>

					{/* ITEM 4: FOLDERS TREES */}
					<div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors">
						<div>
							<div className="font-semibold text-white flex items-center gap-1.5">
								<span className="p-1 bg-purple-950 text-purple-400 rounded font-mono text-center leading-none">⚙</span>
								Structural Folders Registry
							</div>
							<p className="text-xs text-gray-400 mt-0.5 max-w-xl">
								Downloads lists of high-level folder organization trees and associated directory colors. Perfect for duplicating layout schemes.
							</p>
						</div>
						<button 
							onClick={handleExportFoldersCSV}
							className="shrink-0 px-4 py-2 border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-750 text-gray-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
						>
							<Download className="w-4 h-4 text-gray-400" />
							Export Folders (.csv)
						</button>
					</div>
				</div>
			</div>

			<div className="p-4 bg-blue-950/40 border border-blue-900/50 rounded-2xl flex items-start gap-3 mt-4">
				<span className="text-blue-400 font-bold block mt-0.5">ℹ</span>
				<p className="text-xs text-blue-300 leading-relaxed">
					<strong>Security Note:</strong> All export procedures are fully client-side and happen locally inside your browser context. No personal tasks, projects description, or folder hierarchies are shared with third-party networks during backup dumps.
				</p>
			</div>
		</div>
	)}

	{activeAppTab === 'search' && (
 <div className="text-left w-full">
 <div className="mb-6">
 <h2 className="text-xl text-gray-900">Extensive Task Search</h2>
 <p className="font-medium text-base text-gray-500">Perform deep filters across dates, tags, and projects.</p>
 </div>
 <div className="mb-6 flex space-x-2">
 <input
 type="text"
 placeholder="Type criteria or name..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full text-xs px-3.5 py-2.5 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary rounded-xl"
 />
 </div>
 <div className="space-y-2">
 {todos.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10).map(todo => (
 <div key={todo.id} onClick={() => setSelectedTodoId(todo.id)} className="p-3 bg-white border border-gray-100 hover:border-[#1a2b58] cursor-pointer rounded-xl flex justify-between items-center">
 <span className="text-xs font-medium flex items-center gap-1.5">
 {todo.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-primary flex-shrink-0" />}
 {(todo.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-rose-500 flex-shrink-0" />}
 {todo.title}
 </span>
 <span className={`text-xs px-2 py-0.5 font-medium rounded-full ${todo.completed ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'}`}>
 {todo.completed ? 'Completed' : 'Active'}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 </div>
 </main>

 {/* DETAILED SIDEBAR DETAIL DRAWER DRAWS OUT */}
 <AnimatePresence>
 {selectedTodoId && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[80] flex justify-end bg-black/15 p-0 sm:p-4 backdrop-blur-sm" 
 onClick={() => setSelectedTodoId(null)}
 >
 <motion.div 
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 onClick={(e) => e.stopPropagation()}
 transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
 className="bg-white w-full sm:w-[450px] shadow-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col overflow-hidden"
 >
 {(() => {
 const todo = todos.find(t => t.id === selectedTodoId);
 if (!todo) return null;

 const logDueDateChange = (nextDate: number | null) => {
   const now = Date.now();
   const oldVal = todo.dueDate ? format(new Date(todo.dueDate), 'MMM d, yyyy') : 'No Date';
   const newVal = nextDate ? format(new Date(nextDate), 'MMM d, yyyy') : 'No Date';
   const newActivity = {
     id: Math.random().toString(36).substring(2, 9),
     type: 'other' as const,
     field: 'Due Date',
     oldValue: oldVal,
     newValue: newVal,
     createdAt: now,
     user: 'You'
   };
   return [...(todo.activities || []), newActivity];
 };

 const getActivityDetails = (act: TaskActivity) => {
   switch (act.type) {
     case 'status':
       return {
         label: act.newValue === 'Completed' ? 'completed the task' : 'marked the task as active',
         icon: <Check className="w-3 h-3 text-emerald-600" />,
         bgColor: 'bg-emerald-50 border-emerald-100'
       };
     case 'priority':
       return {
         label: `changed priority to ${act.newValue}`,
         icon: <Flag className="w-3 h-3 text-blue-600 fill-current" />,
         bgColor: 'bg-blue-50 border-blue-100'
       };
     case 'title':
       return {
         label: `renamed task`,
         details: `"${act.oldValue}" to "${act.newValue}"`,
         icon: <FileText className="w-3 h-3 text-amber-600" />,
         bgColor: 'bg-amber-50 border-amber-100'
       };
     case 'other':
       if (act.field === 'Due Date') {
         return {
           label: `changed due date to ${act.newValue}`,
           icon: <CalendarIcon className="w-3 h-3 text-purple-600" />,
           bgColor: 'bg-purple-50 border-purple-100'
         };
       }
       return {
         label: `updated ${act.field}`,
         details: `"${act.oldValue}" to "${act.newValue}"`,
         icon: <Clock className="w-3 h-3 text-gray-500" />,
         bgColor: 'bg-gray-50 border-gray-100'
       };
     default:
       return {
         label: `updated task`,
         icon: <Clock className="w-3 h-3 text-gray-500" />,
         bgColor: 'bg-gray-50 border-gray-100'
       };
   }
 };

 return (
 <>
 <div className="flex items-center justify-between border-b border-gray-100 p-4">
 <div className="flex items-center text-xs font-medium text-gray-500">
 {todo.projectId && todo.projectId !== 'inbox' 
 ? <><Folder className="w-3.5 h-3.5 mr-1.5 text-[#1a2b58]" />{projects.find(p => p.id === todo.projectId)?.name}</>
 : <><Inbox className="w-3.5 h-3.5 mr-1.5 text-gray-400" />Inbox</>
 }
 </div>
 <button onClick={() => setSelectedTodoId(null)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
 <X className="w-4 h-4" />
 </button>
 </div>
 
 {/* Tab Navigation */}
 <div className="flex border-b border-gray-100 px-6 bg-white select-none shrink-0">
   <button
     type="button"
     onClick={() => setDetailTab('details')}
     className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 mr-6 transition-all ${detailTab === 'details' ? 'border-[#1a2b58] text-[#1a2b58]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
   >
     Task Details
   </button>
   <button
     type="button"
     onClick={() => setDetailTab('activity')}
     className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${detailTab === 'activity' ? 'border-[#1a2b58] text-[#1a2b58]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
   >
     Activity
     {todo.activities && todo.activities.length > 0 && (
       <span className="bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
         {todo.activities.length}
       </span>
     )}
   </button>
 </div>

 {detailTab === 'details' ? (
   <div className="flex-1 overflow-y-auto p-6 text-left">
 <div className="flex items-start">
 <button 
 onClick={() => handleToggleTodo(todo)}
 className={`mr-3 mt-1 w-5 h-5 flex shrink-0 items-center justify-center rounded-full border-2 transition-all ${getPriorityCheckboxStyle(todo.priority)}`}
 >
 {todo.completed && <Check className="w-3 h-3 text-primary" />}
 </button>
 <div className="relative flex-1">
 <input
 className={`text-lg outline-none w-full bg-transparent pr-8 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}
 value={todo.title}
 onChange={(e) => todoService.updateTodo(todo.id, { title: e.target.value })}
 onFocus={() => setInitialTitle(todo.title)}
 onBlur={async () => {
   if (todo.title !== initialTitle && todo.title.trim() !== '') {
     const now = Date.now();
     const newActivity = {
       id: Math.random().toString(36).substring(2, 9),
       type: 'title' as const,
       field: 'Title',
       oldValue: initialTitle,
       newValue: todo.title,
       createdAt: now,
       user: 'You'
     };
     const updatedActivities = [...(todo.activities || []), newActivity];
     setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, activities: updatedActivities } : t));
     await todoService.updateTodo(todo.id, { activities: updatedActivities });
   }
 }}
 />
 <button
 type="button"
 onClick={() => setActiveEmojiPicker(activeEmojiPicker === `todo-${todo.id}` ? null : `todo-${todo.id}`)}
 className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
 >
 <Smile className="w-4 h-4" />
                                </button>
                                <AnimatePresence>
                                  {activeEmojiPicker === `todo-${todo.id}` && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute right-0 top-full mt-2 z-[150] shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 todoService.updateTodo(todo.id, { title: todo.title + emojiData.emoji });
                                          setActiveEmojiPicker(null);
 }}
 width={280}
 height={350}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* Detail picking controls */}
 <div className="grid grid-cols-3 gap-2.5 mt-5 border-b border-gray-150 pb-5">
 {/* Due Date */}
 <div className="relative">
 <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Due Date</label>
 <button 
 onClick={() => { setShowDetailDatePicker(!showDetailDatePicker); setShowDetailPriorityPicker(false); setShowDetailRepeatPicker(false); }}
 className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${showDetailDatePicker ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50/50 text-gray-700'}`}
 >
 <span className={`truncate flex items-center gap-1.5 ${todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? 'text-red-500 font-semibold' : ''}`}>
 <CalendarIcon className={`w-3.5 h-3.5 ${todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? 'text-red-500' : todo.dueDate ? 'text-primary' : 'text-gray-400'}`} />
 {todo.dueDate && todo.dueDate < startOfDay(new Date()).getTime() ? `Overdue (${format(new Date(todo.dueDate), 'MMM d, yyyy')})` : todo.dueDate ? format(new Date(todo.dueDate), 'MMM d, yyyy') : 'No Date'}
 </span>
 <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${showDetailDatePicker ? 'rotate-180' : ''}`} />
</button>
<AnimatePresence>
{showDetailDatePicker && (
  <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute top-full left-0 mt-2 z-50 bg-white border-none rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 w-44" onClick={(e) => e.stopPropagation()}>
    {[
      { label: "Today", date: startOfDay(new Date()), color: "bg-green-500" },
      { label: "Tomorrow", date: startOfDay(addDays(new Date(), 1)), color: "bg-primary" },
      { label: "Next Week", date: startOfDay(addWeeks(new Date(), 1)), color: "bg-purple-500" },
    ].map((preset) => {
      const isSelected = todo.dueDate && isSameDay(new Date(todo.dueDate), preset.date);
      return (
        <button
          key={preset.label}
          type="button"
          onClick={() => {
            const nextDate = preset.date.getTime();
            const updatedActivities = logDueDateChange(nextDate);
            setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, dueDate: nextDate, activities: updatedActivities } : t));
            todoService.updateTodo(todo.id, { dueDate: nextDate, activities: updatedActivities });
            setShowDetailDatePicker(false);
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${isSelected ? "bg-primary/5 text-primary" : "hover:bg-gray-50 text-gray-700"}`}
        >
          <span className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${preset.color}`} />
            {preset.label}
          </span>
          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
        </button>
      );
    })}
    <button
      type="button"
      onClick={() => {
        const updatedActivities = logDueDateChange(null);
        setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, dueDate: null, activities: updatedActivities } : t));
        todoService.updateTodo(todo.id, { dueDate: null, activities: updatedActivities });
        setShowDetailDatePicker(false);
      }}
      className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${!todo.dueDate ? "bg-primary/5 text-primary" : "hover:bg-gray-50 text-gray-700"}`}
    >
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Clear Date
      </span>
      {!todo.dueDate && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
    <div className="mx-1 h-px bg-gray-100 my-1.5" />
    <div className="px-1.5 pb-1">
      <label className="text-[10px] uppercase font-semibold text-gray-400 mb-1 block tracking-widest px-1">Custom Date</label>
      <input
        type="date"
        className="w-full text-xs p-1.5 border border-gray-200 rounded-md outline-none focus:border-primary/50 text-gray-700 cursor-text bg-gray-50"
        value={todo.dueDate ? format(new Date(todo.dueDate), "yyyy-MM-dd") : ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          if (e.target.value) {
            const nextDate = startOfDay(new Date(e.target.value + "T00:00:00")).getTime();
            const updatedActivities = logDueDateChange(nextDate);
            setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, dueDate: nextDate, activities: updatedActivities } : t));
            todoService.updateTodo(todo.id, { dueDate: nextDate, activities: updatedActivities });
            setShowDetailDatePicker(false);
          } else {
            const updatedActivities = logDueDateChange(null);
            setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, dueDate: null, activities: updatedActivities } : t));
            todoService.updateTodo(todo.id, { dueDate: null, activities: updatedActivities });
            setShowDetailDatePicker(false);
          }
        }}
      />
    </div>
  </motion.div>
)}
</AnimatePresence>
 </div>

 {/* Priority Picker */}
 <div className="relative">
 <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Priority</label>
 <button 
 onClick={() => { setShowDetailPriorityPicker(!showDetailPriorityPicker); setShowDetailDatePicker(false); setShowDetailRepeatPicker(false); }}
 className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${showDetailPriorityPicker ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50/50 text-gray-700'}`}
 >
 <span className="flex items-center gap-1.5 truncate">
 <Flag className={`w-3.5 h-3.5 ${getPriorityColor(todo.priority || 4)} fill-current`} />
 P{todo.priority || 4}
 </span>
 <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${showDetailPriorityPicker ? 'rotate-180' : ''}`} />
 </button>
 <AnimatePresence>
 {showDetailPriorityPicker && (
 <motion.div 
 initial={{ opacity: 0, y: 8, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.95 }}
 transition={{ duration: 0.15 }}
 className="absolute top-full left-0 mt-2 z-50 bg-white border-none rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 w-40"
 >
 {[
 { level: 1, label: 'P1 Urgent' },
 { level: 2, label: 'P2 High' },
 { level: 3, label: 'P3 Medium' },
 { level: 4, label: 'P4 None' }
 ].map(({ level, label }) => {
 const isSelected = (todo.priority || 4) === level;
 return (
 <button
 key={level}
 onClick={async () => {
   const now = Date.now();
   const newActivity = {
     id: Math.random().toString(36).substring(2, 9),
     type: 'priority' as const,
     field: 'Priority',
     oldValue: `P${todo.priority || 4}`,
     newValue: `P${level}`,
     createdAt: now,
     user: 'You'
   };
   const updatedActivities = [...(todo.activities || []), newActivity];
   setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, priority: level, activities: updatedActivities } : t));
   await todoService.updateTodo(todo.id, { priority: level, activities: updatedActivities });
   setShowDetailPriorityPicker(false);
 }}
 className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
 >
 <span className="flex items-center">
 <Flag className={`w-3.5 h-3.5 mr-2 ${getPriorityColor(level)} ${level < 4 ? 'fill-current' : ''}`} />
 {label}
 </span>
 {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
 </button>
 );
 })}
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Repeat Interval Picker */}
 <div className="relative">
 <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Repeat</label>
 <button 
 onClick={() => { setShowDetailRepeatPicker(!showDetailRepeatPicker); setShowDetailDatePicker(false); setShowDetailPriorityPicker(false); }}
 className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${showDetailRepeatPicker ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50/50 text-gray-700'}`}
 >
 <span className="flex items-center gap-1.5 truncate">
 <RefreshCw className={`w-3.5 h-3.5 ${todo.repeatInterval ? 'text-primary' : 'text-gray-400'}`} />
 {todo.repeatInterval ? todo.repeatInterval.charAt(0).toUpperCase() + todo.repeatInterval.slice(1) : 'None'}
 </span>
 <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${showDetailRepeatPicker ? 'rotate-180' : ''}`} />
 </button>
 <AnimatePresence>
 {showDetailRepeatPicker && (
 <motion.div 
 initial={{ opacity: 0, y: 8, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.95 }}
 transition={{ duration: 0.15 }}
 className="absolute top-full left-0 mt-2 z-50 bg-white border-none rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 w-40"
 >
 {[
 { value: null, label: 'None' },
 { value: 'daily', label: 'Daily' },
 { value: 'weekly', label: 'Weekly' },
 { value: 'monthly', label: 'Monthly' }
 ].map(({ value, label }) => {
 const isSelected = todo.repeatInterval === value || (!todo.repeatInterval && !value);
 return (
 <button
 key={value || 'none'}
 onClick={() => {
 setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, repeatInterval: value as any } : t));
 todoService.updateTodo(todo.id, { repeatInterval: value as any });
 setShowDetailRepeatPicker(false);
 }}
 className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors ${isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50 text-gray-700'}`}
 >
 <span className="flex items-center">
 <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
 {label}
 </span>
 {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
 </button>
 );
 })}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 {/* Blocking Picker */}
 <div className="relative mt-4">
 <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Blocked By</label>
 <button 
 onClick={() => { setShowDetailBlockingPicker(!showDetailBlockingPicker); setShowDetailDatePicker(false); setShowDetailPriorityPicker(false); setShowDetailRepeatPicker(false); }}
 className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${showDetailBlockingPicker ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50/50 text-gray-700'}`}
 >
 <span className="flex items-center gap-1.5 truncate">
 <Lock className={`w-3.5 h-3.5 ${(todo.blockedBy?.length || 0) > 0 ? 'text-rose-500' : 'text-gray-400'}`} />
 {(todo.blockedBy?.length || 0) > 0 ? `${todo.blockedBy?.length} Task(s)` : 'None'}
 </span>
 <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${showDetailBlockingPicker ? 'rotate-180' : ''}`} />
 </button>
 <AnimatePresence>
 {showDetailBlockingPicker && (
 <motion.div 
 initial={{ opacity: 0, y: 8, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.95 }}
 transition={{ duration: 0.15 }}
 className="absolute top-full left-0 mt-2 z-50 bg-white border-none rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 w-60 max-h-48 overflow-y-auto"
 >
 {todos.filter(t => t.id !== todo.id && !t.completed && !t.deletedAt).length === 0 ? (
 <div className="px-2.5 py-2 text-xs text-gray-400">No active tasks to block this.</div>
 ) : (
 todos.filter(t => t.id !== todo.id && !t.completed && !t.deletedAt).map(t => {
 const isSelected = todo.blockedBy?.includes(t.id);
 return (
 <button
 key={t.id}
 onClick={() => {
 const currentBlockedBy = todo.blockedBy || [];
 let nextBlockedBy;
 if (isSelected) {
 nextBlockedBy = currentBlockedBy.filter(id => id !== t.id);
 } else {
 nextBlockedBy = [...currentBlockedBy, t.id];
 }
 setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, blockedBy: nextBlockedBy.length > 0 ? nextBlockedBy : [] } : t));
 todoService.updateTodo(todo.id, { blockedBy: nextBlockedBy.length > 0 ? nextBlockedBy : undefined });
 setShowDetailBlockingPicker(false);
 }}
 className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors text-left ${isSelected ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-50 text-gray-700'}`}
 >
 <span className="flex items-center truncate max-w-[180px]">
 <Lock className={`w-3.5 h-3.5 mr-2 shrink-0 ${isSelected ? 'text-rose-500' : 'text-gray-400'}`} />
 <span className="truncate">{t.title}</span>
 </span>
 {isSelected && <Check className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-2" />}
 </button>
 );
 })
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Notes / Descriptions and subtasks checklist inside Drawer */}
 <div className="mt-5 space-y-5">
 <div className="flex flex-col text-left">
 <div className="flex items-center justify-between mb-2">
 <label className="text-xs text-gray-400 uppercase tracking-widest">Notes</label>
 <div className="flex items-center space-x-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
 <button
 type="button"
 onClick={() => setIsNotesPreviewMode(false)}
 className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition cursor-pointer ${!isNotesPreviewMode ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
 >
 Edit
 </button>
 <button
 type="button"
 onClick={() => setIsNotesPreviewMode(true)}
 className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition cursor-pointer ${isNotesPreviewMode ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
 >
 Preview
 </button>
 </div>
 </div>

 {isNotesPreviewMode ? (
 <div 
 className="text-xs w-full bg-gray-50 border border-gray-200 p-3 rounded-xl min-h-[90px] max-h-[250px] overflow-y-auto leading-relaxed select-text text-gray-800"
 dangerouslySetInnerHTML={{ __html: parseMarkdown(todo.description || '') || '<em class="text-gray-400 font-sans">No notes written. Use markdown formatting like **bold**, *lists*, and [links](url)!</em>' }}
 />
 ) : (
 <textarea
 placeholder="Add detailed parameters or Markdown logs..."
 className="text-xs w-full bg-gray-50/50 hover:bg-gray-50 border focus:bg-white focus:border-primary p-3 rounded-xl min-h-[90px] outline-none transition"
 value={todo.description || ''}
 onChange={(e) => todoService.updateTodo(todo.id, { description: e.target.value })}
 />
 )}
 </div>


 <div className="flex flex-col text-left">
 <label className="text-xs text-gray-400 uppercase tracking-widest mb-2">Subtasks</label>
 <div className="space-y-1.5">
 <Reorder.Group 
   axis="y" 
   values={todo.subtasks || []} 
   onReorder={(newOrder) => todoService.updateTodo(todo.id, { subtasks: newOrder })}
   className="space-y-1.5"
 >
 {todo.subtasks?.map(subtask => (
 <Reorder.Item key={subtask.id} value={subtask} className="flex items-center group">
 <GripVertical className="w-4 h-4 shrink-0 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-500 cursor-grab active:cursor-grabbing transition-opacity mr-1" />
 <button
 onClick={() => {
 const next = todo.subtasks?.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s);
 todoService.updateTodo(todo.id, { subtasks: next });
 }}
 className={`mr-2 w-4 h-4 rounded border flex items-center justify-center text-xs font-medium ${subtask.completed ? 'bg-primary text-white border-primary' : 'border-gray-200 bg-gray-50'}`}
 >
 {subtask.completed ? '✓' : ''}
 </button>
 <input
 type="text"
 className={`text-xs flex-1 outline-none bg-transparent ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}
 value={subtask.title}
 onChange={(e) => {
 const next = todo.subtasks?.map(s => s.id === subtask.id ? { ...s, title: e.target.value } : s);
 todoService.updateTodo(todo.id, { subtasks: next });
 }}
 />
 <button 
 onClick={() => {
 const next = todo.subtasks?.filter(s => s.id !== subtask.id);
 todoService.updateTodo(todo.id, { subtasks: next });
 }}
 className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-all shrink-0 ml-1"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </Reorder.Item>
 ))}
 </Reorder.Group>
 <div className="flex items-center mt-2 pl-6 select-none text-[#1a2b58]">
 <Plus className="w-4.5 h-4.5 mr-1" />
 <input
 placeholder="Add a subtask... (Enter)"
 onKeyDown={(e) => {
 if (e.key === 'Enter' && e.currentTarget.value.trim()) {
 const next = [...(todo.subtasks || []), { id: Date.now().toString(), title: e.currentTarget.value.trim(), completed: false }];
 todoService.updateTodo(todo.id, { subtasks: next });
 e.currentTarget.value = '';
 }
 }}
 className="text-xs bg-transparent outline-none flex-1 placeholder:text-[#1a2b58]"
 />
 </div>
 </div>
 </div>

  {/* Comments Section */}
  <div className="flex flex-col text-left pt-5 border-t border-gray-150">
    <label className="text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 select-none font-medium">
      <MessageSquare className="w-3.5 h-3.5 text-[#1a2b58]" /> Comments ({(todo.comments?.length || 0) + (todo.comments?.reduce((acc, c) => acc + (c.replies?.length || 0), 0) || 0)})
    </label>
    
    {/* Comments List */}
    <div className="space-y-3.5 mb-4 max-h-[280px] overflow-y-auto pr-1">
      {(!todo.comments || todo.comments.length === 0) ? (
        <p className="text-xs text-gray-400 italic">No comments yet. Add one below!</p>
      ) : (
        todo.comments.map(comment => {
          const hasLikedComment = comment.isLikedByMe;
          const isReplying = replyingToCommentId === comment.id;

          return (
            <div key={comment.id} className="group/comment flex flex-col gap-1.5">
              {/* Comment Bubble */}
              <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100 flex flex-col gap-1 text-xs transition-colors hover:bg-gray-50">
                <div className="flex items-center justify-between text-gray-400 font-medium select-none">
                  <span className="text-gray-600 font-semibold">{comment.author || 'You'}</span>
                  <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap select-text">{comment.text}</p>
                
                {/* Actions Toolbar (Like & Reply) */}
                <div className="flex items-center gap-4 mt-1 pt-1.5 border-t border-gray-100/50 text-[11px] text-gray-400">
                  <button 
                    type="button"
                    onClick={() => {
                      const updatedComments = todo.comments?.map(c => {
                        if (c.id === comment.id) {
                          const isLiked = !c.isLikedByMe;
                          return {
                            ...c,
                            isLikedByMe: isLiked,
                            likes: (c.likes || 0) + (isLiked ? 1 : -1)
                          };
                        }
                        return c;
                      }) || [];
                      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, comments: updatedComments } : t));
                      todoService.updateTodo(todo.id, { comments: updatedComments });
                    }}
                    className={`flex items-center gap-1 font-semibold transition-colors hover:text-rose-500 ${hasLikedComment ? 'text-rose-500' : ''}`}
                  >
                    <Heart className={`w-3 h-3 ${hasLikedComment ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{comment.likes || 0}</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setReplyingToCommentId(isReplying ? null : comment.id)}
                    className={`flex items-center gap-1 font-semibold transition-colors hover:text-[#1a2b58] ${isReplying ? 'text-[#1a2b58]' : ''}`}
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </div>
              </div>

              {/* Threaded Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="border-l-2 border-gray-100 pl-3.5 ml-3.5 space-y-2 flex flex-col">
                  {comment.replies.map(reply => {
                    const hasLikedReply = reply.isLikedByMe;
                    return (
                      <div key={reply.id} className="bg-gray-50/40 p-2.5 rounded-xl border border-gray-50 flex flex-col gap-1 text-[11px] transition-colors hover:bg-gray-50/60">
                        <div className="flex items-center justify-between text-gray-400 font-medium select-none">
                          <span className="text-gray-600 font-semibold">{reply.author || 'You'}</span>
                          <span>{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap select-text">{reply.text}</p>
                        
                        {/* Reply Like Action */}
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-400">
                          <button 
                            type="button"
                            onClick={() => {
                              const updatedComments = todo.comments?.map(c => {
                                if (c.id === comment.id) {
                                  const updatedReplies = c.replies?.map(r => {
                                    if (r.id === reply.id) {
                                      const isLiked = !r.isLikedByMe;
                                      return {
                                        ...r,
                                        isLikedByMe: isLiked,
                                        likes: (r.likes || 0) + (isLiked ? 1 : -1)
                                      };
                                    }
                                    return r;
                                  }) || [];
                                  return { ...c, replies: updatedReplies };
                                }
                                return c;
                              }) || [];
                              setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, comments: updatedComments } : t));
                              todoService.updateTodo(todo.id, { comments: updatedComments });
                            }}
                            className={`flex items-center gap-1 font-semibold transition-colors hover:text-rose-500 ${hasLikedReply ? 'text-rose-500' : ''}`}
                          >
                            <Heart className={`w-2.5 h-2.5 ${hasLikedReply ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span>{reply.likes || 0}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline Reply Input Box */}
              {isReplying && (
                <div className="ml-3.5 pl-3.5 border-l-2 border-primary/20 flex gap-2 items-start mt-1">
                  <textarea
                    placeholder="Write a reply... (Enter to post)"
                    className="text-xs flex-1 bg-gray-50/50 hover:bg-gray-50 border focus:bg-white focus:border-primary p-2 rounded-xl outline-none transition resize-none h-[48px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const text = e.currentTarget.value.trim();
                        if (text) {
                          const newReply = {
                            id: Math.random().toString(36).substring(2, 9),
                            text,
                            createdAt: Date.now(),
                            author: 'You',
                            likes: 0,
                            isLikedByMe: false
                          };
                          const updatedComments = todo.comments?.map(c => {
                            if (c.id === comment.id) {
                              return {
                                ...c,
                                replies: [...(c.replies || []), newReply]
                              };
                            }
                            return c;
                          }) || [];
                          setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, comments: updatedComments } : t));
                          todoService.updateTodo(todo.id, { comments: updatedComments });
                          setReplyingToCommentId(null);
                        }
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setReplyingToCommentId(null)}
                    className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 select-none self-center"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>

    {/* Comment Input Box */}
    <div className="flex gap-2 items-start mt-1">
      <textarea
        placeholder="Add a comment... (Enter to post)"
        className="text-xs flex-1 bg-gray-50/50 hover:bg-gray-50 border focus:bg-white focus:border-primary p-2.5 rounded-xl outline-none transition resize-none h-[68px]"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = e.currentTarget.value.trim();
            if (text) {
              const newComment = {
                id: Math.random().toString(36).substring(2, 9),
                text,
                createdAt: Date.now(),
                author: 'You',
                likes: 0,
                isLikedByMe: false,
                replies: []
              };
              const updatedComments = [...(todo.comments || []), newComment];
              setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, comments: updatedComments } : t));
              todoService.updateTodo(todo.id, { comments: updatedComments });
              e.currentTarget.value = '';
            }
          }
        }}
      />
    </div>
  </div>

 </div>
 </div>
 ) : (
   <div className="flex-1 overflow-y-auto p-6 text-left">
     {/* Activity Tab Feed */}
     {(!todo.activities || todo.activities.length === 0) ? (
       <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
         <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-3 border border-gray-100 animate-pulse">
           <Clock className="w-6 h-6 text-gray-400" />
         </div>
         <h3 className="text-sm font-semibold text-gray-700 mb-1">No activity logged yet</h3>
         <p className="text-xs text-gray-400 max-w-[260px] leading-relaxed">
           Changes to this task's status, priority, or title will appear here in chronological order.
         </p>
       </div>
     ) : (
       <div className="space-y-5 relative pl-4 ml-2 border-l border-gray-100 pt-2 pb-6">
         {todo.activities.slice().reverse().map((act) => {
           const details = getActivityDetails(act);
           return (
             <div key={act.id} className="relative flex flex-col gap-1 text-xs">
               {/* Circle Icon Indicator */}
               <div className={`absolute -left-[25px] top-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 bg-white ${details.bgColor}`}>
                 {details.icon}
               </div>
               
               {/* Activity Description */}
               <div className="flex flex-col gap-0.5 ml-2">
                 <div className="flex items-center justify-between text-gray-400 font-medium select-none">
                   <span className="text-gray-700 font-semibold">{act.user || 'You'}</span>
                   <span>{formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}</span>
                 </div>
                 <p className="text-gray-600">
                   {details.label}
                 </p>
                 {details.details && (
                   <p className="text-gray-400 text-[11px] bg-gray-50/50 border border-gray-100 rounded-lg p-2 mt-1 whitespace-pre-wrap font-medium">
                     {details.details}
                   </p>
                 )}
               </div>
             </div>
           );
         })}
       </div>
     )}
   </div>
 )}
 </>
 );
 })()}
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Dynamic Guideline Popup */}
 {showHelpGuide && (
 <GuidePopup onClose={() => setShowHelpGuide(false)} />
 )}

 {/* Add List Modal (Visual replica of TickTick) */}
 <AnimatePresence>
 {isProjectModalOpen && (
 <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-white rounded-[24px] shadow-2xl border border-gray-150 max-w-md w-full flex flex-col overflow-visible text-left"
 >
 {/* Left Panel: Inputs Form */}
 <div className="p-6 md:p-8 flex flex-col">
 <div>
 {/* Header Title */}
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg text-gray-800">{editingProjectIdInModal ? "Edit List" : "Add List"}</h3>
 {/* Mobile-only close button */}
 <button
 type="button"
 onClick={() => {
    setIsProjectModalOpen(false);
    setEditingProjectIdInModal(null);
    setNewProjectName('');
  }}
 className="md:hidden text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-150"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Form Input Container */}
 <div className="space-y-5">
 {/* Name row input */}
 <div className="relative">
 <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
 <Menu className="w-4 h-4" />
 </div>
 <div className="relative">
 <input
 type="text"
 placeholder="Name"
 autoFocus
 value={newProjectName}
 onChange={(e) => setNewProjectName(e.target.value)}
 className="w-full text-xs sm:text-sm pl-10 pr-10 py-2.5 bg-white border border-gray-200 focus:border-blue-450 focus:ring-1 focus:ring-blue-450 rounded-xl outline-none transition text-black font-semibold shadow-sm"
 />
 <button
 type="button"
 onClick={() => setActiveEmojiPicker(activeEmojiPicker === "project" ? null : "project")}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
 >
 <Smile className="w-4 h-4" />
                          </button>
                          <AnimatePresence>
                            {activeEmojiPicker === "project" && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute right-0 top-full mt-2 z-[150] shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setNewProjectName(prev => emojiData.emoji + " " + prev);
                                  setActiveEmojiPicker(null);
 }}
 width={280}
 height={350}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>

 <div className="flex items-center space-x-4">
 <span className="text-xs font-medium text-gray-500 w-24 shrink-0">List Color</span>
 <div className="flex items-center flex-wrap gap-2.5">
 {/* Crossed diagonal slash button representing none or standard grey */}
 <button
 type="button"
 onClick={() => setListColor('#6b7280')}
 className={`w-5.5 h-5.5 rounded-full border border-gray-300 relative bg-white transition-all shadow-sm ${listColor === '#6b7280' ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
 title="No specific color"
 >
 <div className="absolute w-full h-[1.5px] bg-red-400 rotate-45 top-1/2 left-0 -translate-y-1/2" />
 </button>

 {/* Standard Color Dots */}
 {[
 '#f87171', // Red
 'var(--color-secondary)', // Orange -> Gold
 '#facc15', // Yellow
 '#a3e635', // Lime
 '#4ade80', // Green
 '#38bdf8', // Cyan
 '#1a2b58', // Classic Blue
 '#818cf8', // Purple
 ].map((color) => (
 <button
 key={color}
 type="button"
 onClick={() => setListColor(color)}
 className={`w-5.5 h-5.5 rounded-full border border-gray-100 transition-all shadow-sm relative ${listColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
 style={{ backgroundColor: color }}
 />
 ))}

 {/* Beautiful Custom rainbow gradient color dot */}
 <button
 type="button"
 onClick={() => setListColor('linear-gradient(135deg, #f43f5e, #3b82f6, #10b981)')}
 className={`w-5.5 h-5.5 rounded-full border border-gray-200 transition-all shadow-sm relative bg-gradient-to-tr from-rose-400 via-sky-450 to-emerald-400 ${listColor.includes('gradient') ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
 title="Gradient list theme"
 />
 </div>
 </div>

 {/* View Type selection row */}
 <div className="flex items-center space-x-4">
 <span className="text-xs font-medium text-gray-500 w-24 shrink-0">View Type</span>
 <div className="flex items-center space-x-2.5">
 {/* View List Button */}
 <button
 type="button"
 onClick={() => setListViewType('list')}
 className={`p-2.5 border rounded-xl flex items-center justify-center transition-all ${listViewType === 'list' ? 'bg-[#ebf3ff]/80 border-[#1a2b58] text-[#1a2b58] shadow-sm' : 'border-gray-200 bg-gray-50/50 text-gray-400 hover:bg-gray-100/50'}`}
 title="Sequential List View"
 >
 <Menu className="w-4.5 h-4.5" />
 </button>

 {/* View Kanban Button */}
 <button
 type="button"
 onClick={() => setListViewType('kanban')}
 className={`p-2.5 border rounded-xl flex items-center justify-center transition-all ${listViewType === 'kanban' ? 'bg-[#ebf3ff]/80 border-[#1a2b58] text-[#1a2b58] shadow-sm' : 'border-gray-200 bg-gray-50/50 text-gray-400 hover:bg-gray-100/50'}`}
 title="Kanban Board View"
 >
 <GripVertical className="w-4.5 h-4.5" />
 </button>

 {/* View Timeline Button (With tiny Sparkles / Crown offset premium crown badge) */}
 <button
 type="button"
 onClick={() => setListViewType('timeline')}
 className={`p-2.5 border rounded-xl flex items-center justify-center transition-all relative ${listViewType === 'timeline' ? 'bg-[#ebf3ff]/80 border-[#1a2b58] text-[#1a2b58] shadow-sm' : 'border-gray-200 bg-gray-50/50 text-gray-400 hover:bg-gray-100/50'}`}
 title="Timeline Gantt view"
 >
 <svg className="w-4.5 h-4.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
 <line x1="8" y1="6" x2="20" y2="6" />
 <line x1="4" y1="12" x2="16" y2="12" />
 <line x1="10" y1="18" x2="22" y2="18" />
 </svg>
 {/* Floating Crown premium Badge indicator */}
 <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 border-2 border-white rounded-full p-0.5 text-white animate-bounce flex items-center justify-center">
 <Sparkles className="w-2 h-2 text-white" />
 </span>
 </button>
 </div>
 </div>

 {/* Folder row */}
 <div className="flex items-center space-x-4">
 <span className="text-xs font-medium text-gray-500 w-24 shrink-0">Folder</span>
 {!isCreatingFolderInModal ? (
 <div className="flex-1 max-w-[280px]">
 <div className="relative flex-1 max-w-[280px] group z-[60]">
 <CustomSelect
 value={listFolderId}
 onChange={(val) => {
 if (val === 'create_new') {
 setIsCreatingFolderInModal(true);
 setNewFolderNameInModal('');
 } else {
 setListFolderId(val);
 }
 }}
 className="flex-1 w-full text-xs bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md rounded-xl py-2 px-3 font-medium text-gray-700 shadow-sm transition-colors cursor-pointer relative z-0"
 options={[
 { value: 'none', label: 'None' },
 ...folders.map((f) => ({ value: f.id, label: `📁 ${f.name}` })),
 { value: 'create_new', label: '+ Create New Folder...' }
 ]}
 />
</div>
 </div>
 ) : (
 <div className="relative flex-1 max-w-[280px] flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1 duration-150">
 <input
 type="text"
 placeholder="New Folder..."
 value={newFolderNameInModal}
 onChange={(e) => setNewFolderNameInModal(e.target.value)}
 onKeyDown={async (e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 if (newFolderNameInModal.trim() && auth.currentUser) {
 const result = await todoService.createFolder(newFolderNameInModal.trim(), auth.currentUser.uid);
 if (result && result.id) {
 setListFolderId(result.id);
 }
 setIsCreatingFolderInModal(false);
 }
 } else if (e.key === 'Escape') {
 setIsCreatingFolderInModal(false);
 }
 }}
 className="flex-1 text-xs bg-white border border-gray-200 focus:border-primary rounded-xl px-2.5 pr-7 py-1.5 outline-none font-medium text-gray-700 shadow-sm transition-all w-full"
 autoFocus
 />
 <button
 type="button"
 onClick={() => setActiveEmojiPicker(activeEmojiPicker === "modal-folder" ? null : "modal-folder")}
 className="absolute right-[90px] xl:right-24 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
 >
 <Smile className="w-3.5 h-3.5" />
                              </button>
                              <AnimatePresence>
                                {activeEmojiPicker === "modal-folder" && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute left-0 top-full mt-2 z-[150] shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setNewFolderNameInModal(prev => emojiData.emoji + " " + prev);
                                      setActiveEmojiPicker(null);
 }}
 width={280}
 height={350}
 />
 </motion.div>
 )}
 </AnimatePresence>
 <button
 type="button"
 onClick={async () => {
 if (newFolderNameInModal.trim() && auth.currentUser) {
 const result = await todoService.createFolder(newFolderNameInModal.trim(), auth.currentUser.uid);
 if (result && result.id) {
 setListFolderId(result.id);
 }
 setIsCreatingFolderInModal(false);
 }
 }}
 disabled={!newFolderNameInModal.trim()}
 className="px-2.5 py-1.5 text-white bg-primary hover:bg-primary hover:opacity-90 disabled:opacity-50 rounded-lg text-xs shadow-sm transition-colors"
 >
 Save
 </button>
 <button
 type="button"
 onClick={() => setIsCreatingFolderInModal(false)}
 className="p-1 px-1.5 border border-gray-250 hover:bg-gray-50 text-gray-400 rounded-lg text-xs transition-colors"
 >
 ✕
 </button>
 </div>
 )}
 </div>

 {/* List Type row */}
 <div className="flex items-center space-x-4">
 <span className="text-xs font-medium text-gray-500 w-24 shrink-0">List Type</span>
 <div className="relative flex-1 max-w-[280px] group z-[50]">
 <CustomSelect
 value={listType}
 onChange={(val) => setListType(val as 'task' | 'note')}
 className="flex-1 w-full text-xs bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md rounded-xl py-2 px-3 font-medium text-gray-700 shadow-sm transition-colors cursor-pointer relative z-0"
 options={[
 { value: 'task', label: 'Task List' },
 { value: 'note', label: 'Note List' }
 ]}
 />
</div>
 </div>

 {/* Show in Smart List row */}
 <div className="flex items-center space-x-4">
 <span className="text-xs font-medium text-gray-500 w-24 shrink-0">Show in Smart List</span>
 <div className="relative flex-1 max-w-[280px] group z-[40]">
 <CustomSelect
 value={listSmartOption}
 onChange={(val) => setListSmartOption(val as 'all' | 'none')}
 className="flex-1 w-full text-xs bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md rounded-xl py-2 px-3 font-medium text-gray-700 shadow-sm transition-colors cursor-pointer relative z-0"
 options={[
 { value: 'all', label: 'All tasks' },
 { value: 'none', label: 'None' }
 ]}
 />
</div>
 </div>
 </div>
 </div>
 {/* Cancel & Add operations buttons stacked aligned left */}
 <div className="flex items-center space-x-2.5 mt-8 border-t border-gray-100 pt-5">
 <button
 type="button"
 onClick={() => {
    setIsProjectModalOpen(false);
    setEditingProjectIdInModal(null);
    setNewProjectName('');
  }}
 className="px-6 py-2 border border-gray-250 hover:bg-gray-50 text-gray-600 rounded-xl text-xs shadow-sm transition-all"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={!newProjectName.trim()}
 onClick={async () => {
    if (newProjectName.trim() && auth.currentUser) {
      const targetFolder = listFolderId === 'none' ? null : listFolderId;
      const sections = [];
      if (editingProjectIdInModal) {
        await todoService.updateProject(editingProjectIdInModal, {
          name: newProjectName.trim(),
          color: listColor,
          folderId: targetFolder,
          viewType: listViewType as any
        });
      } else {
        await todoService.createProject(
          newProjectName.trim(), 
          listColor, 
          auth.currentUser.uid, 
          undefined, 
          targetFolder,
          listViewType as any,
          sections
        );
      }
      setNewProjectName('');
      setEditingProjectIdInModal(null);
      setIsProjectModalOpen(false);
    }
  }}
 className="px-6 py-2 text-white bg-primary hover:bg-primary hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-xs shadow-md shadow-primary/10 transition-all cursor-pointer"
 >
 Add
 </button>
 </div>
 </div>

           </motion.div>
        </div>
      )}
    </AnimatePresence>

 {/* Confirm Dialog */}
 <AnimatePresence>
 {confirmDialog?.isOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 backdrop-blur-sm">
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border text-left">
 <h3 className=" text-sm text-gray-900 mb-2">Confirm Action</h3>
 <p className="font-medium text-base text-gray-500 mb-5">{confirmDialog.message}</p>
 <div className="flex justify-end space-x-2">
 <button onClick={() => setConfirmDialog(null)} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium">
 Cancel
 </button>
 <button onClick={confirmDialog.onConfirm} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700">
 Confirm
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Decline/Delete Task Reason Dialog */}
 <AnimatePresence>
 {deletingTodoState && (
 <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-white rounded-3xl shadow-2xl border border-gray-150 max-w-md w-full overflow-hidden text-left p-6 md:p-8"
 >
 <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
 <h3 className="text-base font-bold text-gray-800 uppercase tracking-widest font-mono flex items-center gap-2">
 📋 Specify Task Reason
 </h3>
 <button
 type="button"
 onClick={() => {
 setDeletingTodoState(null);
 setTaskDeclineOrDeleteReason("");
 }}
 className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="space-y-4">
 <p className="text-xs text-gray-500 font-medium leading-relaxed">
 Please enter or select a reason for declining or deleting this task. This reason will be persistently saved in the task's audit metadata.
 </p>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 font-mono">
 Choose Preset Reasons:
 </label>
 <div className="flex flex-wrap gap-1.5 mb-3">
 {[
 "No longer applicable or required",
 "Completed outside the workspace",
 "Duplicate task entry",
 "Scope or timeline priority changed",
 "Out of scope segment",
 "Statutory compliance deficiency"
 ].map((preset) => (
 <button
 key={preset}
 type="button"
 onClick={() => setTaskDeclineOrDeleteReason(preset)}
 className={`text-[10px] px-2.5 py-1.5 rounded-xl border text-left transition-all font-sans font-medium cursor-pointer ${
 taskDeclineOrDeleteReason === preset 
 ? 'bg-primary/10 border-primary text-primary font-semibold' 
 : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
 }`}
 >
 {preset}
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
 Comment / Custom Reason:
 </label>
 <textarea
 rows={3}
 required
 value={taskDeclineOrDeleteReason}
 onChange={(e) => setTaskDeclineOrDeleteReason(e.target.value)}
 placeholder="Specify the custom reason for decline/delete..."
 className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-900 font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none font-sans"
 />
 </div>
 </div>

 <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end gap-3 font-sans">
 <button
 type="button"
 onClick={() => {
 setDeletingTodoState(null);
 setTaskDeclineOrDeleteReason("");
 }}
 className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleConfirmDeleteTodo}
 className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] uppercase tracking-wider px-4.5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
 >
 Confirm & Save
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 </div>
 );
}
