import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Trash2, Plus, GripVertical, Calendar as CalendarIcon, Inbox, Hash, MoreHorizontal, ChevronDown, ChevronRight, Menu, LogOut, X, Flag, CalendarDays, FlagTriangleRight, Search, Repeat, Smile, Folder, Briefcase, Code, Map, Music, Camera, Book, Heart, Star, Zap, Circle, BarChart2, Clock, Timer } from 'lucide-react';
import { todoService } from '../services/todoService';
import { Todo, Project, Folder as FolderType } from '../types';
import { auth } from '../lib/firebase';
import { format, isToday, isTomorrow, isPast, isSameDay, startOfDay, subDays } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { signOut } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  
  // App State
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectIcon, setNewProjectIcon] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);

  // Edit Project State
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectIcon, setEditProjectIcon] = useState('');
  const [editProjectFolderId, setEditProjectFolderId] = useState<string | null>(null);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);

  const [editingTodoDateId, setEditingTodoDateId] = useState<string | null>(null);
  const [editingTodoDeadlineId, setEditingTodoDeadlineId] = useState<string | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  // Timer State
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setTimerRunning(false);
      // Play sound or notification here ideally
      if (timerMode === 'work') {
        setTimerMode('break');
        setTimeRemaining(5 * 60);
        // We could auto-start break, but standard is to pause and let user start
      } else {
        setTimerMode('work');
        setTimeRemaining(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeRemaining, timerMode]);

  // Add Task State
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

  const handleLogout = () => signOut(auth);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !auth.currentUser) return;
    
    await todoService.createTodo({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      userId: auth.currentUser.uid,
      completed: false,
      projectId: newTaskProject,
      priority: newTaskPriority,
      dueDate: newTaskDueDate ? newTaskDueDate.getTime() : null,
      deadline: newTaskDeadline ? newTaskDeadline.getTime() : null,
      repeat: newTaskRepeat,
    });
    
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDeadline(undefined);
    setNewTaskRepeat('none');
    setIsAddingTask(false);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to delete this project and all its tasks?',
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
      message: 'Are you sure you want to delete this folder? Projects inside will be kept outside.',
      onConfirm: async () => {
        // First move child projects out
        const childProjects = projects.filter(p => p.folderId === folderId);
        for (const p of childProjects) {
          await handleMoveProjectToFolder(p.id, null);
        }
        await todoService.deleteFolder(folderId);
        setConfirmDialog(null);
      }
    });
  };

  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('');
  const [showEditFolderColorPicker, setShowEditFolderColorPicker] = useState(false);

  const handleStartEditFolder = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
    setEditFolderColor(folder.color || FOLDER_COLORS[0]);
  };

  const handleSaveEditFolder = async (folderId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editFolderName.trim()) {
      try {
        await todoService.updateFolder(folderId, {
          name: editFolderName.trim(),
          color: editFolderColor
        });
        setEditingFolderId(null);
        setShowEditFolderColorPicker(false);
      } catch (error) {
        console.error("Failed to update folder", error);
      }
    }
  };

  const handleStartEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
    setEditProjectIcon(project.icon || '');
    setEditProjectFolderId(project.folderId || null);
  };

  const handleSaveEditProject = async (projectId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editProjectName.trim()) {
      try {
        await todoService.updateProject(projectId, {
          name: editProjectName.trim(),
          icon: editProjectIcon,
          folderId: editProjectFolderId
        });
        setEditingProjectId(null);
        setShowEditEmojiPicker(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    const newStatus = !todo.completed;
    await todoService.updateTodoStatus(todo.id, newStatus);
    
    // If completing and has repeat, create next recurrence
    if (newStatus && todo.repeat && todo.repeat !== 'none') {
      const getNextDate = (currentDateMs: number | null | undefined) => {
        if (!currentDateMs) return Date.now();
        const current = new Date(currentDateMs);
        switch (todo.repeat) {
          case 'hourly': return current.setHours(current.getHours() + 1);
          case 'daily': return current.setDate(current.getDate() + 1);
          case 'weekly': return current.setDate(current.getDate() + 7);
          case 'monthly': return current.setMonth(current.getMonth() + 1);
          case 'yearly': return current.setFullYear(current.getFullYear() + 1);
          default: return currentDateMs;
        }
      };

      const newTodo = {
        title: todo.title,
        description: todo.description,
        userId: todo.userId,
        projectId: todo.projectId,
        priority: todo.priority,
        repeat: todo.repeat,
        dueDate: todo.dueDate ? getNextDate(todo.dueDate) : null,
        deadline: todo.deadline ? getNextDate(todo.deadline) : null,
        completed: false
      };
      
      await todoService.createTodo(newTodo);
    }
  };

  const handleDeleteTodo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    if (todo.deletedAt) {
      // Hard delete
      setConfirmDialog({
        isOpen: true,
        message: 'Are you sure you want to delete this task permanently?',
        onConfirm: async () => {
          await todoService.deleteTodo(id);
          setConfirmDialog(null);
        }
      });
    } else {
      // Soft delete
      await todoService.softDeleteTodo(id);
    }
  };

  const handleRestoreTodo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await todoService.restoreTodo(id);
  };

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
  const getFilteredTodos = () => {
    let baseTodos = todos;
    
    if (viewMode === 'trash') {
      baseTodos = todos.filter(t => t.deletedAt);
    } else if (viewMode === 'completed') {
      baseTodos = todos.filter(t => t.completed && !t.deletedAt);
    } else {
      baseTodos = todos.filter(t => !t.completed && !t.deletedAt);
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
  
  // Sorting: High priority first, then deadline/due date
  filteredTodos.sort((a, b) => {
    if ((a.priority || 4) !== (b.priority || 4)) return (a.priority || 4) - (b.priority || 4);
    
    // Use deadline if available, otherwise dueDate
    const dateA = a.deadline || a.dueDate;
    const dateB = b.deadline || b.dueDate;
    
    if (dateA && dateB) return dateA - dateB;
    if (dateA) return -1;
    if (dateB) return 1;

    return 0;
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
      case 1: return 'text-red-500 fill-red-500';
      case 2: return 'text-orange-500 fill-orange-500';
      case 3: return 'text-blue-500 fill-blue-500';
      default: return 'text-slate-400';
    }
  };
  
  const getPriorityBg = (priority?: number) => {
    switch(priority) {
      case 1: return 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200';
      case 2: return 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200';
      case 3: return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200';
      default: return 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200';
    }
  };

  const formatTaskDate = (timestamp?: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (isToday(date)) return <span className="text-green-600 font-semibold text-xs flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> Today</span>;
    if (isTomorrow(date)) return <span className="text-orange-500 font-semibold text-xs flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> Tomorrow</span>;
    if (isPast(date)) return <span className="text-red-500 font-semibold text-xs flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {format(date, 'MMM d')}</span>;
    return <span className="text-slate-500 text-xs flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {format(date, 'MMM d')}</span>;
  };

  const formatTaskDeadline = (timestamp?: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (isToday(date)) return <span className="text-red-600 font-semibold text-xs flex items-center"><Clock className="w-3 h-3 mr-1" /> Deadline Today</span>;
    if (isTomorrow(date)) return <span className="text-orange-600 font-semibold text-xs flex items-center"><Clock className="w-3 h-3 mr-1" /> Deadline Tomorrow</span>;
    if (isPast(date)) return <span className="text-red-600 font-semibold text-xs flex items-center"><Clock className="w-3 h-3 mr-1" /> Overdue: {format(date, 'MMM d')}</span>;
    return <span className="text-slate-500 text-xs flex items-center"><Clock className="w-3 h-3 mr-1" /> Deadline: {format(date, 'MMM d')}</span>;
  };

  const renderProjectItem = (project: Project) => (
    <div 
      key={project.id} 
      className="relative group"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('projectId', project.id);
      }}
    >
      {editingProjectId === project.id ? (
        <form 
          onSubmit={(e) => handleSaveEditProject(project.id, e)}
          className="flex flex-col space-y-2 relative p-2"
        >
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
              className="p-1 rounded-md hover:bg-gray-200 border text-sm flex items-center justify-center shrink-0 w-8 h-8"
            >
              {renderIcon(editProjectIcon, project.color, "w-5 h-5")}
            </button>
            <input
              type="text"
              autoFocus
              value={editProjectName}
              onChange={(e) => setEditProjectName(e.target.value)}
              className="w-full text-sm border focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-2 py-1 outline-none"
            />
            <button type="submit" disabled={!editProjectName.trim()} className="text-white bg-primary p-1.5 rounded-md disabled:opacity-50">
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => { setEditingProjectId(null); setShowEditEmojiPicker(false); }} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md">
              <X className="w-4 h-4" />
            </button>
          </div>
          {folders.length > 0 && (
            <div className="flex items-center space-x-2 mt-1">
              <Folder className="w-4 h-4 text-gray-400" />
              <select 
                value={editProjectFolderId || ''}
                onChange={(e) => setEditProjectFolderId(e.target.value || null)}
                className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-1 py-1 outline-none"
              >
                <option value="">No Folder</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
          {showEditEmojiPicker && (
            <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2 w-48 grid grid-cols-4 gap-2">
               {AVAILABLE_ICONS.map(iconName => {
                 const IconC = PROJECT_ICONS[iconName];
                 return (
                   <button
                     key={iconName}
                     type="button"
                     onClick={() => {
                       setEditProjectIcon(iconName);
                       setShowEditEmojiPicker(false);
                     }}
                     className="p-2 hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                     title={iconName}
                   >
                      <IconC className="w-5 h-5 text-gray-600" />
                   </button>
                 );
               })}
            </div>
          )}
        </form>
      ) : (
        <div className="flex items-center w-full">
          <button
            onClick={() => { 
               setViewMode('project'); 
               setSelectedProjectId(project.id); 
               setIsAddingTask(false); 
               if (window.innerWidth < 768) setIsSidebarOpen(false);
            }}
            className={`flex-1 flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'project' && selectedProjectId === project.id ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
          >
            <div className="flex items-center space-x-3 truncate">
              {renderIcon(project.icon, project.color, "w-5 h-5")}
              <span className="truncate">{project.name}</span>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span 
                onClick={(e) => handleStartEditProject(project, e)} 
                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 mr-1"
              >
                <MoreHorizontal className="w-4 h-4" />
              </span>
              <span 
                onClick={(e) => handleDeleteProject(project.id, e)} 
                className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  const renderProjectList = () => (
    <div className="space-y-1">
      {folders.map(folder => (
        <div 
          key={folder.id} 
          className="mb-2 transition-colors relative"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('bg-gray-50');
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('bg-gray-50');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('bg-gray-50');
            const pid = e.dataTransfer.getData('projectId');
            if (pid) handleMoveProjectToFolder(pid, folder.id);
          }}
        >
          {editingFolderId === folder.id ? (
            <form 
              onSubmit={(e) => handleSaveEditFolder(folder.id, e)}
              className="flex flex-col space-y-2 relative p-2"
            >
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditFolderColorPicker(!showEditFolderColorPicker)}
                  className="p-1 rounded-md hover:bg-gray-200 border text-sm flex items-center justify-center shrink-0 w-8 h-8"
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: editFolderColor }} />
                </button>
                <input
                  type="text"
                  autoFocus
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  className="w-full text-sm border focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-2 py-1 outline-none"
                />
                <button type="submit" disabled={!editFolderName.trim()} className="text-white bg-primary p-1.5 rounded-md disabled:opacity-50">
                  <Check className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { setEditingFolderId(null); setShowEditFolderColorPicker(false); }} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {showEditFolderColorPicker && (
                <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2 w-48 grid grid-cols-5 gap-2">
                   {FOLDER_COLORS.map(color => (
                     <button
                       key={color}
                       type="button"
                       onClick={() => {
                         setEditFolderColor(color);
                         setShowEditFolderColorPicker(false);
                       }}
                       className="w-6 h-6 rounded-full mx-auto hover:ring-2 ring-offset-1 transition-all"
                       style={{ backgroundColor: color, ringColor: color }}
                       title={color}
                     />
                   ))}
                </div>
              )}
            </form>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-md group hover:bg-gray-100 border border-transparent">
              <div className="flex items-center space-x-2 text-sm text-gray-700 font-medium w-full">
                <Folder className="w-4 h-4 shrink-0" style={{ color: folder.color || '#9ca3af' }} />
                <span className="truncate">{folder.name}</span>
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span 
                  onClick={(e) => handleStartEditFolder(folder, e)} 
                  className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 mr-1 cursor-pointer"
                  title="Rename/Color Picker"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </span>
                <button 
                  onClick={(e) => handleDeleteFolder(folder.id, e)}
                  className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 flex-shrink-0"
                  title="Delete Folder"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          <div className="pl-4 space-y-1 mt-1 border-l-2 border-gray-100 ml-3">
            {projects.filter(p => p.folderId === folder.id).map(renderProjectItem)}
            {projects.filter(p => p.folderId === folder.id).length === 0 && (
              <div className="text-xs text-gray-400 py-1 pl-2 italic">Drag projects here</div>
            )}
          </div>
        </div>
      ))}
      
      {projects.filter(p => !p.folderId).map(renderProjectItem)}
      
      {projects.length === 0 && folders.length === 0 && !isAddingProject && (
        <div className="text-xs text-center text-gray-400 italic py-2">No projects yet</div>
      )}
    </div>
  );

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/20 z-40" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#FAFAFA] border-r border-border shrink-0 h-full overflow-y-auto hidden md:block" // Hidden mobile by motion, fixed below
      >
        <div className="p-4 w-[280px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {auth.currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-sm truncate max-w-[150px]">{auth.currentUser?.email}</span>
            </div>
          </div>

          <nav className="space-y-1 mb-8">
            <button
              onClick={() => { setViewMode('inbox'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'inbox' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <Inbox className="w-5 h-5 text-[#246FE0]" />
                <span>Inbox</span>
              </div>
              <span className="text-xs text-gray-500">{todos.filter(t => !t.completed && (!t.projectId || t.projectId === 'inbox')).length || ''}</span>
            </button>
            <button
              onClick={() => { setViewMode('today'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'today' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <CalendarIcon className="w-5 h-5 text-green-600" />
                <span>Today</span>
              </div>
              <span className="text-xs text-gray-500">
                {todos.filter(t => !t.completed && ((t.dueDate && (isToday(new Date(t.dueDate)) || isPast(new Date(t.dueDate)))) || (t.deadline && (isToday(new Date(t.deadline)) || isPast(new Date(t.deadline)))))).length || ''}
              </span>
            </button>
            <button
              onClick={() => { setViewMode('upcoming'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'upcoming' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <CalendarDays className="w-5 h-5 text-purple-600" />
                <span>Upcoming</span>
              </div>
            </button>
            <button
              onClick={() => { setViewMode('trends'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'trends' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <span>Trends</span>
              </div>
            </button>
            <button
              onClick={() => { setViewMode('completed'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'completed' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-gray-500" />
                <span>Completed</span>
              </div>
            </button>
            <button
              onClick={() => { setViewMode('trash'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'trash' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <Trash2 className="w-5 h-5 text-red-500" />
                <span>Trash</span>
              </div>
            </button>
          </nav>

          <div className="mb-4">
            <div className="flex items-center justify-between px-2 text-gray-500 text-xs font-semibold mb-2 group">
              <span>My Projects</span>
              <div className="opacity-0 group-hover:opacity-100 flex items-center transition-all">
                <button 
                  title="New Folder"
                  className="hover:bg-gray-200 p-1 rounded mr-1"
                  onClick={() => setIsAddingFolder(true)}
                >
                  <Folder className="w-3 h-3" />
                </button>
                <button 
                  title="New Project"
                  className="hover:bg-gray-200 p-1 rounded"
                  onClick={() => setIsAddingProject(true)}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            
            <AnimatePresence>
              {isAddingFolder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 px-2"
                >
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      handleCreateFolder(newFolderName);
                      setNewFolderName('');
                      setIsAddingFolder(false);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Folder className="w-4 h-4 text-gray-400 shrink-0 mx-1.5" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="w-full text-sm border focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-2 py-1 outline-none"
                    />
                    <button type="submit" disabled={!newFolderName.trim()} className="text-white bg-primary p-1.5 rounded-md disabled:opacity-50">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setIsAddingFolder(false)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md">
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              )}

              {isAddingProject && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 px-2"
                >
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (newProjectName.trim() && auth.currentUser) {
                        try {
                          await todoService.createProject(newProjectName.trim(), '#6b7280', auth.currentUser.uid, newProjectIcon);
                          setNewProjectName('');
                          setNewProjectIcon('');
                          setShowEmojiPicker(false);
                          setIsAddingProject(false);
                        } catch (err) {
                           console.error(err);
                        }
                      }
                    }}
                    className="flex flex-col space-y-2 relative"
                  >
                    <div className="flex items-center space-x-2">
                        <button
                         type="button"
                         onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                         className="p-1 rounded-md hover:bg-gray-200 border text-sm flex items-center justify-center shrink-0 w-8 h-8"
                       >
                         {renderIcon(newProjectIcon, '#6b7280', "w-5 h-5")}
                       </button>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Project name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full text-sm border focus:border-primary focus:ring-1 focus:ring-primary rounded-md px-2 py-1 outline-none"
                      />
                      <button type="submit" disabled={!newProjectName.trim()} className="text-white bg-primary p-1.5 rounded-md disabled:opacity-50">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => { setIsAddingProject(false); setShowEmojiPicker(false); }} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {showEmojiPicker && (
                      <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2 w-48 grid grid-cols-4 gap-2">
                         {AVAILABLE_ICONS.map(iconName => {
                           const IconC = PROJECT_ICONS[iconName];
                           return (
                             <button
                               key={iconName}
                               type="button"
                               onClick={() => {
                                 setNewProjectIcon(iconName);
                                 setShowEmojiPicker(false);
                               }}
                               className="p-2 hover:bg-gray-100 rounded flex items-center justify-center transition-colors"
                               title={iconName}
                             >
                                <IconC className="w-5 h-5 text-gray-600" />
                             </button>
                           );
                         })}
                      </div>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
            
            {renderProjectList()}
          </div>
        </div>
      </motion.aside>
      
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="md:hidden fixed inset-y-0 left-0 bg-[#FAFAFA] border-r border-border w-[280px] z-50 h-full overflow-y-auto shadow-2xl"
          >
            {/* Exactly the same sidebar content for mobile */}
            <div className="p-4 pt-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {auth.currentUser?.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm truncate max-w-[150px]">{auth.currentUser?.email}</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 mb-8">
                <button
                  onClick={() => { setViewMode('inbox'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'inbox' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                >
                  <div className="flex items-center space-x-3">
                    <Inbox className="w-5 h-5 text-[#246FE0]" />
                    <span>Inbox</span>
                  </div>
                  <span className="text-xs text-gray-500">{todos.filter(t => !t.completed && (!t.projectId || t.projectId === 'inbox')).length || ''}</span>
                </button>
                <button
                  onClick={() => { setViewMode('today'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'today' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                >
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="w-5 h-5 text-green-600" />
                    <span>Today</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {todos.filter(t => !t.completed && ((t.dueDate && (isToday(new Date(t.dueDate)) || isPast(new Date(t.dueDate)))) || (t.deadline && (isToday(new Date(t.deadline)) || isPast(new Date(t.deadline)))))).length || ''}
                  </span>
                </button>
                <button
                  onClick={() => { setViewMode('trends'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'trends' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                >
                  <div className="flex items-center space-x-3">
                    <BarChart2 className="w-5 h-5 text-blue-600" />
                    <span>Trends</span>
                  </div>
                </button>
                <button
                  onClick={() => { setViewMode('completed'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'completed' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                >
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-gray-500" />
                    <span>Completed</span>
                  </div>
                </button>
                <button
                  onClick={() => { setViewMode('trash'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'trash' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                >
                  <div className="flex items-center space-x-3">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <span>Trash</span>
                  </div>
                </button>
              </nav>

              <div className="mb-4">
                <div className="flex items-center justify-between px-2 text-gray-500 text-xs font-semibold mb-2">
                  <span>My Projects</span>
                </div>
                {renderProjectList()}
              </div>
              
              <div className="mt-8 border-t border-border pt-4">
                <button onClick={handleLogout} className="w-full flex items-center space-x-3 p-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-5 h-5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-white flex flex-col items-center">
        <div className="w-full max-w-[800px] px-6 py-8 md:py-12 mt-4 md:mt-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="mr-4 p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-[#202020] flex items-center">
                {getViewTitle()}
                {viewMode === 'today' && <span className="text-xs text-gray-400 font-normal ml-2">{format(new Date(), 'EEE MMM d')}</span>}
              </h1>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center space-x-3 flex-1 md:max-w-md justify-end">
              {/* Search Input */}
              <div className="relative flex-1 max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-gray-50 focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              
              {/* Pomodoro Timer */}
              <div className="relative">
                <button 
                  onClick={() => setIsTimerOpen(!isTimerOpen)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${timerRunning ? 'border-[#ff4d4f] bg-[#fff1f0] text-[#cf1322]' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'}`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-semibold font-mono">
                    {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
                  </span>
                </button>
                {isTimerOpen && (
                  <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-semibold text-gray-800">Focus Timer</h4>
                      <div className="flex space-x-1 bg-gray-100 p-0.5 rounded-md">
                        <button 
                          onClick={() => { setTimerMode('work'); setTimeRemaining(25*60); setTimerRunning(false); }}
                          className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${timerMode === 'work' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Work
                        </button>
                        <button 
                          onClick={() => { setTimerMode('break'); setTimeRemaining(5*60); setTimerRunning(false); }}
                          className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${timerMode === 'break' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Break
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-center mb-6 mt-2">
                       <span className="text-5xl font-light tracking-tight text-gray-800 tabular-nums">
                         {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
                       </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setTimerRunning(!timerRunning)}
                        className={`w-full py-2 rounded-md font-medium text-sm transition-colors ${timerRunning ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-primary text-white hover:bg-primary/90'}`}
                      >
                        {timerRunning ? 'Pause' : 'Start'}
                      </button>
                      <button 
                        onClick={() => {
                          setTimerRunning(false);
                          setTimeRemaining(timerMode === 'work' ? 25 * 60 : 5 * 60);
                        }}
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded-md font-medium text-sm transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {viewMode === 'trends' ? (
            <div className="py-8 bg-white border border-gray-100 rounded-xl shadow-sm p-6 mb-8">
              <h2 className="text-sm font-semibold text-gray-500 mb-6 uppercase tracking-wider">Completion Trends (Last 7 Days)</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getTrendsData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar dataKey="completed" name="Completed Tasks" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="pending" name="Pending Tasks" fill="#DBEAFE" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <AnimatePresence>
                {filteredTodos.map(todo => (
                  <motion.div
                    key={todo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    className="group flex items-start p-3 py-4 hover:bg-white border-b border-[#f0f0f0] transition-colors"
                  >
                    <button 
                      onClick={() => handleToggleTodo(todo)}
                      className="mr-3 mt-0.5 w-5 h-5 flex shrink-0 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 peer"
                    >
                      <Check className="w-3 h-3 text-gray-400 opacity-0 transition-opacity" />
                    </button>
                    <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => setSelectedTodoId(todo.id)}>
                      <p className={`text-sm text-[#202020] mb-1 ${todo.completed ? 'line-through text-gray-400' : ''}`}>{todo.title}</p>
                      {todo.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">{todo.description}</p>
                      )}
                      {todo.tags && todo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {todo.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded border border-gray-200">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {todo.subtasks && todo.subtasks.length > 0 && (
                        <div className="text-[10px] text-gray-500 flex items-center mb-1.5">
                           <Check className="w-3 h-3 mr-1" />
                           {todo.subtasks.filter(s => s.completed).length} / {todo.subtasks.length} subtasks
                        </div>
                      )}
                      <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button 
                            onClick={() => { setEditingTodoDateId(todo.id); setEditingTodoDeadlineId(null); }}
                            className="hover:bg-gray-100 rounded px-1 -ml-1 transition-colors flex items-center h-5"
                          >
                            {formatTaskDate(todo.dueDate) || <span className="text-gray-400 text-[10px] flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> No Date</span>}
                          </button>
                          {editingTodoDateId === todo.id && (
                            <div className="absolute top-6 left-0 z-[60] bg-white border border-gray-200 shadow-2xl rounded-lg p-2">
                              <div className="flex justify-between items-center mb-2 px-2 pt-1 border-b border-gray-100 pb-2">
                                <span className="text-sm font-medium text-gray-700">Change date</span>
                                <button onClick={() => setEditingTodoDateId(null)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-md">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <DayPicker
                                mode="single"
                                selected={todo.dueDate ? new Date(todo.dueDate) : undefined}
                                onSelect={(date) => {
                                  todoService.updateTodo(todo.id, { dueDate: date ? date.getTime() : null });
                                  setEditingTodoDateId(null);
                                }}
                              />
                              {todo.dueDate && (
                                <div className="border-t border-gray-100 pt-2 mt-2">
                                  <button
                                    onClick={() => {
                                      todoService.updateTodo(todo.id, { dueDate: null });
                                      setEditingTodoDateId(null);
                                    }}
                                    className="w-full text-center text-xs text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors font-medium "
                                  >
                                    Clear due date
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <button 
                            onClick={() => { setEditingTodoDeadlineId(todo.id); setEditingTodoDateId(null); }}
                            className="hover:bg-gray-100 rounded px-1 -ml-1 transition-colors flex items-center h-5"
                          >
                            {formatTaskDeadline(todo.deadline) || <span className="text-gray-400 text-[10px] flex items-center"><Clock className="w-3 h-3 mr-1" /> No Deadline</span>}
                          </button>
                          {editingTodoDeadlineId === todo.id && (
                            <div className="absolute top-6 left-0 z-[60] bg-white border border-gray-200 shadow-2xl rounded-lg p-2">
                              <div className="flex justify-between items-center mb-2 px-2 pt-1 border-b border-gray-100 pb-2">
                                <span className="text-sm font-medium text-gray-700">Change deadline</span>
                                <button onClick={() => setEditingTodoDeadlineId(null)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-md">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <DayPicker
                                mode="single"
                                selected={todo.deadline ? new Date(todo.deadline) : undefined}
                                onSelect={(date) => {
                                  todoService.updateTodo(todo.id, { deadline: date ? date.getTime() : null });
                                  setEditingTodoDeadlineId(null);
                                }}
                              />
                              {todo.deadline && (
                                <div className="border-t border-gray-100 pt-2 mt-2">
                                  <button
                                    onClick={() => {
                                      todoService.updateTodo(todo.id, { deadline: null });
                                      setEditingTodoDeadlineId(null);
                                    }}
                                    className="w-full text-center text-xs text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-md transition-colors font-medium "
                                  >
                                    Clear deadline
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {todo.projectId && todo.projectId !== 'inbox' && (
                          <span className="text-[10px] text-gray-500 flex items-center">
                            <Hash className="w-3 h-3 mr-0.5" /> 
                            {projects.find(p => p.id === todo.projectId)?.name || 'Project'}
                          </span>
                        )}
                        <Flag className={`w-3 h-3 ${getPriorityColor(todo.priority)}`} />
                        {todo.repeat && todo.repeat !== 'none' && (
                          <span className="text-[10px] text-purple-500 flex items-center capitalize">
                            <Repeat className="w-3 h-3 mr-0.5" />
                            {todo.repeat}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                      {viewMode === 'trash' && (
                        <button 
                          onClick={(e) => handleRestoreTodo(todo.id, e)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Restore task"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDeleteTodo(todo.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title={viewMode === 'trash' ? "Delete permanently" : "Move to trash"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredTodos.length === 0 && !isAddingTask && (
                <div className="text-center py-20 flex flex-col items-center">
                  <div className="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Check className="w-16 h-16 text-gray-200" />
                  </div>
                  <h3 className="text-lg text-gray-700 font-medium mb-2">You're all done</h3>
                  <p className="text-sm text-gray-500">Enjoy the rest of your day and relax.</p>
                </div>
              )}
            </div>
          )}

          {viewMode !== 'trends' && !isAddingTask && (
            <button 
              onClick={() => setIsAddingTask(true)}
              className="group flex items-center text-[#202020] hover:text-primary mt-4 w-full py-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <div className="w-5 h-5 flex items-center justify-center rounded-full text-primary mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-sm">Add task</span>
            </button>
          )}

          {viewMode !== 'trends' && isAddingTask && (
            <div className="mt-4 border border-border bg-white rounded-xl shadow-lg p-3">
              <input
                autoFocus
                type="text"
                placeholder="Task name"
                value={newTaskTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewTaskTitle(val);
                  const lower = val.toLowerCase();
                  if (/\bhourly\b/.test(lower)) setNewTaskRepeat('hourly');
                  else if (/\bdaily\b/.test(lower)) setNewTaskRepeat('daily');
                  else if (/\bweekly\b/.test(lower)) setNewTaskRepeat('weekly');
                  else if (/\bmonthly\b/.test(lower)) setNewTaskRepeat('monthly');
                  else if (/\byearly\b/.test(lower)) setNewTaskRepeat('yearly');
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
                className="w-full font-medium text-[#202020] text-sm outline-none placeholder:text-gray-400 mb-1"
              />
              <textarea
                placeholder="Description"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full text-xs text-gray-600 outline-none placeholder:text-gray-400 resize-none h-10 mb-3"
              />
              
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Due Date Picker Button */}
                <div className="relative">
                  <button 
                    onClick={() => { setShowDatePicker(!showDatePicker); setShowDeadlinePicker(false); setShowPriorityPicker(false); setShowRepeatPicker(false); setShowProjectPicker(false); }}
                    className={`flex items-center px-2 py-1.5 text-xs font-medium border rounded-md transition ${showDatePicker ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'}`}
                  >
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                    {newTaskDueDate ? (isToday(newTaskDueDate) ? 'Today' : format(newTaskDueDate, 'MMM d')) : 'Due date'}
                    <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-gray-400" />
                  </button>
                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-2 w-auto animate-in fade-in zoom-in-95 duration-200">
                      <DayPicker 
                        mode="single" 
                        selected={newTaskDueDate} 
                        onSelect={(d) => { setNewTaskDueDate(d); setShowDatePicker(false); }} 
                      />
                    </div>
                  )}
                </div>

                {/* Deadline Picker Button */}
                <div className="relative">
                  <button 
                    onClick={() => { setShowDeadlinePicker(!showDeadlinePicker); setShowDatePicker(false); setShowPriorityPicker(false); setShowRepeatPicker(false); setShowProjectPicker(false); }}
                    className={`flex items-center px-2 py-1.5 text-xs font-medium border rounded-md transition ${showDeadlinePicker ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                    {newTaskDeadline ? (isToday(newTaskDeadline) ? 'Today Deadline' : format(newTaskDeadline, 'MMM d')) : 'Deadline'}
                    <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-gray-400" />
                  </button>
                  {showDeadlinePicker && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-2 w-auto animate-in fade-in zoom-in-95 duration-200">
                      <DayPicker 
                        mode="single" 
                        selected={newTaskDeadline} 
                        onSelect={(d) => { setNewTaskDeadline(d); setShowDeadlinePicker(false); }} 
                      />
                    </div>
                  )}
                </div>

                {/* Priority Picker Button */}
                <div className="relative">
                  <button 
                    onClick={() => { setShowPriorityPicker(!showPriorityPicker); setShowDatePicker(false); setShowDeadlinePicker(false); setShowRepeatPicker(false); setShowProjectPicker(false); }}
                    className={`flex items-center px-2 py-1.5 text-xs font-medium border rounded-md transition ${showPriorityPicker ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Flag className={`w-3.5 h-3.5 mr-1.5 ${getPriorityColor(newTaskPriority)}`} />
                    Priority {newTaskPriority}
                    <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-gray-400" />
                  </button>
                  {showPriorityPicker && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-40 animate-in fade-in zoom-in-95 duration-200">
                      {[1, 2, 3, 4].map(p => (
                        <button 
                          key={p} 
                          onClick={() => { setNewTaskPriority(p); setShowPriorityPicker(false); }}
                          className="w-full flex items-center px-3 py-2 text-xs hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <Flag className={`w-3.5 h-3.5 mr-2 ${getPriorityColor(p)}`} />
                          Priority {p}
                          {newTaskPriority === p && <Check className="w-4 h-4 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Repeat Picker Button */}
                <div className="relative">
                  <button 
                    onClick={() => { setShowRepeatPicker(!showRepeatPicker); setShowDatePicker(false); setShowDeadlinePicker(false); setShowPriorityPicker(false); setShowProjectPicker(false); }}
                    className={`flex items-center px-2 py-1.5 text-xs font-medium border rounded-md transition ${showRepeatPicker ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Repeat className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                    {newTaskRepeat === 'none' ? 'Repeat' : newTaskRepeat.charAt(0).toUpperCase() + newTaskRepeat.slice(1)}
                    <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-gray-400" />
                  </button>
                  {showRepeatPicker && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-32 animate-in fade-in zoom-in-95 duration-200">
                      {['none', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'].map(r => (
                        <button 
                          key={r} 
                          onClick={() => { setNewTaskRepeat(r as any); setShowRepeatPicker(false); }}
                          className="w-full flex items-center px-3 py-2 text-xs hover:bg-gray-50 rounded-md transition-colors"
                        >
                          {r === 'none' ? 'None' : r.charAt(0).toUpperCase() + r.slice(1)}
                          {newTaskRepeat === r && <Check className="w-4 h-4 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                {/* Project Picker Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => { setShowProjectPicker(!showProjectPicker); setShowDatePicker(false); setShowDeadlinePicker(false); setShowPriorityPicker(false); setShowRepeatPicker(false); }}
                    className={`flex items-center px-3 py-1.5 text-xs font-medium border rounded-md transition ${showProjectPicker ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'}`}
                  >
                    <Inbox className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    {newTaskProject === 'inbox' ? 'Inbox' : (projects.find(p => p.id === newTaskProject)?.name || 'Inbox')}
                    <ChevronDown className="w-3.5 h-3.5 ml-2 text-gray-400" />
                  </button>
                  {showProjectPicker && (
                    <div className="absolute bottom-full left-0 mb-1 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-1 w-48 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                      <button 
                        onClick={() => { setNewTaskProject('inbox'); setShowProjectPicker(false); }}
                        className="w-full flex items-center px-3 py-2 text-xs hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <Inbox className="w-3.5 h-3.5 mr-2 text-primary" />
                        Inbox
                        {newTaskProject === 'inbox' && <Check className="w-4 h-4 ml-auto text-primary" />}
                      </button>
                      {projects.length > 0 && <div className="h-px bg-gray-100 my-1 mx-2" />}
                      {projects.map(p => (
                        <button 
                          key={p.id} 
                          onClick={() => { setNewTaskProject(p.id); setShowProjectPicker(false); }}
                          className="w-full flex items-center px-3 py-2 text-xs hover:bg-gray-50 rounded-md transition-colors"
                        >
                          {renderIcon(p.icon, p.color, "w-3.5 h-3.5 mr-2")}
                          <span className="truncate">{p.name}</span>
                          {newTaskProject === p.id && <Check className="w-4 h-4 ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setIsAddingTask(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-primary disabled:opacity-50 hover:bg-secondary rounded-md shadow-sm transition"
                  >
                    Add task
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Task Details Modal */}
      <AnimatePresence>
        {selectedTodoId && (
          <div className="fixed inset-0 z-[80] flex justify-end bg-black/20 p-0 sm:p-4 backdrop-blur-sm" onClick={() => setSelectedTodoId(null)}>
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="bg-white w-full sm:w-[450px] shadow-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl flex flex-col overflow-hidden"
            >
              {(() => {
                const todo = todos.find(t => t.id === selectedTodoId);
                if (!todo) return null;
                return (
                  <>
                    <div className="flex items-center justify-between border-b border-gray-100 p-4">
                      <div className="flex items-center text-sm font-medium text-gray-500">
                        {todo.projectId && todo.projectId !== 'inbox' 
                          ? <><Folder className="w-4 h-4 mr-2" />{projects.find(p => p.id === todo.projectId)?.name}</>
                          : <><Inbox className="w-4 h-4 mr-2" />Inbox</>
                        }
                      </div>
                      <button onClick={() => setSelectedTodoId(null)} className="p-2 hover:bg-gray-100 rounded-md text-gray-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="flex items-start">
                        <button 
                          onClick={() => handleToggleTodo(todo)}
                          className="mr-3 mt-1 w-5 h-5 flex shrink-0 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                        >
                          {todo.completed && <Check className="w-3 h-3 text-primary" />}
                        </button>
                        <input
                           className={`text-xl font-semibold outline-none w-full bg-transparent ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                           value={todo.title}
                           onChange={(e) => todoService.updateTodo(todo.id, { title: e.target.value })}
                        />
                      </div>
                      
                      <div className="mt-6 space-y-4">
                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description / Notes</label>
                          <textarea
                            placeholder="Add extra details or markdown notes here..."
                            className="w-full text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 focus:bg-white border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg p-3 min-h-[100px] outline-none transition-colors resize-none"
                            value={todo.description || ''}
                            onChange={(e) => todoService.updateTodo(todo.id, { description: e.target.value })}
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</label>
                          <div className="flex flex-wrap gap-2">
                             {todo.tags?.map(tag => (
                               <span key={tag} className="flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200">
                                 #{tag}
                                 <button 
                                   onClick={() => todoService.updateTodo(todo.id, { tags: todo.tags?.filter(t => t !== tag) })}
                                   className="ml-1 text-gray-400 hover:text-red-500"
                                 >
                                   <X className="w-3 h-3" />
                                 </button>
                               </span>
                             ))}
                             <input 
                               type="text" 
                               placeholder="Add tag and press Enter"
                               className="text-xs outline-none bg-transparent border-b border-dashed border-gray-300 focus:border-primary py-1 w-32"
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                   const newTag = e.currentTarget.value.trim().replace(/^#/, '');
                                   const currentTags = todo.tags || [];
                                   if (!currentTags.includes(newTag)) {
                                     todoService.updateTodo(todo.id, { tags: [...currentTags, newTag] });
                                   }
                                   e.currentTarget.value = '';
                                 }
                               }}
                             />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subtasks</label>
                          <div className="space-y-2">
                            {todo.subtasks?.map(subtask => (
                              <div key={subtask.id} className="flex items-center group">
                                <button 
                                  onClick={() => {
                                    const newSubtasks = todo.subtasks?.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s);
                                    todoService.updateTodo(todo.id, { subtasks: newSubtasks });
                                  }}
                                  className={`mr-2 w-4 h-4 flex shrink-0 items-center justify-center rounded border ${subtask.completed ? 'bg-primary border-primary' : 'border-gray-300'}`}
                                >
                                  {subtask.completed && <Check className="w-3 h-3 text-white" />}
                                </button>
                                <input
                                  type="text"
                                  className={`flex-1 text-sm outline-none bg-transparent ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                                  value={subtask.title}
                                  onChange={(e) => {
                                    const newSubtasks = todo.subtasks?.map(s => s.id === subtask.id ? { ...s, title: e.target.value } : s);
                                    todoService.updateTodo(todo.id, { subtasks: newSubtasks });
                                  }}
                                />
                                <button 
                                  onClick={() => {
                                    todoService.updateTodo(todo.id, { subtasks: todo.subtasks?.filter(s => s.id !== subtask.id) });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <div className="flex items-center mt-2">
                              <Plus className="w-4 h-4 mr-2 text-primary" />
                              <input 
                                type="text"
                                placeholder="Add a subtask..."
                                className="text-sm outline-none bg-transparent flex-1 placeholder:text-primary"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const newSubtask = { id: Date.now().toString(), title: e.currentTarget.value.trim(), completed: false };
                                    todoService.updateTodo(todo.id, { subtasks: [...(todo.subtasks || []), newSubtask] });
                                    e.currentTarget.value = '';
                                  }
                                }}
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

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Action</h3>
              <p className="text-sm text-gray-600 mb-6">{confirmDialog.message}</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
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
