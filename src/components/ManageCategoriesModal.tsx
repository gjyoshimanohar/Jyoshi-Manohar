import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Folder, Project, TaskCategory, Todo } from "../types";
import { DEFAULT_TASK_CATEGORIES, getCategoryBadgeStyle } from "../utils/categoryUtils";
import { todoService } from "../services/todoService";
import {
  Tag,
  Plus,
  X,
  Trash2,
  Folder as FolderIcon,
  Check,
  Sparkles,
  Layers,
  Edit2,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  projects: Project[];
  todos: Todo[];
  activeFolderId?: string | null;
  activeProjectId?: string | null;
}

const COLOR_PRESETS = [
  { name: "Indigo", hex: "#6366f1", bg: "bg-indigo-500" },
  { name: "Rose", hex: "#f43f5e", bg: "bg-rose-500" },
  { name: "Purple", hex: "#a855f7", bg: "bg-purple-500" },
  { name: "Amber", hex: "#f59e0b", bg: "bg-amber-500" },
  { name: "Cyan", hex: "#06b6d4", bg: "bg-cyan-500" },
  { name: "Emerald", hex: "#10b981", bg: "bg-emerald-500" },
  { name: "Blue", hex: "#3b82f6", bg: "bg-blue-500" },
  { name: "Slate", hex: "#64748b", bg: "bg-slate-500" },
];

const EMOJI_PRESETS = ["🚀", "🐛", "🎨", "🔬", "📄", "🧪", "👀", "⚙️", "⚡", "🎯", "🔥", "💡", "🛠️", "📌", "📦"];

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  folders,
  projects,
  todos,
  activeFolderId,
  activeProjectId,
}) => {
  const [selectedScope, setSelectedScope] = useState<"folder" | "project" | "global">(
    activeFolderId ? "folder" : activeProjectId ? "project" : "global"
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    activeFolderId || activeProjectId || (folders[0]?.id || projects[0]?.id || "global")
  );

  // Form State for creating / editing sub-type category
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("🏷️");
  const [catColor, setCatColor] = useState("#6366f1");
  const [catDesc, setCatDesc] = useState("");

  if (!isOpen) return null;

  const currentFolder = folders.find((f) => f.id === selectedTargetId);
  const currentProject = projects.find((p) => p.id === selectedTargetId);

  // Get categories based on selectedScope
  const scopeCategories: TaskCategory[] =
    selectedScope === "folder"
      ? currentFolder?.categories || []
      : selectedScope === "project"
      ? currentProject?.categories || []
      : [];

  const handleOpenCreateForm = () => {
    setEditingCatId(null);
    setCatName("");
    setCatIcon("⚡");
    setCatColor("#6366f1");
    setCatDesc("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (cat: TaskCategory) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon || "🏷️");
    setCatColor(cat.color);
    setCatDesc(cat.description || "");
    setIsFormOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      toast.error("Category name is required.");
      return;
    }

    const catId = editingCatId || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCatObj: TaskCategory = {
      id: catId,
      name: catName.trim(),
      color: catColor,
      icon: catIcon,
      description: catDesc.trim(),
      folderId: selectedScope === "folder" ? selectedTargetId : null,
      projectId: selectedScope === "project" ? selectedTargetId : null,
      createdAt: Date.now(),
    };

    if (selectedScope === "folder" && currentFolder) {
      const existing = currentFolder.categories || [];
      const updated = editingCatId
        ? existing.map((c) => (c.id === editingCatId ? newCatObj : c))
        : [...existing, newCatObj];

      await todoService.updateFolder(currentFolder.id, { categories: updated });
      toast.success(editingCatId ? "Folder Sub-Type updated!" : "New Folder Sub-Type created!");
    } else if (selectedScope === "project" && currentProject) {
      const existing = currentProject.categories || [];
      const updated = editingCatId
        ? existing.map((c) => (c.id === editingCatId ? newCatObj : c))
        : [...existing, newCatObj];

      await todoService.updateProject(currentProject.id, { categories: updated });
      toast.success(editingCatId ? "Project Sub-Type updated!" : "New Project Sub-Type created!");
    }

    setIsFormOpen(false);
    setCatName("");
    setCatDesc("");
  };

  const handleDeleteCategory = async (catId: string) => {
    if (selectedScope === "folder" && currentFolder) {
      const updated = (currentFolder.categories || []).filter((c) => c.id !== catId);
      await todoService.updateFolder(currentFolder.id, { categories: updated });
      toast.success("Folder Sub-Type deleted.");
    } else if (selectedScope === "project" && currentProject) {
      const updated = (currentProject.categories || []).filter((c) => c.id !== catId);
      await todoService.updateProject(currentProject.id, { categories: updated });
      toast.success("Project Sub-Type deleted.");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Task Categories & Sub-Types</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                    Granular Classification
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define custom sub-types inside project folders for deeper Trends & Analytics.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Scope Selection Pills */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FolderIcon className="w-3.5 h-3.5 text-indigo-600" /> Select Target Scope:
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => {
                    setSelectedScope("folder");
                    if (folders.length > 0) setSelectedTargetId(folders[0].id);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedScope === "folder" ? "bg-white text-indigo-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FolderIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Folder Sub-Types ({folders.length})</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedScope("project");
                    if (projects.length > 0) setSelectedTargetId(projects[0].id);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedScope === "project" ? "bg-white text-indigo-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Project Sub-Types ({projects.length})</span>
                </button>
                <button
                  onClick={() => setSelectedScope("global")}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedScope === "global" ? "bg-white text-indigo-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Default System Types ({DEFAULT_TASK_CATEGORIES.length})</span>
                </button>
              </div>
            </div>

            {/* Folder or Project Picker */}
            {selectedScope === "folder" && folders.length > 0 && (
              <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3">
                <span className="text-xs font-bold text-slate-700 shrink-0">Folder:</span>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name} ({f.categories?.length || 0} sub-types)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedScope === "project" && projects.length > 0 && (
              <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-3">
                <span className="text-xs font-bold text-slate-700 shrink-0">Project:</span>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      📊 {p.name} ({p.categories?.length || 0} sub-types)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Form for Creating / Editing Sub-Type */}
            {isFormOpen ? (
              <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    {editingCatId ? "Edit Sub-Type Category" : "Define New Custom Sub-Type"}
                  </h4>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Sub-Type Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Critical Patch, Security Audit, Design System"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Icon / Emoji
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={catIcon}
                        onChange={(e) => setCatIcon(e.target.value)}
                        className="w-12 text-center text-sm bg-white border border-slate-200 rounded-xl py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar max-w-[200px]">
                        {EMOJI_PRESETS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setCatIcon(em)}
                            className="p-1 hover:bg-slate-200 rounded-lg text-xs cursor-pointer"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Badge Color Preset
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((cp) => (
                      <button
                        key={cp.hex}
                        type="button"
                        onClick={() => setCatColor(cp.hex)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer ${
                          cp.bg
                        } ${catColor === cp.hex ? "ring-2 ring-offset-2 ring-indigo-600 scale-105" : "opacity-80 hover:opacity-100"}`}
                      >
                        {catColor === cp.hex && <Check className="w-3 h-3 text-white" />}
                        <span>{cp.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Description / Analytics Context
                  </label>
                  <input
                    type="text"
                    placeholder="Short description for Trends reports..."
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Sub-Type</span>
                  </button>
                </div>
              </div>
            ) : (
              selectedScope !== "global" && (
                <button
                  onClick={handleOpenCreateForm}
                  className="w-full py-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/70 rounded-2xl text-xs font-bold text-indigo-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>
                    Add Sub-Type Category to {selectedScope === "folder" ? currentFolder?.name || "Folder" : currentProject?.name || "Project"}
                  </span>
                </button>
              )
            )}

            {/* List of Configured Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Configured Sub-Types ({selectedScope === "global" ? DEFAULT_TASK_CATEGORIES.length : scopeCategories.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  {selectedScope === "global"
                    ? "Built-in System Sub-Types"
                    : `Active in ${selectedScope === "folder" ? currentFolder?.name : currentProject?.name}`}
                </span>
              </div>

              {(selectedScope === "global" ? DEFAULT_TASK_CATEGORIES : scopeCategories).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <Info className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No custom sub-types defined yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Click "Add Sub-Type Category" above to create sub-types like "Critical Bug", "Feature Request", or "User Research" for granular analytics.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(selectedScope === "global" ? DEFAULT_TASK_CATEGORIES : scopeCategories).map((cat) => {
                    const style = getCategoryBadgeStyle(cat.color);
                    const matchingTasks = todos.filter(
                      (t) =>
                        t.category?.toLowerCase() === cat.id.toLowerCase() ||
                        t.category?.toLowerCase() === cat.name.toLowerCase()
                    );
                    const completedCount = matchingTasks.filter((t) => t.completed).length;

                    return (
                      <div
                        key={cat.id}
                        className="p-3.5 bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl shadow-2xs space-y-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold border ${style.bg} ${style.text} ${style.border}`}
                            >
                              <span>{cat.icon || "🏷️"}</span>
                              <span>{cat.name}</span>
                            </span>
                          </div>

                          {selectedScope !== "global" && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditForm(cat)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Sub-Type"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Sub-Type"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {cat.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">{cat.description}</p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>Total Tasks: {matchingTasks.length}</span>
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            {completedCount} resolved
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Sub-types are saved to your Firestore database and synced live.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
