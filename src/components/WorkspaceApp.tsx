import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, Trash2, Plus, GripVertical, Calendar as CalendarIcon, Inbox, Hash, 
  MoreHorizontal, ChevronDown, ChevronRight, Menu, LogOut, X, Flag, 
  CalendarDays, Search, Repeat, Folder, Briefcase, Code, Map, Music, 
  Camera, Book, Heart, Star, Zap, Circle, BarChart2, Clock, Timer,
  Flame, HelpCircle, RefreshCw, Bell, Award, Sparkles, FolderOpen,
  Milestone, BookOpen, Smile, Play, Volume2, ShieldCheck, Target,
  GraduationCap, ArrowUpDown, Hourglass, Lightbulb
} from 'lucide-react';
import { todoService } from '../services/todoService';
import { Todo, Project, Folder as FolderType } from '../types';
import { auth } from '../lib/firebase';
import { format, isToday, isTomorrow, isPast, isSameDay, startOfDay, subDays } from 'date-fns';
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
  const [listColor, setListColor] = useState('#2F6BE6');
  const [listViewType, setListViewType] = useState<'list' | 'kanban' | 'timeline'>('list');
  const [listFolderId, setListFolderId] = useState<string>('none');
  const [listType, setListType] = useState<'task' | 'note'>('task');
  const [listSmartOption, setListSmartOption] = useState<'all' | 'none'>('all');
  const [isCreatingFolderInModal, setIsCreatingFolderInModal] = useState(false);
  const [newFolderNameInModal, setNewFolderNameInModal] = useState('');

  // Guide Popup Toggle
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);

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
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(new Date());
  const [newTaskDeadline, setNewTaskDeadline] = useState<Date | undefined>(undefined);
  const [newTaskRepeat, setNewTaskRepeat] = useState<'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'>('none');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);

  // Detail Modal Picker States
  const [showDetailDatePicker, setShowDetailDatePicker] = useState(false);
  const [showDetailRepeatPicker, setShowDetailRepeatPicker] = useState(false);
  const [showDetailPriorityPicker, setShowDetailPriorityPicker] = useState(false);

  // Collapsible Checked Category State (Replicates visual checked list expander)
  const [isCompletedSectionExpanded, setIsCompletedSectionExpanded] = useState(true);
  const [isCountdownExpanded, setIsCountdownExpanded] = useState(true);
  const [isPendingExpanded, setIsPendingExpanded] = useState(true);
  const [sortOrder, setSortOrder] = useState<'priority' | 'date'>('priority');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [showSmartTips, setShowSmartTips] = useState(false);

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
            repeat: 'daily',
            tags: ["CAFinal"],
          });

          await todoService.createTodo({
            title: "AFM Class/Study",
            userId: uid,
            completed: false,
            projectId: caFinal.id,
            priority: 1, // Red
            dueDate: Date.now(),
            repeat: 'daily',
            tags: ["CAFinal"],
          });

          await todoService.createTodo({
            title: "FR Class/Study",
            userId: uid,
            completed: false,
            projectId: caFinal.id,
            priority: 1, // Red
            dueDate: Date.now(),
            repeat: 'daily',
            tags: ["CAFinal"],
          });
        }

        // Spiritual project (P3 bullet)
        const spiritual = await todoService.createProject("Spiritual", "#d946ef", uid, "Heart");
        if (spiritual) {
          await todoService.updateProject(spiritual.id, { folderId: studyFolder.id });
          await todoService.createTodo({
            title: "Bible Study",
            userId: uid,
            completed: true, // Completed
            projectId: spiritual.id,
            priority: 4, 
            dueDate: Date.now(),
            tags: ["Spiritual", "Mediation"],
          });
        }
      }

      // Standalone direct lists
      await todoService.createProject("Work", "#ef4444", uid, "Briefcase");
      await todoService.createProject("Exercise", "#eab308", uid, "Zap");

      // Weekend countdown task
      await todoService.createTodo({
        title: "Weekend",
        userId: uid,
        completed: false,
        priority: 3,
        dueDate: Date.now(),
        tags: ["Countdown"],
      });

      localStorage.setItem(bootstrappedKey, 'true');
    } catch (e) {
      console.error("Failed bootstrapping TickTick demo state: ", e);
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
      repeat: newTaskRepeat,
    });

    if (matchedProjectName && targetProjectId !== currentBaseProjId) {
      setAutoProjectNotice(`Auto-categorized task to "${matchedProjectName}"`);
      setTimeout(() => setAutoProjectNotice(null), 4000);
    }
    
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDeadline(undefined);
    setNewTaskRepeat('none');
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
      repeat: 'none',
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
    
    const { projectId: targetProjectId, matchedProjectName } = determineProjectByTitle(
      titleStr.trim(),
      projects,
      currentBaseProjId
    );

    let dueDateVal: number | null = null;
    if (isTodayView) {
      dueDateVal = Date.now();
    } else if (isUpcomingView) {
      dueDateVal = Date.now() + 24 * 60 * 60 * 1000;
    }

    await todoService.createTodo({
      title: titleStr.trim(),
      userId: auth.currentUser.uid,
      completed: false,
      projectId: targetProjectId,
      priority: 4,
      dueDate: dueDateVal,
      repeat: 'none',
    });

    if (matchedProjectName && targetProjectId !== currentBaseProjId) {
      setAutoProjectNotice(`Auto-categorized task to "${matchedProjectName}"`);
      setTimeout(() => setAutoProjectNotice(null), 4000);
    }
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
    await todoService.updateTodoStatus(todo.id, !todo.completed);
  };

  const handleDeleteTodo = async (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMode === 'trash') {
      await todoService.deleteTodo(todoId);
    } else {
      await todoService.softDeleteTodo(todoId);
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
      case 3: return 'text-blue-500 fill-blue-500 hover:fill-blue-600';
      default: return 'text-slate-400';
    }
  };

  // Bullet priorities for Custom checkbox circular surrounds matching the TickTick mockup
  const getPriorityCheckboxStyle = (priority?: number) => {
    switch (priority) {
      case 1: return 'border-red-500 hover:bg-red-50 text-red-500';
      case 2: return 'border-orange-500 hover:bg-orange-50 text-orange-500';
      case 3: return 'border-blue-500 hover:bg-blue-50 text-blue-500';
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
      <span className="flex items-center text-[10px] sm:text-[11px] font-semibold text-gray-500 bg-transparent transition-colors leading-none shrink-0 border border-gray-100 px-1.5 py-0.5 rounded-full select-none">
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
            className={`flex-grow flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors ${viewMode === 'project' && selectedProjectId === project.id && activeAppTab === 'tasks' ? 'bg-[#FFEFEE] text-primary font-bold' : 'hover:bg-gray-100 text-[#202020]'}`}
          >
            <div className="flex items-center space-x-2.5 truncate text-[#333333]">
              {/* Colored bullet circle dot mimicking TickTick */}
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color || '#9ca3af' }} />
              <span className="truncate">{project.name}</span>
            </div>
            
            {/* Project tasks count badge */}
            <div className="flex items-center">
              {getProjectPendingCount(project.id) > 0 && (
                <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.2 rounded-full mr-1.5">
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
                <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-xs text-gray-700 font-bold truncate max-w-[120px]">{folder.name}</span>
                {getFolderPendingCount(folder.id) > 0 && (
                  <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1 py-0.2 rounded-full">
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
              <div className="text-[10px] text-gray-400 pl-1 py-1 italic">Empty folders list</div>
            )}
          </div>
        </div>
      ))}
      
      {/* Direct Lists that are not nested inside Folders */}
      {projects.filter(p => !p.folderId).map(renderProjectItem)}
      
      {projects.length === 0 && folders.length === 0 && !isAddingProject && (
        <div className="text-[11px] text-center text-gray-400 italic py-2">No lists created</div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white min-h-[300px]">
        <div className="w-8 h-8 border-3 border-[#2F6BE6] border-t-transparent rounded-full animate-spin"></div>
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
            <div className="w-9 h-9 rounded-full bg-[#2F6BE6] text-white flex items-center justify-center font-black text-sm shadow border border-white">
              {auth.currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-yellow-400 text-[8px] flex items-center justify-center font-black rounded-full text-black ring-1 ring-white" title="VIP Account">
              ★
            </div>
            <div className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-[100] transition-all origin-left">
              {auth.currentUser?.email} (Pro Account)
            </div>
          </div>

          <div className="h-px bg-gray-300/60 w-8 my-1" />

          {/* Active app subtabs lists */}
          <button 
            onClick={() => { setActiveAppTab('tasks'); setViewMode('today'); }}
            className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'tasks' ? 'bg-[#2F6BE6]/10 text-[#2F6BE6]' : 'text-gray-500 hover:bg-gray-200'}`}
            title="Tasks Checklist"
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
              Tasks Checklist
            </span>
          </button>

          <button 
            onClick={() => setActiveAppTab('matrix')}
            className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'matrix' ? 'bg-[#2F6BE6]/10 text-[#2F6BE6]' : 'text-gray-500 hover:bg-gray-200'}`}
            title="Eisenhower Matrix"
          >
            <GripVertical className="w-5 h-5" />
            <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
              Eisenhower Matrix
            </span>
          </button>

          <button 
            onClick={() => setActiveAppTab('habits')}
            className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'habits' ? 'bg-[#2F6BE6]/10 text-[#2F6BE6]' : 'text-gray-500 hover:bg-gray-200'}`}
            title="Habit Streaks"
          >
            <Target className="w-5 h-5" />
            <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
              Habits tracker
            </span>
          </button>

          <button 
            onClick={() => setActiveAppTab('focus')}
            className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'focus' ? 'bg-[#2F6BE6]/10 text-[#2F6BE6]' : 'text-gray-500 hover:bg-gray-200'}`}
            title="Focus Timer Space"
          >
            <Clock className="w-5 h-5" />
            <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
              Timer Space
            </span>
          </button>

          <button 
            onClick={() => setActiveAppTab('starred')}
            className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'starred' ? 'bg-[#2F6BE6]/10 text-[#2F6BE6]' : 'text-gray-500 hover:bg-gray-200'}`}
            title="Starred Goals"
          >
            <Star className="w-5 h-5" />
            <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
              Starred Goals
            </span>
          </button>

          <button 
            onClick={() => setActiveAppTab('search')}
            className={`p-2.5 rounded-xl transition-all relative group ${activeAppTab === 'search' ? 'bg-[#2F6BE6]/10 text-[#2F6BE6]' : 'text-gray-500 hover:bg-gray-200'}`}
            title="Search Index"
          >
            <Search className="w-5 h-5" />
            <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
              Search Filters
            </span>
          </button>
        </div>

        {/* Sync, alerts & Guidance at the bottom of left docker */}
        <div className="flex flex-col items-center space-y-4 w-full">
          <button 
            onClick={handleTriggerSync}
            className={`p-2.5 text-gray-500 hover:bg-gray-200 rounded-xl relative group ${isSyncing ? 'animate-spin text-[#2F6BE6]' : ''}`}
            title="Cloud Synchronize"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
              Sync Network
            </span>
          </button>

          <div className="relative group cursor-pointer hover:bg-gray-200 p-2 text-gray-500 rounded-xl">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            <div className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-white border border-gray-100 text-gray-700 text-[10px] p-3 rounded-xl shadow-2xl z-50 whitespace-nowrap origin-left transition-all text-left">
              <span className="font-bold text-[#2F6BE6] block mb-1">Alert Inbox</span>
              <span>All systems fully connected online ✓</span>
            </div>
          </div>

          <button 
            onClick={() => setShowHelpGuide(true)} 
            className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-xl group relative"
            title="TickTick Guideline Help"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="absolute left-[54px] top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap origin-left transition-all">
              Help Manual
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE APP TABS BOTTOM NAVIGATION (Aesthetic excellence) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2 grid grid-cols-6 gap-0.5 z-[100] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => { setActiveAppTab('tasks'); setViewMode('today'); }}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'tasks' ? 'text-[#2F6BE6] bg-[#2F6BE6]/5' : 'text-gray-400'}`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[8px] font-bold mt-1">Checklist</span>
        </button>
        <button 
          onClick={() => setActiveAppTab('matrix')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'matrix' ? 'text-[#2F6BE6] bg-[#2F6BE6]/5' : 'text-gray-400'}`}
        >
          <GripVertical className="w-5 h-5" />
          <span className="text-[8px] font-bold mt-1">Matrix</span>
        </button>
        <button 
          onClick={() => setActiveAppTab('habits')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'habits' ? 'text-[#2F6BE6] bg-[#2F6BE6]/5' : 'text-gray-400'}`}
        >
          <Target className="w-5 h-5" />
          <span className="text-[8px] font-bold mt-1">Habits</span>
        </button>
        <button 
          onClick={() => setActiveAppTab('focus')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'focus' ? 'text-[#2F6BE6] bg-[#2F6BE6]/5' : 'text-gray-400'}`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[8px] font-bold mt-1">Focus</span>
        </button>
        <button 
          onClick={() => setActiveAppTab('starred')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'starred' ? 'text-[#2F6BE6] bg-[#2F6BE6]/5' : 'text-gray-400'}`}
        >
          <Star className="w-5 h-5" />
          <span className="text-[8px] font-bold mt-1">Starred</span>
        </button>
        <button 
          onClick={() => setActiveAppTab('search')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition ${activeAppTab === 'search' ? 'text-[#2F6BE6] bg-[#2F6BE6]/5' : 'text-gray-400'}`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[8px] font-bold mt-1">Search</span>
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
                  onClick={() => { setViewMode('today'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'today' ? 'bg-[#FFEFEE] text-[#e53935] font-black' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CalendarIcon className="w-4 h-4 text-green-600" />
                    <span>Today</span>
                  </div>
                  {todayCount > 0 && <span className="text-[10px] text-gray-500 font-bold bg-white/65 px-1.5 py-0.2 rounded">{todayCount}</span>}
                </button>

                <button
                  onClick={() => { setViewMode('upcoming'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'upcoming' ? 'bg-primary/5 text-[#2F6BE6] font-black' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CalendarDays className="w-4 h-4 text-purple-600" />
                    <span>Next 7 Days</span>
                  </div>
                </button>

                <button
                  onClick={() => { setViewMode('inbox'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'inbox' ? 'bg-blue-50 text-blue-800 font-black' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Inbox className="w-4 h-4 text-[#2F6BE6]" />
                    <span>Inbox</span>
                  </div>
                  {inboxCount > 0 && <span className="text-[10px] text-gray-500 font-bold bg-white/65 px-1.5 py-0.2 rounded">{inboxCount}</span>}
                </button>
              </nav>

              <div className="h-px bg-gray-200/60 my-4" />

              {/* Lists section heading */}
              <div className="mb-2">
                <div className="flex items-center justify-between px-2 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 group">
                  <span>Lists</span>
                  <div className="flex items-center space-x-2">
                    <button 
                      title="New Collapsible Folder"
                      className="hover:bg-gray-200 p-1 rounded-md text-gray-400 hover:text-gray-700"
                      onClick={() => setIsAddingFolder(true)}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      title="New List"
                      className="hover:bg-gray-200 p-1 rounded-md text-gray-400 hover:text-gray-700"
                      onClick={() => {
                        setNewProjectName('');
                        setListColor('#2F6BE6');
                        setListViewType('list');
                        setListFolderId('none');
                        setListType('task');
                        setListSmartOption('all');
                        setIsCreatingFolderInModal(false);
                        setNewFolderNameInModal('');
                        setIsAddingProject(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                    <input
                      type="text"
                      autoFocus
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="text-xs focus:ring-1 focus:ring-primary rounded border px-2 py-1 outline-none w-full text-black"
                    />
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

              {/* Tag filters section */}
              <div className="h-px bg-gray-200/60 my-4" />
              <div className="mb-4 text-left px-2">
                <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2.5">Filters / Tags</span>
                <p className="text-[10.5px] text-gray-400 leading-relaxed mb-3 italic">Tasks filtered by list, prioritising, streaked tag criteria.</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9.5px] font-semibold text-gray-500 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F6BE6] mr-1" />
                    Raghuveer
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9.5px] font-semibold text-gray-500 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                    CAFinal
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9.5px] font-semibold text-gray-500 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 mr-1" />
                    Spiritual
                  </span>
                </div>
              </div>

              {/* Completed trash anchors */}
              <div className="h-px bg-gray-200/60 my-4" />
              <div className="space-y-0.5">
                <button
                  onClick={() => { setViewMode('completed'); selectedProjectId && setSelectedProjectId(null); }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'completed' ? 'bg-gray-200/50 text-gray-900 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Completed Logs</span>
                  </div>
                </button>
                <button
                  onClick={() => { setViewMode('trash'); selectedProjectId && setSelectedProjectId(null); }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'trash' ? 'bg-red-50 text-red-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Trash bin</span>
                  </div>
                </button>
              </div>

              <div className="mt-12 border-t border-gray-200 pt-4">
                <button onClick={handleLogout} className="w-full flex items-center space-x-2 p-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors font-bold select-none justify-center border border-transparent hover:border-red-100 shadow-sm bg-white">
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
            <h1 className="text-xl font-black text-gray-900 flex items-center tracking-tight">
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
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${timerRunning ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono">
                      {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
                    </span>
                  </button>
                  {isTimerOpen && (
                    <div className="absolute top-10 right-0 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 p-4.5 z-50">
                      <h4 className="text-xs font-bold text-gray-800 mb-2 border-b pb-1.5 uppercase tracking-wider block">Task Timer</h4>
                      <div className="flex justify-center mb-4 mt-2">
                        <span className="text-3xl font-light font-mono text-gray-800 tabular-nums">
                          {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setTimerRunning(!timerRunning)} className="py-1 px-2.5 rounded text-[11px] font-bold bg-primary text-white">
                          {timerRunning ? 'Pause' : 'Start'}
                        </button>
                        <button onClick={() => { setTimerRunning(false); setTimeRemaining(25 * 60); }} className="py-1 px-2.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600">
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {viewMode === 'project' && selectedProjectId && (
              <div className="flex items-center space-x-1 border border-gray-200 bg-gray-50/50 p-1 rounded-xl">
                {/* List View button */}
                <button
                  type="button"
                  onClick={async () => {
                    const currentProj = projects.find(p => p.id === selectedProjectId);
                    if (currentProj) {
                      await todoService.updateProject(currentProj.id, { viewType: 'list' });
                    }
                  }}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    projects.find(p => p.id === selectedProjectId)?.viewType !== 'kanban'
                      ? 'bg-white shadow-sm text-blue-600 border border-gray-150'
                      : 'text-gray-500 hover:text-gray-800 border border-transparent'
                  }`}
                  title="List View"
                >
                  <Menu className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden md:inline">List</span>
                </button>

                {/* Kanban View button */}
                <button
                  type="button"
                  onClick={async () => {
                    const currentProj = projects.find(p => p.id === selectedProjectId);
                    if (currentProj) {
                      await todoService.updateProject(currentProj.id, { viewType: 'kanban' });
                    }
                  }}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    projects.find(p => p.id === selectedProjectId)?.viewType === 'kanban'
                      ? 'bg-white shadow-sm text-blue-600 border border-gray-150'
                      : 'text-gray-500 hover:text-gray-800 border border-transparent'
                  }`}
                  title="Kanban View"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M4 19h4V5H4v14zm6-14v14h4V5h-4zm6 14h4V5h-4v14z" />
                  </svg>
                  <span className="text-[10px] hidden md:inline">Kanban</span>
                </button>
              </div>
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
              <span className="text-[9px] font-bold ml-1 hidden sm:inline uppercase">{sortOrder}</span>
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
                  <div className="text-[9px] font-black uppercase tracking-wider text-gray-400 px-2 py-1 border-b mb-1">List operations</div>
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
                    className="w-full text-left text-xs p-2 text-red-600 hover:bg-red-50 flex items-center rounded-lg font-bold"
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
                <h4 className="text-xs font-bold text-gray-800 flex items-center">
                  <Lightbulb className="w-4 h-4 text-yellow-500 mr-1.5" />
                  Smart Keywords Reference
                </h4>
                <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowSmartTips(false)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10.5px] text-gray-500 leading-normal mb-3">
                Type any keyword in your task title to instantly auto-categorize into its perfect project!
              </p>
              <div className="space-y-2">
                <div className="text-[10.2px] bg-red-50/50 p-2 rounded-lg border border-red-100 flex items-start gap-1.5">
                  <GraduationCap className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-red-900 block">CA Final</span>
                    <span className="text-gray-500 font-mono">audit, ca, final, accounts, revision, test, exam</span>
                  </div>
                </div>
                <div className="text-[10.2px] bg-purple-50/50 p-2 rounded-lg border border-purple-100 flex items-start gap-1.5">
                  <Smile className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-purple-900 block">Spiritual</span>
                    <span className="text-gray-500 font-mono">spiritual, bible, meditation, pray, devotional</span>
                  </div>
                </div>
                <div className="text-[10.2px] bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex items-start gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-blue-900 block">Research Items</span>
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
                  <h2 className="text-sm font-black text-gray-500 mb-6 uppercase tracking-wider">Historical Analytics (Last 7 Days)</h2>
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
                  {viewMode === 'project' && projects.find(p => p.id === selectedProjectId)?.viewType === 'kanban' ? (
                    <div className="w-full">
                      {/* Unified capsule quick task input (hidden in trash and completed views) */}
                      {viewMode !== 'trash' && viewMode !== 'completed' && (
                        <div className="relative mb-6">
                          <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                            <Plus className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            placeholder={`+ Add task to "${viewMode === 'project' ? (projects.find(p=>p.id===selectedProjectId)?.name || 'Inbox') : 'Inbox'}"... (Press Enter)`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                handleUnifiedQuickAdd(e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="w-full text-xs sm:text-sm bg-gray-100/60 hover:bg-gray-100/80 focus:bg-white border border-[#ececec] focus:border-gray-200 focus:outline-[#10B981] pl-11 pr-4 py-3 rounded-full transition-all text-black placeholder:text-gray-400 font-bold select-text cursor-text"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mt-2">
                        {/* COLUMN 1: TO DO */}
                        <div className="bg-[#f8f9fc] rounded-2xl p-4 border border-gray-150 flex flex-col min-h-[500px] shadow-sm">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/60">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">To Do</h3>
                            </div>
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                              {allActiveViewTodos.filter(t => !t.completed && (!t.priority || t.priority === 4)).length}
                            </span>
                          </div>

                          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-0.5">
                            {allActiveViewTodos.filter(t => !t.completed && (!t.priority || t.priority === 4)).map(todo => (
                              <motion.div
                                key={todo.id}
                                layoutId={todo.id}
                                className="bg-white rounded-xl border border-gray-150 p-3 shadow-sm hover:shadow-md transition-all relative group cursor-pointer text-left animate-in fade-in zoom-in-95 duration-100"
                                onClick={() => setSelectedTodoId(todo.id)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTodo(todo);
                                      }}
                                      className="mt-0.5 w-[16px] h-[16px] shrink-0 rounded-full border-2 border-gray-300 hover:border-primary flex items-center justify-center bg-white"
                                    >
                                      <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-100 text-[#2F6BE6]" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-bold text-gray-800 break-words leading-relaxed">{todo.title}</span>
                                      {todo.description && (
                                        <p className="text-[10px] text-gray-400 font-medium leading-normal mt-1 line-clamp-2">{todo.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-gray-50 text-[10px]">
                                  {/* Arrow controls to elevate or move priority */}
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await todoService.updateTodo(todo.id, { priority: 2 });
                                    }}
                                    className="text-gray-500 hover:text-blue-600 bg-gray-50 border border-gray-150 py-1 px-2 rounded-lg font-bold flex items-center space-x-1 transition"
                                    title="Mark In-Progress / Urgent"
                                  >
                                    <span>In-Progress</span>
                                    <svg className="w-3 h-3 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTodo(todo.id, e);
                                    }}
                                    className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}

                            {allActiveViewTodos.filter(t => !t.completed && (!t.priority || t.priority === 4)).length === 0 && (
                              <div className="text-center py-8 text-gray-400 text-[11px] italic">
                                No tasks to do.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* COLUMN 2: IN PROGRESS / URGENT */}
                        <div className="bg-[#fff9f6] rounded-2xl p-4 border border-orange-100 flex flex-col min-h-[500px] shadow-sm">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-orange-200">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">In Progress</h3>
                            </div>
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                              {allActiveViewTodos.filter(t => !t.completed && t.priority && t.priority < 4).length}
                            </span>
                          </div>

                          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-0.5">
                            {allActiveViewTodos.filter(t => !t.completed && t.priority && t.priority < 4).map(todo => (
                              <motion.div
                                key={todo.id}
                                layoutId={todo.id}
                                className="bg-white rounded-xl border border-orange-105 p-3 shadow-sm hover:shadow-md transition-all relative group cursor-pointer border-l-[3px] border-l-orange-400 pl-3 text-left animate-in fade-in zoom-in-95 duration-100"
                                onClick={() => setSelectedTodoId(todo.id)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTodo(todo);
                                      }}
                                      className="mt-0.5 w-[16px] h-[16px] shrink-0 rounded-full border border-orange-450 hover:border-primary flex items-center justify-center bg-white"
                                    >
                                      <Check className="w-2.5 h-2.5 opacity-0 hover:opacity-100 text-orange-600" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-bold text-gray-800 break-words leading-relaxed">{todo.title}</span>
                                      {todo.description && (
                                        <p className="text-[10px] text-gray-400 font-medium leading-normal mt-1 line-clamp-2">{todo.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-gray-50 text-[10px]">
                                  {/* Arrow controls to elevate or move priority */}
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await todoService.updateTodo(todo.id, { priority: 4 });
                                    }}
                                    className="text-gray-500 hover:text-gray-700 bg-gray-50 border border-gray-150 py-1 px-2 rounded-lg font-bold flex items-center space-x-1 transition"
                                    title="Demote to standard standard checklist item"
                                  >
                                    <svg className="w-3 h-3 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span>To Do</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTodo(todo.id, e);
                                    }}
                                    className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}

                            {allActiveViewTodos.filter(t => !t.completed && t.priority && t.priority < 4).length === 0 && (
                              <div className="text-center py-8 text-gray-400 text-[11px] italic">
                                No urgent or in progress tasks.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* COLUMN 3: DONE */}
                        <div className="bg-[#f5fbf7] rounded-2xl p-4 border border-emerald-100 flex flex-col min-h-[500px] shadow-sm">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-200">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Done</h3>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                              {allActiveViewTodos.filter(t => t.completed).length}
                            </span>
                          </div>

                          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-0.5">
                            {allActiveViewTodos.filter(t => t.completed).map(todo => (
                              <motion.div
                                key={todo.id}
                                layoutId={todo.id}
                                className="bg-white rounded-xl border border-emerald-50 p-3 shadow-sm hover:shadow-md transition-all relative group cursor-pointer opacity-75 text-left animate-in fade-in zoom-in-95 duration-100"
                                onClick={() => setSelectedTodoId(todo.id)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTodo(todo);
                                      }}
                                      className="mt-0.5 w-[16px] h-[16px] shrink-0 rounded-full border border-emerald-500 bg-emerald-50 hover:bg-emerald-100/50 flex items-center justify-center text-emerald-600"
                                    >
                                      <Check className="w-2.5 h-2.5 text-emerald-600 font-black" />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-bold text-gray-500 line-through break-words leading-relaxed">{todo.title}</span>
                                      {todo.description && (
                                        <p className="text-[10px] text-gray-400 font-medium leading-normal mt-1 line-clamp-2">{todo.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-gray-50 text-[10px]">
                                  <span className="text-emerald-600 font-medium text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Completed
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTodo(todo.id, e);
                                    }}
                                    className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}

                            {allActiveViewTodos.filter(t => t.completed).length === 0 && (
                              <div className="text-center py-8 text-gray-400 text-[11px] italic">
                                No completed tasks here yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      {/* Unified capsule quick task input (hidden in trash and completed views) */}
                  {viewMode !== 'trash' && viewMode !== 'completed' && (
                    <div className="relative mb-6">
                      <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                        <Plus className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder={`+ Add task to "${viewMode === 'project' ? (projects.find(p=>p.id===selectedProjectId)?.name || 'Inbox') : 'Inbox'}"... (Press Enter)`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleUnifiedQuickAdd(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className="w-full text-xs sm:text-sm bg-gray-100/60 hover:bg-gray-100/80 focus:bg-white border border-[#ececec] focus:border-gray-200 focus:outline-none pl-11 pr-4 py-3 rounded-full transition-all text-black placeholder:text-gray-400 font-bold select-text cursor-text"
                      />
                    </div>
                  )}

                  {/* GROUP A: "Countdown" collapsible section (only shown if countdown tasks exist and not in trash/completed view) */}
                  {allActiveViewTodos.filter(t => !t.completed && t.tags && t.tags.includes('Countdown')).length > 0 && viewMode !== 'trash' && viewMode !== 'completed' && (
                    <div className="mb-6">
                      <button
                        onClick={() => setIsCountdownExpanded(!isCountdownExpanded)}
                        className="flex items-center space-x-1.5 text-xs font-black text-gray-400 uppercase tracking-widest mb-3.5 bg-transparent border-none outline-none select-none cursor-pointer"
                      >
                        {isCountdownExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <span>Countdown</span>
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.2 rounded font-bold text-gray-400 ml-1.5">
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
                                  <div className="bg-[#ebf3ff]/90 text-[#2F6BE6] border border-blue-100/50 rounded-xl p-1.5 w-7.5 h-7.5 flex items-center justify-center shrink-0 mr-3.5 select-none">
                                    <Hourglass className="w-4 h-4 animate-spin-slow" />
                                  </div>
                                  <span 
                                    className="text-xs sm:text-[13px] text-[#202020] font-bold truncate cursor-pointer hover:text-primary"
                                    onClick={() => setSelectedTodoId(todo.id)}
                                  >
                                    {todo.title}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                  {renderItemProjectBadge(todo)}
                                  <span className="text-[9.5px] sm:text-[10.5px] text-[#2f6be6] font-bold bg-[#ebf3ff]/70 px-2 py-0.5 rounded-full select-none">
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
                      className="flex items-center space-x-1.5 text-xs font-black text-gray-400 uppercase tracking-widest mb-3.5 bg-transparent border-none outline-none select-none cursor-pointer"
                    >
                      {isPendingExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span>
                        {viewMode === 'today' ? `${format(new Date(), 'EEEE')}, Today` : viewMode === 'trash' ? 'Deleted Trash Bin' : viewMode === 'completed' ? 'Historical Active Logs' : getViewTitle()}
                      </span>
                      <span className="text-[10px] bg-gray-100 px-1.5 py-0.2 rounded font-bold text-gray-400 ml-1.5">
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
                                    <span className="text-xs sm:text-[13px] text-[#202020] font-semibold leading-relaxed">
                                      {todo.title}
                                    </span>
                                    {todo.description && (
                                      <p className="text-[10.5px] text-gray-400 line-clamp-1 leading-normal font-medium mt-0.5">{todo.description}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2.5 shrink-0 pl-2">
                                  {renderItemProjectBadge(todo)}

                                  {/* Repeat loop icon / or single calendar icon badges */}
                                  {viewMode !== 'trash' && (
                                    <span className="text-[9.5px] sm:text-[10.5px] text-[#2f6be6] font-bold bg-[#ebf3ff]/70 px-2 py-0.5 rounded-full flex items-center select-none shrink-0 border border-blue-100/10 leading-none">
                                      {todo.repeat && todo.repeat !== 'none' ? (
                                        <>
                                          <Repeat className="w-3 h-3 mr-1 animate-spin-slow text-blue-500" />
                                          Today
                                        </>
                                      ) : (
                                        <>
                                          <CalendarIcon className="w-3 h-3 mr-1 text-blue-500/70" />
                                          Today
                                        </>
                                      )}
                                    </span>
                                  )}

                                  {/* Fast actions deletion / restore */}
                                  <div className="flex items-center space-x-1">
                                    {viewMode === 'trash' && (
                                      <button
                                        onClick={(e) => handleRestoreTodo(todo.id, e)}
                                        className="p-1 px-1.5 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-green-700 bg-green-50 rounded border border-green-100 hover:bg-green-100 transition-opacity"
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
                            <h4 className="font-bold text-xs text-gray-700">All targets met</h4>
                            <p className="text-[10px] text-gray-400">Enjoy the rest of training day cycles.</p>
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
                        className="flex items-center space-x-1.5 text-xs font-black text-gray-400 uppercase tracking-widest mb-3.5 bg-transparent border-none outline-none select-none cursor-pointer"
                      >
                        {isCompletedSectionExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <span>Completed</span>
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.2 rounded font-bold text-gray-400 ml-1.5">
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
                                    <span className="text-xs sm:text-[13px] text-gray-400 line-through font-semibold leading-relaxed truncate block">
                                      {todo.title}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2.5 shrink-0 pl-2">
                                  {renderItemProjectBadge(todo)}
                                  <span className="text-[9.5px] sm:text-[10.5px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-full select-none">
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
                            <div className="text-[10.5px] text-gray-400 italic font-semibold py-4 pl-1">
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
                className="w-full font-bold text-[#202020] text-sm outline-none placeholder:text-gray-400 mb-2"
              />
              <textarea
                placeholder="Description / Notes"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full text-xs text-gray-600 outline-none placeholder:text-gray-400 resize-none h-12 mb-3"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setIsAddingTask(false)} className="px-3 py-1.5 text-xs hover:bg-gray-100 text-gray-600 rounded">
                  Cancel
                </button>
                <button onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="px-3 py-1.5 text-xs bg-primary text-white rounded disabled:opacity-50 font-bold">
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
                <h2 className="text-xl font-black text-gray-900 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-[#2F6BE6] fill-[#2F6BE6]" />
                  Starred High-Priorities
                </h2>
                <p className="text-xs text-gray-500">Focus solely on critical urgent P1 tasks.</p>
              </div>
              <div className="space-y-2">
                {todos.filter(t => !t.completed && !t.deletedAt && t.priority === 1).map(todo => (
                  <div key={todo.id} onClick={() => setSelectedTodoId(todo.id)} className="p-3.5 bg-red-50/30 border border-red-100 rounded-xl hover:shadow transition-all cursor-pointer flex justify-between items-center">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-gray-800">{todo.title}</span>
                    </div>
                    <span className="text-[10px] bg-red-100/75 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase">P1 High Target</span>
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
                <h2 className="text-xl font-black text-gray-900">Extensive Task Search</h2>
                <p className="text-xs text-gray-500">Perform deep filters across dates, tags, and projects.</p>
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
                  <div key={todo.id} onClick={() => setSelectedTodoId(todo.id)} className="p-3 bg-white border border-gray-100 hover:border-[#2F6BE6] cursor-pointer rounded-xl flex justify-between items-center">
                    <span className="text-xs font-bold">{todo.title}</span>
                    <span className={`text-[9px] px-2 py-0.5 font-bold rounded-full ${todo.completed ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'}`}>
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
                      <div className="flex items-center text-xs font-bold text-gray-500">
                        {todo.projectId && todo.projectId !== 'inbox' 
                          ? <><Folder className="w-3.5 h-3.5 mr-1.5 text-[#2F6BE6]" />{projects.find(p => p.id === todo.projectId)?.name}</>
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
                        <input
                           className={`text-lg font-black outline-none w-full bg-transparent ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                           value={todo.title}
                           onChange={(e) => todoService.updateTodo(todo.id, { title: e.target.value })}
                        />
                      </div>

                      {/* Detail picking controls */}
                      <div className="grid grid-cols-3 gap-2.5 mt-5 border-b border-gray-150 pb-5">
                        {/* Due Date */}
                        <div className="relative">
                          <label className="block text-[9.5px] font-black text-gray-400 uppercase tracking-widest mb-1">Due Date</label>
                          <button 
                            onClick={() => { setShowDetailDatePicker(!showDetailDatePicker); setShowDetailRepeatPicker(false); setShowDetailPriorityPicker(false); }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 transition text-gray-700"
                          >
                            <span className="truncate">
                              {todo.dueDate ? format(new Date(todo.dueDate), 'MMM d, yyyy') : 'No Date'}
                            </span>
                            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                          </button>
                          {showDetailDatePicker && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 shadow-2xl rounded-xl p-2">
                              <DayPicker 
                                mode="single" 
                                selected={todo.dueDate ? new Date(todo.dueDate) : undefined} 
                                onSelect={(d) => { 
                                  todoService.updateTodo(todo.id, { dueDate: d ? d.getTime() : null }); 
                                  setShowDetailDatePicker(false); 
                                }} 
                              />
                            </div>
                          )}
                        </div>

                        {/* Priority Picker */}
                        <div className="relative">
                          <label className="block text-[9.5px] font-black text-gray-400 uppercase tracking-widest mb-1">Priority</label>
                          <button 
                            onClick={() => { setShowDetailPriorityPicker(!showDetailPriorityPicker); setShowDetailDatePicker(false); setShowDetailRepeatPicker(false); }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 transition text-gray-700"
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <Flag className={`w-3.5 h-3.5 ${getPriorityColor(todo.priority || 4)}`} />
                              P{todo.priority || 4}
                            </span>
                            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                          </button>
                          {showDetailPriorityPicker && (
                            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 shadow-2xl rounded-xl p-1 w-32">
                              {[1, 2, 3, 4].map(p => (
                                <button
                                  key={p}
                                  onClick={() => {
                                    todoService.updateTodo(todo.id, { priority: p });
                                    setShowDetailPriorityPicker(false);
                                  }}
                                  className="w-full flex items-center px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg"
                                >
                                  <Flag className={`w-3.5 h-3.5 mr-2 ${getPriorityColor(p)}`} />
                                  P {p}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Repeat Option */}
                        <div className="relative">
                          <label className="block text-[9.5px] font-black text-gray-400 uppercase tracking-widest mb-1">Repeat</label>
                          <button 
                            onClick={() => { setShowDetailRepeatPicker(!showDetailRepeatPicker); setShowDetailDatePicker(false); setShowDetailPriorityPicker(false); }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 transition text-gray-700"
                          >
                            <span className="truncate block font-semibold">
                              {todo.repeat || 'none'}
                            </span>
                            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                          </button>
                          {showDetailRepeatPicker && (
                            <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 shadow-2xl rounded-xl p-1.5 w-48">
                              {['none', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'].map(item => (
                                <button
                                  key={item}
                                  onClick={() => {
                                    todoService.updateTodo(todo.id, { repeat: item as any });
                                    setShowDetailRepeatPicker(false);
                                  }}
                                  className="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded-lg text-xs capitalize"
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes / Descriptions and subtasks checklist inside Drawer */}
                      <div className="mt-5 space-y-5">
                        <div className="flex flex-col text-left">
                          <label className="text-[10.5px] font-black text-gray-400 uppercase tracking-widest mb-2">Notes Notes</label>
                          <textarea
                            placeholder="Add detailed parameters or Markdown logs..."
                            className="text-xs w-full bg-gray-50/50 hover:bg-gray-50 border focus:bg-white focus:border-primary p-3 rounded-xl min-h-[90px] outline-none transition"
                            value={todo.description || ''}
                            onChange={(e) => todoService.updateTodo(todo.id, { description: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col text-left">
                          <label className="text-[10.5px] font-black text-gray-400 uppercase tracking-widest mb-2">Subtasks</label>
                          <div className="space-y-1.5">
                            {todo.subtasks?.map(subtask => (
                              <div key={subtask.id} className="flex items-center group">
                                <button
                                  onClick={() => {
                                    const next = todo.subtasks?.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s);
                                    todoService.updateTodo(todo.id, { subtasks: next });
                                  }}
                                  className={`mr-2 w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${subtask.completed ? 'bg-primary text-white border-primary' : 'border-gray-200 bg-gray-50'}`}
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
                            <div className="flex items-center mt-2 pl-1 select-none text-[#2F6BE6]">
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
                                className="text-xs bg-transparent outline-none flex-1 placeholder:text-[#2F6BE6]"
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
                    <h3 className="text-lg font-black text-gray-800">Add List</h3>
                    {/* Mobile-only close button */}
                    <button
                      type="button"
                      onClick={() => setIsAddingProject(false)}
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
                      <input
                        type="text"
                        placeholder="Name"
                        autoFocus
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full text-xs sm:text-sm pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-blue-450 focus:ring-1 focus:ring-blue-450 rounded-xl outline-none transition text-black font-semibold shadow-sm"
                      />
                    </div>

                    {/* List Color row */}
                    <div className="flex items-center space-x-4">
                      <span className="text-xs font-bold text-gray-500 w-24 shrink-0">List Color</span>
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
                          '#2F6BE6', // Classic Blue
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
                      <span className="text-xs font-bold text-gray-500 w-24 shrink-0">View Type</span>
                      <div className="flex items-center space-x-2.5">
                        {/* View List Button */}
                        <button
                          type="button"
                          onClick={() => setListViewType('list')}
                          className={`p-2.5 border rounded-xl flex items-center justify-center transition-all ${listViewType === 'list' ? 'bg-[#ebf3ff]/80 border-[#2F6BE6] text-[#2F6BE6] shadow-sm' : 'border-gray-200 bg-gray-50/50 text-gray-400 hover:bg-gray-100/50'}`}
                          title="Sequential List View"
                        >
                          <Menu className="w-4.5 h-4.5" />
                        </button>

                        {/* View Kanban Button */}
                        <button
                          type="button"
                          onClick={() => setListViewType('kanban')}
                          className={`p-2.5 border rounded-xl flex items-center justify-center transition-all relative ${listViewType === 'kanban' ? 'bg-[#ebf3ff]/80 border-[#2F6BE6] text-[#2F6BE6] shadow-sm' : 'border-gray-200 bg-gray-50/50 text-gray-400 hover:bg-gray-100/50'}`}
                          title="Kanban Board View"
                        >
                          <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                            <path d="M4 19h4V5H4v14zm6-14v14h4V5h-4zm6 14h4V5h-4v14z" />
                          </svg>
                        </button>

                        {/* View Timeline Button (With tiny Sparkles / Crown offset premium crown badge) */}
                        <button
                          type="button"
                          onClick={() => setListViewType('timeline')}
                          className={`p-2.5 border rounded-xl flex items-center justify-center transition-all relative ${listViewType === 'timeline' ? 'bg-[#ebf3ff]/80 border-[#2F6BE6] text-[#2F6BE6] shadow-sm' : 'border-gray-200 bg-gray-50/50 text-gray-400 hover:bg-gray-100/50'}`}
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
                      <span className="text-xs font-bold text-gray-500 w-24 shrink-0">Folder</span>
                      {!isCreatingFolderInModal ? (
                        <div className="flex-1 max-w-[280px]">
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
                            className="w-full text-xs bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-400 rounded-xl px-3 py-2 outline-none font-bold text-gray-700 shadow-sm transition-colors cursor-pointer"
                          >
                            <option value="none">None</option>
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                📁 {f.name}
                              </option>
                            ))}
                            <option value="create_new" className="text-blue-600 font-extrabold">+ Create New Folder...</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex-1 max-w-[280px] flex items-center gap-1.5 animate-in fade-in slide-in-from-left-1 duration-150">
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
                            className="flex-1 text-xs bg-white border border-gray-200 focus:border-blue-500 rounded-xl px-2.5 py-1.5 outline-none font-bold text-gray-700 shadow-sm transition-all"
                            autoFocus
                          />
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
                            className="px-2.5 py-1.5 text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-[10px] font-black shadow-sm transition-colors"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingFolderInModal(false)}
                            className="p-1 px-1.5 border border-gray-250 hover:bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* List Type row */}
                    <div className="flex items-center space-x-4">
                      <span className="text-xs font-bold text-gray-500 w-24 shrink-0">List Type</span>
                      <select
                        value={listType}
                        onChange={(e) => setListType(e.target.value as 'task' | 'note')}
                        className="flex-1 max-w-[280px] text-xs bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-400 rounded-xl px-3 py-2 outline-none font-bold text-gray-700 shadow-sm transition-colors cursor-pointer"
                      >
                        <option value="task">Task List</option>
                        <option value="note">Note List</option>
                      </select>
                    </div>

                    {/* Show in Smart List row */}
                    <div className="flex items-center space-x-4">
                      <span className="text-xs font-bold text-gray-500 w-24 shrink-0">Show in Smart List</span>
                      <select
                        value={listSmartOption}
                        onChange={(e) => setListSmartOption(e.target.value as 'all' | 'none')}
                        className="flex-1 max-w-[280px] text-xs bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-400 rounded-xl px-3 py-2 outline-none font-bold text-gray-700 shadow-sm transition-colors cursor-pointer"
                      >
                        <option value="all">All tasks</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cancel & Add operations buttons stacked aligned left */}
                <div className="flex items-center space-x-2.5 mt-8 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setIsAddingProject(false)}
                    className="px-6 py-2 border border-gray-250 hover:bg-gray-50 text-gray-600 rounded-xl text-xs font-black shadow-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!newProjectName.trim()}
                    onClick={async () => {
                      if (newProjectName.trim() && auth.currentUser) {
                        const targetFolder = listFolderId === 'none' ? null : listFolderId;
                        await todoService.createProject(
                          newProjectName.trim(), 
                          listColor, 
                          auth.currentUser.uid, 
                          'Hash', // Use standard bullet or Hash or List icon as key
                          targetFolder,
                          listViewType
                        );
                        setNewProjectName('');
                        setIsAddingProject(false);
                      }
                    }}
                    className="px-6 py-2 text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-xs font-black shadow-md shadow-blue-500/10 transition-all cursor-pointer"
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
                  onClick={() => setIsAddingProject(false)}
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
                        <span className="text-sm font-black text-gray-800 tracking-tight block max-w-[150px] truncate animate-fade-in">
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
                      <div className="flex items-center space-x-1.5 text-[9px] font-extrabold text-gray-300 uppercase tracking-widest mb-2.5">
                        <span>Countdown</span>
                        <span className="text-[8.5px] bg-gray-100 font-bold px-1 rounded">1</span>
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
                          className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-full"
                          style={{ background: `${listColor}1a`, color: listColor }}
                        >
                          Today
                        </span>
                      </div>
                    </div>

                    {/* Subtitle group 2 mockup */}
                    <div>
                      <div className="flex items-center space-x-1.5 text-[9px] font-extrabold text-gray-300 uppercase tracking-widest mb-2.5">
                        <span>Active tasks</span>
                        <span className="text-[8.5px] bg-gray-100 font-bold px-1 rounded">2</span>
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
                  <div className="text-[8.5px] text-gray-400 font-medium text-center border-t border-gray-50 pt-2.5 italic">
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
              <h3 className="font-black text-sm text-gray-900 mb-2">Confirm Action</h3>
              <p className="text-xs text-gray-500 mb-5">{confirmDialog.message}</p>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setConfirmDialog(null)} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded font-bold">
                  Cancel
                </button>
                <button onClick={confirmDialog.onConfirm} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded font-bold hover:bg-red-700">
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
