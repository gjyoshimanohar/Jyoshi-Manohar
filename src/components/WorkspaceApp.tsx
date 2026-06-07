import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 Check, Trash2, Plus, GripVertical, Calendar as CalendarIcon, Inbox, Hash, 
 MoreHorizontal, ChevronDown, ChevronRight, Menu, LogOut, X, Flag, 
 CalendarDays, Search, Folder, Briefcase, Code, Map, Music, 
 Camera, Book, Heart, Star, Zap, Circle, BarChart2, Clock, Timer,
 Flame, HelpCircle, RefreshCw, Bell, Award, Sparkles, FolderOpen,
 Milestone, BookOpen, Smile, Play, Volume2, ShieldCheck, Target,
 GraduationCap, ArrowUpDown, Hourglass, Lightbulb, Minimize2, Maximize2
} from 'lucide-react';
import { todoService } from '../services/todoService';
import { Todo, Project, Folder as FolderType } from '../types';
import { auth } from '../lib/firebase';
import { format, isToday, isTomorrow, isPast, isSameDay, startOfDay, subDays, addHours, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { DayPicker } from 'react-day-picker';
import { signOut } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import PomodoroFocus from './PomodoroFocus';
import EisenhowerMatrix from './EisenhowerMatrix';
import HabitsTracker from './HabitsTracker';
import GuidePopup from './GuidePopup';
import { determineProjectByTitle } from '../utils/autoCategorize';

const PROJECT_ICONS: Record<string, React.ElementType> = {
 Hash, Folder, Briefcase, Code, Map, Music, Camera, Book, Heart, Star, Zap, Smile, Circle
};

const AVAILABLE_ICONS = Object.keys(PROJECT_ICONS);

const FOLDER_COLORS = [
 '#9ca3af', // gray (default)
 '#ef4444', // red
 '#f97316', // orange
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
 return <Hash className={className} style={{ color: defaultColor }} />;
};

type ViewMode = 'inbox' | 'today' | 'upcoming' | 'project' | 'trends' | 'completed' | 'trash';

export default function WorkspaceApp() {
 const [todos, setTodos] = useState<Todo[]>([]);
 const [projects, setProjects] = useState<Project[]>([]);
 const [folders, setFolders] = useState<FolderType[]>([]);
 const [loading, setLoading] = useState(true);
 const [bootstrapping, setBootstrapping] = useState(false);

 // Far-Left Nav Dock Tab Selection
 // 'tasks' (default checklist), 'matrix' (Kanban quadrants), 'habits' (streaks), 'focus' (sound timers), 'starred' (P1 values), 'search' (extended filters)
 const [activeAppTab, setActiveAppTab] = useState<'tasks' | 'matrix' | 'habits' | 'focus' | 'starred' | 'search'>('tasks');

 // Sidebar controls
 const [viewMode, setViewMode] = useState<ViewMode>('today');
 const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [isAddingProject, setIsAddingProject] = useState(false);
 const [newProjectName, setNewProjectName] = useState('');
 const [newProjectIcon, setNewProjectIcon] = useState('');

 const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
 const [newTaskProject, setNewTaskProject] = useState<string>('inbox');
 const [newTaskPriority, setNewTaskPriority] = useState<number>(4);
 const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
 const [newTaskDeadline, setNewTaskDeadline] = useState<Date | undefined>(undefined);
 const [showDatePicker, setShowDatePicker] = useState(false);
 const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
 const [showProjectPicker, setShowProjectPicker] = useState(false);
 const [showPriorityPicker, setShowPriorityPicker] = useState(false);

 // Detail Modal Picker States
 const [showDetailDatePicker, setShowDetailDatePicker] = useState(false);
 const [showDetailPriorityPicker, setShowDetailPriorityPicker] = useState(false);

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
 userId: auth.currentUser.uid,
 completed: false,
 projectId: targetProjectId,
 priority: newTaskPriority,
 dueDate: dueDateVal,
 tags: detectedTags.length > 0 ? detectedTags : undefined,
 });

 if (matchedProjectName && targetProjectId !== currentBaseProjId) {
 setAutoProjectNotice(`Auto-categorized task to "${cleanedTitle !== titleStr ? cleanedTitle : matchedProjectName}"`);
 setTimeout(() => setAutoProjectNotice(null), 4000);
 }

 // Reset task creator state values
 setNewTaskTitle('');
 setNewTaskDesc('');
 setNewTaskPriority(4);
 setNewTaskDueDate(undefined);
 setShowDatePicker(false);
 setShowPriorityPicker(false);
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
 await todoService.updateTodoStatus(todo.id, isCompleting);
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

 const handleAddTaskToSection = async (sectionName: string, titleStr: string, tagsStr: string = '') => {
 if (!titleStr.trim() || !auth.currentUser || !selectedProjectId) return;
 
 const tagsArray = tagsStr.trim()
 ? tagsStr.split(',').map(t => t.trim()).filter(Boolean)
 : [];
 
 await todoService.createTodo({
 title: titleStr.trim(),
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
 }
 };

 const getPriorityColor = (priority?: number) => {
 switch(priority) {
 case 1: return 'text-red-500 fill-red-500 hover:fill-red-600';
 case 2: return 'text-orange-500 fill-orange-500 hover:fill-orange-600';
 case 3: return 'text-primary fill-primary hover:fill-blue-600';
 default: return 'text-slate-400';
 }
 };

 // Bullet priorities for Custom checkbox circular surrounds matching the TickTick mockup
 const getPriorityCheckboxStyle = (priority?: number) => {
 switch (priority) {
 case 1: return 'border-red-500 hover:bg-red-50 text-red-500';
 case 2: return 'border-orange-500 hover:bg-orange-50 text-orange-500';
 case 3: return 'border-primary hover:bg-blue-50 text-primary';
 default: return 'border-gray-300 hover:bg-gray-100 text-gray-500';
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
 <div key={project.id} className="group relative flex items-center justify-between pl-2">
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
 <div className="absolute right-1 hidden group-hover:flex items-center bg-[#fafafa] pl-1.5">
 <span 
 onClick={(e) => handleStartEditProject(project, e)} 
 className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 mr-0.5 cursor-pointer"
 title="Rename project"
 >
 <MoreHorizontal className="w-3 h-3" />
 </span>
 <span 
 onClick={(e) => handleDeleteProject(project.id, e)} 
 className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 cursor-pointer"
 title="Delete project"
 >
 <Trash2 className="w-3 h-3" />
 </span>
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
 <form onSubmit={(e) => handleSaveEditFolder(folder.id, e)} className="flex items-center space-x-2 p-1 bg-white border border-gray-100 rounded-lg shadow-sm">
 <input
 type="text"
 autoFocus
 value={editFolderName}
 onChange={(e) => setEditFolderName(e.target.value)}
 className="text-xs px-2 py-1 border focus:border-primary focus:ring-1 focus:ring-primary rounded w-full outline-none text-black font-semibold"
 />
 <button type="submit" disabled={!editFolderName.trim()} className="text-white bg-primary p-1 rounded-md">
 <Check className="w-3.5 h-3.5" />
 </button>
 <button type="button" onClick={() => { setEditingFolderId(null); }} className="text-gray-400 hover:bg-gray-100 p-1 rounded-md">
 <X className="w-3.5 h-3.5" />
 </button>
 </form>
 ) : (
 <div className="flex items-center justify-between p-1 rounded group">
 <div className="flex items-center space-x-1 w-full">
 <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
 <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
 <span className="text-xs text-gray-700 font-medium truncate max-w-[120px]">{folder.name}</span>
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
 <div className="pl-3.5 border-l border-gray-200 ml-3.5 mt-1 space-y-0.5">
 {projects.filter(p => p.folderId === folder.id).map(renderProjectItem)}
 {projects.filter(p => p.folderId === folder.id).length === 0 && (
 <div className="text-xs text-gray-400 pl-1 py-1 italic">Empty folders list</div>
 )}
 </div>
 </div>
 ))}
 
 {/* Direct Lists that are not nested inside Folders */}
 {projects.filter(p => !p.folderId).map(renderProjectItem)}
 
 {projects.length === 0 && folders.length === 0 && !isAddingProject && (
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
 <div className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-white border border-gray-100 text-gray-700 text-xs p-3 rounded-xl shadow-2xl z-50 whitespace-nowrap origin-left transition-all text-left">
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
 <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 grid grid-cols-6 gap-0.5 z-[100] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
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
 <motion.aside
 initial={{ width: 0, opacity: 0 }}
 animate={{ width: 240, opacity: 1 }}
 exit={{ width: 0, opacity: 0 }}
 className="bg-[#FAFAFA] border-r border-[#ECECEC] shrink-0 h-full overflow-y-auto z-30 select-none pb-20 md:pb-6"
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
 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
 className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 rounded-full"
 >
 <Smile className="w-3.5 h-3.5" />
 </button>
 <AnimatePresence>
 {showEmojiPicker && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute left-0 top-full mt-2 z-50 shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setNewFolderName(prev => prev + emojiData.emoji);
 setShowEmojiPicker(false);
 }}
 width={280}
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
 <button onClick={handleLogout} className="w-full flex items-center space-x-2 p-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors font-medium select-none justify-center border border-transparent hover:border-red-100 shadow-sm bg-white">
 <LogOut className="w-4 h-4 shrink-0" />
 <span>Log out Account</span>
 </button>
 </div>
 </div>
 </motion.aside>
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

 {/* mini pomo button */}
 <div className="relative shrink-0 select-none">
 <button 
 onClick={() => setIsTimerOpen(!isTimerOpen)}
 className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${timerRunning ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'}`}
 >
 <Clock className="w-3.5 h-3.5" />
 <span className="font-mono">
 {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
 </span>
 </button>
 {isTimerOpen && (
 <div className="absolute top-10 right-0 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 p-4.5 z-50">
 <h4 className="text-xs font-medium text-gray-800 mb-2 border-b pb-1.5 uppercase tracking-wider block">Task Timer</h4>
 <div className="flex justify-center mb-4 mt-2">
 <span className="text-3xl font-light font-mono text-gray-800 tabular-nums">
 {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <button onClick={() => setTimerRunning(!timerRunning)} className="py-1 px-2.5 rounded text-xs font-medium bg-primary text-white">
 {timerRunning ? 'Pause' : 'Start'}
 </button>
 <button onClick={() => { setTimerRunning(false); setTimeRemaining(25 * 60); }} className="py-1 px-2.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
 Reset
 </button>
 </div>
 </div>
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
 <div className="absolute top-8 right-0 w-52 bg-white border border-gray-150 rounded-xl shadow-2xl p-1.5 z-50 text-left scale-95 origin-top-right transition-transform animate-in fade-in duration-100">
 <div className="text-xs uppercase tracking-wider text-gray-400 px-2 py-1 border-b mb-1">List operations</div>
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
 {false ? (
 <div className="w-full">
 {/* ELEGANT TAGS/LABELS FILTER BAR FOR ORGANIZATIONAL FILTERING */}
 {(() => {
 const projectTodos = todos.filter(t => t.projectId === selectedProjectId && !t.deletedAt);
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
 onDrop={async (e) => {
 e.preventDefault();
 const id = e.dataTransfer.getData("text/plain");
 if (id) {
 await handleMoveTodoToSection(id, sectionName);
 }
 setDraggingOverSection(null);
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
 <div className="absolute right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl py-1 w-36 z-40 text-left">
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
 <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1" style={{ scrollbarWidth: 'none' }}>
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
 await handleAddTaskToSection(sectionName, newTaskTitleInline, newTaskTagsInline);
 setNewTaskTitleInline('');
 setNewTaskTagsInline('');
 setActiveAddingSection(null);
 } else if (e.key === 'Escape') {
 setActiveAddingSection(null);
 }
 }}
 className="w-full text-xs font-medium border border-gray-100 focus:outline-none focus:border-blue-400 rounded-lg p-2 bg-gray-50/50 text-black placeholder:text-gray-400"
 autoFocus
 />
 <input
 type="text"
 placeholder="Labels / Sub-categories (comma-sep)"
 value={newTaskTagsInline}
 onChange={(e) => setNewTaskTagsInline(e.target.value)}
 onKeyDown={async (e) => {
 if (e.key === 'Enter' && newTaskTitleInline.trim()) {
 await handleAddTaskToSection(sectionName, newTaskTitleInline, newTaskTagsInline);
 setNewTaskTitleInline('');
 setNewTaskTagsInline('');
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
 }}
 className="text-xs text-gray-500 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg font-medium"
 >
 Cancel
 </button>
 <button
 onClick={async () => {
 if (newTaskTitleInline.trim()) {
 await handleAddTaskToSection(sectionName, newTaskTitleInline, newTaskTagsInline);
 setNewTaskTitleInline('');
 setNewTaskTagsInline('');
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
 {inactiveTasks.map((todo) => {
 // Priority specific border and hover styles to replicate circular checkboxes perfectly
 let borderPrio = "border-gray-300 hover:border-primary";
 let checkColor = "text-primary";
 if (todo.priority === 1) {
 borderPrio = "border-red-500 hover:bg-red-50 text-red-500";
 } else if (todo.priority === 2) {
 borderPrio = "border-orange-500 hover:bg-orange-50 text-[#f97316]";
 } else if (todo.priority === 3) {
 borderPrio = "border-primary hover:bg-blue-50 text-primary";
 }

 const formattedDate = formatCardDate(todo.dueDate);

 return (
 <motion.div
 key={todo.id}
 layoutId={todo.id}
 draggable
 onDragStart={(e) => {
 e.dataTransfer.setData("text/plain", todo.id);
 }}
 className={`bg-white rounded-2xl border border-gray-100 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all cursor-grab active:cursor-grabbing text-left flex flex-col gap-1.5 group select-none relative duration-100 ${
 todo.priority === 1 ? 'border-l-2 border-l-red-400' : ''
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
 <span className="text-xs font-medium text-gray-800 break-words leading-relaxed leading-snug">
 {todo.title}
 </span>
 {todo.description && (
 <p className="text-base text-gray-400 font-medium leading-relaxed mt-0.5 line-clamp-2">
 {todo.description}
 </p>
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
 <div className="flex items-center gap-1.5 text-xs tracking-wide text-primary pl-[23px] mt-0.5">
 <span>{formattedDate}</span>
 </div>
 )}
 </motion.div>
 );
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
 <span className="text-xs font-medium text-gray-400 line-through truncate block">
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
 placeholder={`+ Add task to "${viewMode === 'project' ? (projects.find(p=>p.id===selectedProjectId)?.name || 'Inbox') : 'Inbox'}"... (Press Enter)`}
 value={newTaskTitle}
 onChange={(e) => setNewTaskTitle(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && newTaskTitle.trim()) {
 handleUnifiedQuickAdd(newTaskTitle);
 }
 }}
 className="w-full pr-10 text-xs sm:text-sm bg-transparent outline-none text-black placeholder:text-gray-400 font-medium"
 />
 <button
 type="button"
 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
 className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 rounded-full"
 >
 <Smile className="w-4 h-4" />
 </button>
 <AnimatePresence>
 {showEmojiPicker && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute right-0 top-6 z-50 shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setNewTaskTitle(prev => prev + emojiData.emoji);
 setShowEmojiPicker(false);
 }}
 width={280}
 height={350}
 />
 </motion.div>
 )}
 </AnimatePresence>
 <input
 type="text"
 placeholder="Add note or description (optional)"
 value={newTaskDesc}
 onChange={(e) => setNewTaskDesc(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && newTaskTitle.trim()) {
 handleUnifiedQuickAdd(newTaskTitle);
 }
 }}
 className="w-full text-xs bg-transparent outline-none text-gray-500 placeholder:text-gray-400 font-medium"
 />
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
 onClick={() => { setShowDatePicker(!showDatePicker); setShowPriorityPicker(false); }}
 className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all border ${newTaskDueDate ? 'bg-primary/5 text-primary border-primary/20' : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100'}`}
 >
 <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
 <span>{newTaskDueDate ? format(newTaskDueDate, 'MMM d, yyyy') : 'No Date'}</span>
 <ChevronDown className="w-2.5 h-2.5 opacity-60" />
 </button>
 <AnimatePresence>
 {showDatePicker && (
 <motion.div
 initial={{ opacity: 0, y: 8, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.95 }}
 transition={{ duration: 0.12 }}
 className="absolute left-0 mt-2 z-50 bg-white border border-gray-150 shadow-2xl rounded-2xl p-3 w-[265px]"
 >
 {/* Quick Presets */}
 <div className="grid grid-cols-2 gap-1.5 mb-2.5">
 <button
 type="button"
 onClick={() => {
 setNewTaskDueDate(startOfDay(new Date()));
 setShowDatePicker(false);
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
 >
 <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
 Today
 </button>
 <button
 type="button"
 onClick={() => {
 const tomorrow = new Date();
 tomorrow.setDate(tomorrow.getDate() + 1);
 setNewTaskDueDate(startOfDay(tomorrow));
 setShowDatePicker(false);
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
 >
 <span className="w-1.5 h-1.5 bg-primary rounded-full" />
 Tomorrow
 </button>
 <button
 type="button"
 onClick={() => {
 const nextWeek = new Date();
 nextWeek.setDate(nextWeek.getDate() + 7);
 setNewTaskDueDate(startOfDay(nextWeek));
 setShowDatePicker(false);
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
 >
 <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
 Next Week
 </button>
 <button
 type="button"
 onClick={() => {
 setNewTaskDueDate(undefined);
 setShowDatePicker(false);
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100/60 rounded-lg transition-colors text-left"
 >
 <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
 Clear Date
 </button>
 </div>
 <div className="h-px bg-gray-100 my-2.5" />
 <DayPicker
 mode="single"
 selected={newTaskDueDate}
 onSelect={(d) => {
 setNewTaskDueDate(d ? startOfDay(d) : undefined);
 setShowDatePicker(false);
 }}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* 2. Priority Selector */}
 <div className="relative">
 <button
 type="button"
 onClick={() => { setShowPriorityPicker(!showPriorityPicker); setShowDatePicker(false); }}
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
 className="absolute left-0 mt-2 z-50 bg-white border border-gray-150 shadow-2xl rounded-2xl p-1.5 w-40"
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
 className="text-xs sm:text-sm text-[#202020] font-medium truncate cursor-pointer hover:text-primary"
 onClick={() => setSelectedTodoId(todo.id)}
 >
 {todo.title}
 </span>
 </div>

 <div className="flex items-center space-x-2 shrink-0">
 {renderItemProjectBadge(todo)}
 <span className="text-xs sm:text-xs text-[#1a2b58] font-medium bg-[#ebf3ff]/70 px-2 py-0.5 rounded-full select-none">
 Today
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
 {allActiveViewTodos.filter(t => !t.completed).map(todo => {
 const hasPriority = todo.priority && todo.priority < 4;
 return (
 <motion.div
 key={todo.id}
 initial={{ opacity: 0, scale: 0.99 }}
 animate={{ opacity: 1, scale: 1 }}
 className={`group flex items-center justify-between py-2.5 border-b border-[#f4f4f4]/60 hover:bg-[#fafafa]/80 transition-colors px-1 ${
 hasPriority 
 ? todo.priority === 1 
 ? 'border-l-[3px] border-red-500 pl-3' 
 : todo.priority === 2 
 ? 'border-l-[3px] border-orange-400 pl-3' 
 : 'border-l-[3px] border-blue-400 pl-3'
 : ''
 }`}
 >
 <div className="flex items-center min-w-0 flex-1">
 {/* Custom circle checklists circular surrounds matching priorities */}
 <button
 onClick={() => handleToggleTodo(todo)}
 className={`mr-3.5 w-[17px] h-[17px] flex shrink-0 items-center justify-center rounded-full border-2 transition-all ${getPriorityCheckboxStyle(todo.priority)}`}
 title="Mark complete"
 >
 <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-100 text-current transition-opacity" />
 </button>

 <div className="min-w-0 flex-1 cursor-pointer pr-4" onClick={() => setSelectedTodoId(todo.id)}>
 <span className="text-xs sm:text-sm text-[#202020] font-semibold leading-relaxed">
 {todo.title}
 </span>
 {todo.description && (
 <p className="text-base text-gray-400 line-clamp-1 leading-normal font-medium mt-0.5">{todo.description}</p>
 )}
 </div>
 </div>

 <div className="flex items-center space-x-2.5 shrink-0 pl-2">
 {renderItemProjectBadge(todo)}

 {/* Repeat loop icon / or single calendar icon badges */}
 {viewMode !== 'trash' && (
 <span className="text-xs sm:text-xs text-[#1a2b58] font-medium bg-[#ebf3ff]/70 px-2 py-0.5 rounded-full flex items-center select-none shrink-0 border border-blue-100/10 leading-none">
 <CalendarIcon className="w-3 h-3 mr-1 text-primary/70" />
 Today
 </span>
 )}

 {/* Fast actions deletion / restore */}
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
 })}
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
 {allActiveViewTodos.filter(t => t.completed).map(todo => (
 <motion.div
 key={todo.id}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="group flex items-center justify-between py-2.5 border-b border-[#f4f4f4]/40 hover:bg-[#fafafa]/80 transition-colors px-1"
 >
 <div className="flex items-center min-w-0 flex-1">
 {/* Completed checked circle */}
 <button
 onClick={() => handleToggleTodo(todo)}
 className="mr-3.5 w-[17px] h-[17px] flex shrink-0 items-center justify-center rounded-full bg-gray-200 border-2 border-gray-300 text-gray-500 hover:bg-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
 title="Mark active"
 >
 <Check className="w-2.5 h-2.5 text-white" />
 </button>

 <div className="min-w-0 flex-1 cursor-pointer pr-4" onClick={() => setSelectedTodoId(todo.id)}>
 <span className="text-xs sm:text-sm text-gray-400 line-through font-semibold leading-relaxed truncate block">
 {todo.title}
 </span>
 </div>
 </div>

 <div className="flex items-center space-x-2.5 shrink-0 pl-2">
 {renderItemProjectBadge(todo)}
 <span className="text-xs sm:text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full select-none">
 Today
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
 <input
 autoFocus
 type="text"
 placeholder="Task title"
 value={newTaskTitle}
 onChange={(e) => setNewTaskTitle(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
 className="w-full font-medium text-[#202020] text-sm outline-none placeholder:text-gray-400 mb-2"
 />
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
 <span className="text-xs font-medium text-gray-800">{todo.title}</span>
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
 <span className="text-xs font-medium">{todo.title}</span>
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
 <div className="fixed inset-0 z-[80] flex justify-end bg-black/15 p-0 sm:p-4 backdrop-blur-sm" onClick={() => setSelectedTodoId(null)}>
 <motion.div 
 initial={{ x: '100%', opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 exit={{ x: '100%', opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
 className="bg-white w-full sm:w-[450px] shadow-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl flex flex-col overflow-hidden"
 >
 {(() => {
 const todo = todos.find(t => t.id === selectedTodoId);
 if (!todo) return null;
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
 />
 <button
 type="button"
 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
 className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
 >
 <Smile className="w-4 h-4" />
 </button>
 <AnimatePresence>
 {showEmojiPicker && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute right-0 top-full mt-2 z-50 shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 todoService.updateTodo(todo.id, { title: todo.title + emojiData.emoji });
 setShowEmojiPicker(false);
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
 onClick={() => { setShowDetailDatePicker(!showDetailDatePicker); setShowDetailPriorityPicker(false); }}
 className={`w-full flex items-center justify-between px-3 py-2 border rounded-xl text-xs font-medium transition ${showDetailDatePicker ? 'border-primary ring-1 ring-primary/25 bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 text-gray-700'}`}
 >
 <span className="truncate flex items-center gap-1.5">
 <CalendarIcon className={`w-3.5 h-3.5 ${todo.dueDate ? 'text-primary' : 'text-gray-400'}`} />
 {todo.dueDate ? format(new Date(todo.dueDate), 'MMM d, yyyy') : 'No Date'}
 </span>
 <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${showDetailDatePicker ? 'rotate-180' : ''}`} />
 </button>
 <AnimatePresence>
 {showDetailDatePicker && (
 <motion.div 
 initial={{ opacity: 0, y: 8, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 8, scale: 0.95 }}
 transition={{ duration: 0.15 }}
 className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-150 shadow-2xl rounded-2xl p-3 w-[265px]"
 >
 {/* Quick Presets */}
 <div className="grid grid-cols-2 gap-1.5 mb-2.5">
 <button
 onClick={() => {
 todoService.updateTodo(todo.id, { dueDate: startOfDay(new Date()).getTime() });
 setShowDetailDatePicker(false);
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
 >
 <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
 Today
 </button>
 <button
 onClick={() => {
 const tomorrow = new Date();
 tomorrow.setDate(tomorrow.getDate() + 1);
 todoService.updateTodo(todo.id, { dueDate: startOfDay(tomorrow).getTime() });
 setShowDetailDatePicker(false);
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
 >
 <span className="w-1.5 h-1.5 bg-primary rounded-full" />
 Tomorrow
 </button>
 <button
 onClick={() => {
 const nextWeek = new Date();
 nextWeek.setDate(nextWeek.getDate() + 7);
 todoService.updateTodo(todo.id, { dueDate: startOfDay(nextWeek).getTime() });
 setShowDetailDatePicker(false);
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
 >
 <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
 Next Week
 </button>
 <button
 onClick={() => {
 todoService.updateTodo(todo.id, { dueDate: null });
 setShowDetailDatePicker(false);
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100/60 rounded-lg transition-colors text-left"
 >
 <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
 Clear Date
 </button>
 </div>
 <div className="h-px bg-gray-100 my-2.5" />
 <DayPicker 
 mode="single" 
 selected={todo.dueDate ? new Date(todo.dueDate) : undefined} 
 onSelect={(d) => { 
 todoService.updateTodo(todo.id, { dueDate: d ? startOfDay(d).getTime() : null }); 
 setShowDetailDatePicker(false); 
 }} 
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 {/* Priority Picker */}
 <div className="relative">
 <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1.5">Priority</label>
 <button 
 onClick={() => { setShowDetailPriorityPicker(!showDetailPriorityPicker); setShowDetailDatePicker(false); }}
 className={`w-full flex items-center justify-between px-3 py-2 border rounded-xl text-xs font-medium transition ${showDetailPriorityPicker ? 'border-primary ring-1 ring-primary/25 bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 text-gray-700'}`}
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
 className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-150 shadow-2xl rounded-2xl p-1.5 w-40"
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
 onClick={() => {
 todoService.updateTodo(todo.id, { priority: level });
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
 </div>

 {/* Notes / Descriptions and subtasks checklist inside Drawer */}
 <div className="mt-5 space-y-5">
 <div className="flex flex-col text-left">
 <label className="text-xs text-gray-400 uppercase tracking-widest mb-2">Notes</label>
 <textarea
 placeholder="Add detailed parameters or Markdown logs..."
 className="text-xs w-full bg-gray-50/50 hover:bg-gray-50 border focus:bg-white focus:border-primary p-3 rounded-xl min-h-[90px] outline-none transition"
 value={todo.description || ''}
 onChange={(e) => todoService.updateTodo(todo.id, { description: e.target.value })}
 />
 </div>


 <div className="flex flex-col text-left">
 <label className="text-xs text-gray-400 uppercase tracking-widest mb-2">Subtasks</label>
 <div className="space-y-1.5">
 {todo.subtasks?.map(subtask => (
 <div key={subtask.id} className="flex items-center group">
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
 className="text-xs flex-1 outline-none text-gray-700 bg-transparent"
 value={subtask.title}
 onChange={(e) => {
 const next = todo.subtasks?.map(s => s.id === subtask.id ? { ...s, title: e.target.value } : s);
 todoService.updateTodo(todo.id, { subtasks: next });
 }}
 />
 </div>
 ))}
 <div className="flex items-center mt-2 pl-1 select-none text-[#1a2b58]">
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

 </div>
 </div>
 </>
 );
 })()}
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Dynamic Guideline Popup */}
 {showHelpGuide && (
 <GuidePopup onClose={() => setShowHelpGuide(false)} />
 )}

 {/* Add List Modal (Visual replica of TickTick) */}
 <AnimatePresence>
 {isAddingProject && (
 <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-white rounded-3xl shadow-2xl border border-gray-150 max-w-[850px] w-full flex flex-col md:flex-row overflow-hidden text-left"
 >
 {/* Left Panel: Inputs Form */}
 <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
 <div>
 {/* Header Title */}
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg text-gray-800">Add List</h3>
 {/* Mobile-only close button */}
 <button
 type="button"
 onClick={() => {
 setIsAddingProject(false);

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
 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
 >
 <Smile className="w-4 h-4" />
 </button>
 <AnimatePresence>
 {showEmojiPicker && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute right-0 top-full mt-2 z-50 shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setNewProjectName(prev => prev + emojiData.emoji);
 setShowEmojiPicker(false);
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
 '#fb923c', // Orange
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
 <div className="relative flex-1 max-w-[280px] group">
 <select
 value={listFolderId}
 onChange={(e) => {
 if (e.target.value === 'create_new') {
 setIsCreatingFolderInModal(true);
 setNewFolderNameInModal('');
 } else {
 setListFolderId(e.target.value);
 }
 }}
 className="flex-1 w-full text-xs bg-white border border-gray-200 hover:border-blue-400 focus:border-primary focus:ring-4 focus:ring-primary/10 hover:shadow-md rounded-xl px-3 py-2 outline-none font-medium text-gray-700 shadow-sm transition-colors cursor-pointer appearance-none pr-8 relative z-0"
 >
 <option value="none">None</option>
 {folders.map((f) => (
 <option key={f.id} value={f.id}>
 📁 {f.name}
 </option>
 ))}
 <option value="create_new" className="text-blue-600 font-medium">+ Create New Folder...</option>
 </select>
 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors z-10 pointer-events-none">
  <ChevronDown className="w-4 h-4" />
 </div>
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
 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
 className="absolute right-[90px] xl:right-24 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
 >
 <Smile className="w-3.5 h-3.5" />
 </button>
 <AnimatePresence>
 {showEmojiPicker && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute left-0 top-full mt-2 z-50 shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setNewFolderNameInModal(prev => prev + emojiData.emoji);
 setShowEmojiPicker(false);
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
 <div className="relative flex-1 max-w-[280px] group">
 <select
 value={listType}
 onChange={(e) => setListType(e.target.value as 'task' | 'note')}
 className="flex-1 w-full text-xs bg-white border border-gray-200 hover:border-blue-400 focus:border-primary focus:ring-4 focus:ring-primary/10 hover:shadow-md rounded-xl px-3 py-2 outline-none font-medium text-gray-700 shadow-sm transition-colors cursor-pointer appearance-none pr-8 relative z-0"
 >
 <option value="task">Task List</option>
 <option value="note">Note List</option>
 </select>
 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors z-10 pointer-events-none">
  <ChevronDown className="w-4 h-4" />
 </div>
</div>
 </div>

 {/* Show in Smart List row */}
 <div className="flex items-center space-x-4">
 <span className="text-xs font-medium text-gray-500 w-24 shrink-0">Show in Smart List</span>
 <div className="relative flex-1 max-w-[280px] group">
 <select
 value={listSmartOption}
 onChange={(e) => setListSmartOption(e.target.value as 'all' | 'none')}
 className="flex-1 w-full text-xs bg-white border border-gray-200 hover:border-blue-400 focus:border-primary focus:ring-4 focus:ring-primary/10 hover:shadow-md rounded-xl px-3 py-2 outline-none font-medium text-gray-700 shadow-sm transition-colors cursor-pointer appearance-none pr-8 relative z-0"
 >
 <option value="all">All tasks</option>
 <option value="none">None</option>
 </select>
 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors z-10 pointer-events-none">
  <ChevronDown className="w-4 h-4" />
 </div>
</div>
 </div>
 </div>
 </div>
 {/* Cancel & Add operations buttons stacked aligned left */}
 <div className="flex items-center space-x-2.5 mt-8 border-t border-gray-100 pt-5">
 <button
 type="button"
 onClick={() => {
 setIsAddingProject(false);

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
 await todoService.createProject(
 newProjectName.trim(), 
 listColor, 
 auth.currentUser.uid, 
 'Hash', // Use standard bullet or Hash or List icon as key
 targetFolder,
 listViewType,
 sections
 );
 setNewProjectName('');

 setIsAddingProject(false);
 }
 }}
 className="px-6 py-2 text-white bg-primary hover:bg-primary hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-xs shadow-md shadow-primary/10 transition-all cursor-pointer"
 >
 Add
 </button>
 </div>
 </div>

 {/* Right Panel: Stunning Interactive Mock Preview */}
 <div className="w-[350px] bg-[#f4f6fc] p-6 hidden md:flex flex-col relative justify-center border-l border-gray-100 select-none">
 {/* Desktop close X icon top-right */}
 <button
 type="button"
 onClick={() => {
 setIsAddingProject(false);

 setNewProjectName('');
 }}
 className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-white transition-colors"
 >
 <X className="w-5 h-5" />
 </button>

 {/* Simulated App Screen Preview Container */}
 <div className="bg-white rounded-2xl w-full p-5 shadow-xl border border-blue-50/20 text-left min-h-[360px] flex flex-col justify-between">
 <div>
 {/* Simulated Header Line */}
 <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 animate-pulse">
 <div className="flex items-center space-x-2">
 {/* Dynamic Bullet with selected project color */}
 <div 
 className="w-3.5 h-3.5 rounded-full shrink-0 transition-all duration-300"
 style={{ background: listColor }}
 />
 <span className="text-sm text-gray-800 tracking-tight block max-w-[150px] truncate animate-fade-in">
 {newProjectName.trim() || 'Name'}
 </span>
 </div>
 {/* Dummy options list indicators */}
 <div className="flex items-center space-x-1">
 <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
 <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
 <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
 </div>
 </div>

 {/* Subtitle group 1 mockup */}
 <div className="mb-4">
 <div className="flex items-center space-x-1.5 text-xs font-medium text-gray-300 uppercase tracking-widest mb-2.5">
 <span>Countdown</span>
 <span className="text-xs bg-gray-100 font-medium px-1 rounded">1</span>
 </div>
 <div className="flex items-center justify-between py-2 border-b border-gray-50/60 pl-1">
 <div className="flex items-center space-x-2">
 <div className="w-4 h-4 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center">
 <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: listColor }} />
 </div>
 <div className="h-2 bg-gray-250 rounded w-28" />
 </div>
 {/* Live indicator today */}
 <span 
 className="text-xs font-medium px-1.5 py-0.2 rounded-full"
 style={{ background: `${listColor}1a`, color: listColor }}
 >
 Today
 </span>
 </div>
 </div>

 {/* Subtitle group 2 mockup */}
 <div>
 <div className="flex items-center space-x-1.5 text-xs font-medium text-gray-300 uppercase tracking-widest mb-2.5">
 <span>Active tasks</span>
 <span className="text-xs bg-gray-100 font-medium px-1 rounded">2</span>
 </div>
 
 {/* Dummy item row 1 */}
 <div className="flex items-center space-x-2 py-2 border-b border-gray-50/60 pl-1">
 <div 
 className="w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0" 
 style={{ borderColor: listColor }}
 >
 <div className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: listColor }} />
 </div>
 <div className="h-2 bg-gray-200 rounded w-24" />
 </div>

 {/* Dummy item row 2 */}
 <div className="flex items-center space-x-2 py-2 border-b border-gray-50/60 pl-1">
 <div 
 className="w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0" 
 style={{ borderColor: listColor }}
 />
 <div className="h-2 bg-gray-100 rounded w-40" />
 </div>
 </div>
 </div>

 {/* Bottom mockup info text */}
 <div className="text-xs text-gray-400 font-medium text-center border-t border-gray-50 pt-2.5 italic">
 {listType === 'task' ? '☑ Task list type layout' : '❏ Note list type layout'} showing in {listViewType === 'list' ? 'sequential list' : listViewType === 'kanban' ? 'columns board' : 'gantt charts'} format.
 </div>
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
