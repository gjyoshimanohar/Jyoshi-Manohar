import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, X, Plus, Trash2, Edit3, Check, Layers, AlertCircle, 
  Sparkles, Tag, ArrowRight, ListCheck, Folder, BookmarkPlus, CheckCircle2 
} from 'lucide-react';
import { TaskTemplate, Project, Todo } from '../types';
import { templateService } from '../services/templateService';
import { todoService } from '../services/todoService';
import { auth } from '../lib/firebase';

interface TaskTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TaskTemplate[];
  projects: Project[];
  onApplyTemplate?: (template: TaskTemplate) => void;
  sourceTask?: Todo | null; // Optional task to convert into a template
}

export default function TaskTemplatesModal({
  isOpen,
  onClose,
  templates,
  projects,
  onApplyTemplate,
  sourceTask,
}: TaskTemplatesModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  // Form State for Create / Edit
  const [templateName, setTemplateName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('inbox');
  const [priority, setPriority] = useState<number>(4);
  const [subtasks, setSubtasks] = useState<string[]>(['']);
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pre-fill form if sourceTask is provided or when editing
  React.useEffect(() => {
    if (sourceTask) {
      setActiveTab('create');
      setEditingTemplate(null);
      setTemplateName(sourceTask.title ? `${sourceTask.title} Template` : 'New Task Template');
      setTaskTitle(sourceTask.title || '');
      setDescription(sourceTask.description || '');
      setProjectId(sourceTask.projectId || 'inbox');
      setPriority(sourceTask.priority || 4);
      setSubtasks(
        sourceTask.subtasks && sourceTask.subtasks.length > 0
          ? sourceTask.subtasks.map((s) => s.title)
          : ['']
      );
      setTagsInput(sourceTask.tags ? sourceTask.tags.join(', ') : '');
    } else {
      resetForm();
    }
  }, [sourceTask, isOpen]);

  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTaskTitle('');
    setDescription('');
    setProjectId('inbox');
    setPriority(4);
    setSubtasks(['']);
    setTagsInput('');
  };

  const handleStartEdit = (tpl: TaskTemplate) => {
    setEditingTemplate(tpl);
    setTemplateName(tpl.name);
    setTaskTitle(tpl.title);
    setDescription(tpl.description || '');
    setProjectId(tpl.projectId || 'inbox');
    setPriority(tpl.priority || 4);
    setSubtasks(
      tpl.subtasks && tpl.subtasks.length > 0
        ? tpl.subtasks.map((s) => s.title)
        : ['']
    );
    setTagsInput(tpl.tags ? tpl.tags.join(', ') : '');
    setActiveTab('create');
  };

  const handleAddSubtaskField = () => {
    setSubtasks((prev) => [...prev, '']);
  };

  const handleRemoveSubtaskField = (index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubtaskChange = (index: number, val: string) => {
    setSubtasks((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !taskTitle.trim() || !auth.currentUser) return;

    setIsSaving(true);
    const validSubtasks = subtasks
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((title) => ({ title }));

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      if (editingTemplate) {
        await templateService.updateTemplate(editingTemplate.id, {
          name: templateName.trim(),
          title: taskTitle.trim(),
          description: description.trim() || undefined,
          projectId: projectId || 'inbox',
          priority: priority,
          subtasks: validSubtasks,
          tags: parsedTags,
        });
        showToast('Template updated successfully!');
      } else {
        await templateService.createTemplate({
          userId: auth.currentUser.uid,
          name: templateName.trim(),
          title: taskTitle.trim(),
          description: description.trim() || undefined,
          projectId: projectId || 'inbox',
          priority: priority,
          subtasks: validSubtasks,
          tags: parsedTags,
        });
        showToast('Template created successfully!');
      }

      resetForm();
      setActiveTab('list');
    } catch (err) {
      console.error('Failed to save template', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await templateService.deleteTemplate(id);
      showToast('Template deleted.');
    } catch (err) {
      console.error('Failed to delete template', err);
    }
  };

  const handleInstantiateTask = async (tpl: TaskTemplate) => {
    if (!auth.currentUser) return;
    try {
      const formattedSubtasks = tpl.subtasks?.map((s, idx) => ({
        id: `subtask-${Date.now()}-${idx}`,
        title: s.title,
        completed: false,
      }));

      await todoService.createTodo({
        userId: auth.currentUser.uid,
        title: tpl.title,
        description: tpl.description || '',
        projectId: tpl.projectId || 'inbox',
        priority: tpl.priority || 4,
        completed: false,
        subtasks: formattedSubtasks || [],
        tags: tpl.tags || [],
      });

      if (onApplyTemplate) {
        onApplyTemplate(tpl);
      }

      showToast(`Task created from "${tpl.name}"!`);
    } catch (err) {
      console.error('Failed to create task from template', err);
    }
  };

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
                <BookmarkPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Task Templates</h3>
                <p className="text-xs text-slate-500">Save and quickly spawn recurring task configurations</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Notice */}
          {successMessage && (
            <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-800 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 px-6 bg-white gap-6">
            <button
              onClick={() => {
                setActiveTab('list');
                resetForm();
              }}
              className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'list'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Saved Templates ({templates.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                if (!editingTemplate && !sourceTask) resetForm();
              }}
              className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'create'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'list' ? (
              templates.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <BookmarkPlus className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Task Templates Saved</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Create reusable task templates with pre-set titles, priorities, projects, and subtasks for rapid task creation.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {templates.map((tpl) => {
                    const proj = projects.find((p) => p.id === tpl.projectId);
                    return (
                      <div
                        key={tpl.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-indigo-200 bg-white shadow-sm transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-800">{tpl.name}</h4>
                              {proj && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                  <Folder className="w-3 h-3 text-slate-400" />
                                  {proj.name}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  tpl.priority === 1
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : tpl.priority === 2
                                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                    : tpl.priority === 3
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}
                              >
                                {tpl.priority === 1
                                  ? 'P1 - Urgent'
                                  : tpl.priority === 2
                                  ? 'P2 - High'
                                  : tpl.priority === 3
                                  ? 'P3 - Medium'
                                  : 'P4 - Low'}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-indigo-950 mt-1 flex items-center gap-1.5">
                              <span className="text-slate-400 font-normal">Task Title:</span> {tpl.title}
                            </p>

                            {tpl.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {tpl.description}
                              </p>
                            )}

                            {tpl.subtasks && tpl.subtasks.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                                {tpl.subtasks.map((st, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md"
                                  >
                                    <ListCheck className="w-3 h-3 text-slate-400" />
                                    {st.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEdit(tpl)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Edit Template"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Delete Template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                          <span className="text-[10px] text-slate-400">
                            {tpl.subtasks?.length || 0} subtasks configured
                          </span>
                          <button
                            onClick={() => handleInstantiateTask(tpl)}
                            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                          >
                            Use Template
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Create / Edit Form */
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Template Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Client Onboarding Checklist"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Target Project
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    >
                      <option value="inbox">Inbox</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Default Task Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Send Welcome Email & Setup Folder"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Task Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detailed steps or guidance for this task..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    >
                      <option value={1}>P1 - Urgent</option>
                      <option value={2}>P2 - High</option>
                      <option value={3}>P3 - Medium</option>
                      <option value={4}>P4 - Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tags (Comma Separated)
                    </label>
                    <input
                      type="text"
                      placeholder="audit, client, monthly"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                {/* Subtasks Section */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Pre-configured Subtasks ({subtasks.filter((s) => s.trim()).length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSubtaskField}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Subtask
                    </button>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {subtasks.map((st, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-5 text-right">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          placeholder={`Subtask ${idx + 1} title`}
                          value={st}
                          onChange={(e) => handleSubtaskChange(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        {subtasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtaskField(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !templateName.trim() || !taskTitle.trim()}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    {editingTemplate ? 'Update Template' : 'Save Task Template'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
