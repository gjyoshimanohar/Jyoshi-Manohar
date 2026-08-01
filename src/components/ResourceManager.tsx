import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Resource } from '../types';
import { resourceService } from '../services/resourceService';
import { Plus, Trash2, Save, X, Edit, Loader2, Download } from 'lucide-react';
import CustomSelect from './CustomSelect';
import toast from 'react-hot-toast';

export default function ResourceManager() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingResource, setEditingResource] = useState<Partial<Resource> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const fetchedResources = await resourceService.getAllResources();
      setResources(fetchedResources);
    } catch (error) {
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource?.title || !editingResource?.downloadUrl || !editingResource?.type) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setSaving(true);
    try {
      if (editingResource.id) {
        await resourceService.updateResource(editingResource.id, editingResource);
        toast.success("Resource updated successfully!");
      } else {
        await resourceService.createResource({
          title: editingResource.title,
          type: editingResource.type as "whitepaper" | "report" | "guide",
          description: editingResource.description || "",
          fileSize: editingResource.fileSize || "0 MB",
          fileFormat: editingResource.fileFormat || "PDF",
          downloadUrl: editingResource.downloadUrl
        });
        toast.success("Resource created successfully!");
      }
      setEditingResource(null);
      await loadResources();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save resource");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await resourceService.deleteResource(id);
      toast.success("Resource deleted");
      setConfirmDeleteId(null);
      await loadResources();
    } catch (error) {
      toast.error("Failed to delete resource");
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center w-full">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {editingResource ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 md:p-12 border border-border mb-12 shadow-sm"
        >
          <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-4">
            <h2 className="text-2xl text-primary font-bold">
              {editingResource.id ? "Edit Resource" : "Create New Resource"}
            </h2>
            <button
              onClick={() => setEditingResource(null)}
              className="text-slate-500 hover:text-red-500 transition-colors flex items-center space-x-2 uppercase text-xs tracking-widest font-bold"
              type="button"
            >
              <span>Discard Changes</span>
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-700 font-bold mb-2">
                  Title *
                </label>
                <input
                  required
                  type="text"
                  value={editingResource.title || ""}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g. Union Budget Analysis 2026-27"
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-700 font-bold mb-2">
                  Resource Type *
                </label>
                <CustomSelect
                  value={editingResource.type || "whitepaper"}
                  onChange={(val) => setEditingResource({ ...editingResource, type: val as any })}
                  options={[
                    { value: 'whitepaper', label: 'Whitepaper' },
                    { value: 'report', label: 'Report' },
                    { value: 'guide', label: 'Guide' }
                  ]}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus-within:ring-2 focus-within:ring-primary h-[46px]"
                  
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-widest text-slate-700 font-bold mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingResource.description || ""}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Brief summary of the resource content..."
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-700 font-bold mb-2">
                  Download URL *
                </label>
                <input
                  required
                  type="url"
                  value={editingResource.downloadUrl || ""}
                  onChange={(e) => setEditingResource({ ...editingResource, downloadUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-700 font-bold mb-2">
                  File Size (e.g., 4.2 MB)
                </label>
                <input
                  type="text"
                  value={editingResource.fileSize || ""}
                  onChange={(e) => setEditingResource({ ...editingResource, fileSize: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="4.2 MB"
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-700 font-bold mb-2">
                  File Format (e.g., PDF)
                </label>
                <input
                  type="text"
                  value={editingResource.fileFormat || ""}
                  onChange={(e) => setEditingResource({ ...editingResource, fileFormat: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="PDF"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary text-white py-3 px-8 uppercase text-xs tracking-widest hover:bg-secondary transition-all flex items-center space-x-3 rounded-full font-bold shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save Resource</span>
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <div className="bg-white p-8 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <h2 className="text-2xl font-bold text-primary">Manage Resources</h2>
            <button
              onClick={() => setEditingResource({ type: 'whitepaper', fileFormat: 'PDF', fileSize: '1.0 MB' })}
              className="bg-primary text-white py-2.5 px-6 uppercase text-xs tracking-widest hover:bg-secondary transition-all flex items-center space-x-2 rounded-full font-bold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Resource</span>
            </button>
          </div>

          <div className="space-y-4">
            {resources.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <Download className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No resources found.</p>
                <p className="text-slate-400 text-sm mt-1">Create one to get started.</p>
              </div>
            ) : (
              resources.map((resource) => (
                <div
                  key={resource.id}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-slate-200 hover:border-primary/30 hover:shadow-md transition-all rounded-xl"
                >
                  <div className="mb-4 md:mb-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">
                        {resource.type}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{resource.fileFormat} • {resource.fileSize}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {resource.title}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingResource(resource)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    {confirmDeleteId === resource.id ? (
                      <div className="flex items-center space-x-2 bg-red-50 p-1 rounded-full border border-red-100">
                        <span className="text-xs text-red-600 font-bold px-2">Sure?</span>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(resource.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
