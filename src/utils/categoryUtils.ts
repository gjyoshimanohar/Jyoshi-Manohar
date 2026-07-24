import { TaskCategory, Folder, Project } from "../types";

export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [
  { id: "feature", name: "Feature", color: "#6366f1", icon: "🚀", description: "New product functionality & user-facing features" },
  { id: "bug", name: "Bug Fix", color: "#f43f5e", icon: "🐛", description: "Defect resolution, software bugs & error fixes" },
  { id: "design", name: "Design & UX", color: "#a855f7", icon: "🎨", description: "UI mockups, design specs & user experience polish" },
  { id: "research", name: "Research & Spike", color: "#f59e0b", icon: "🔬", description: "Technical spike, discovery & architecture evaluation" },
  { id: "documentation", name: "Documentation", color: "#06b6d4", icon: "📄", description: "API docs, user guides & codebase documentation" },
  { id: "testing", name: "Testing & QA", color: "#10b981", icon: "🧪", description: "Unit/integration tests, QA verification & test suites" },
  { id: "review", name: "Code Review", color: "#3b82f6", icon: "👀", description: "PR reviews, code inspection & security audits" },
  { id: "operations", name: "Operations & Infra", color: "#64748b", icon: "⚙️", description: "DevOps, deployment pipelines, database & cloud infra" },
];

export function getCategoryDetails(
  categoryIdOrName: string | undefined,
  customCategories: TaskCategory[] = []
): TaskCategory | null {
  if (!categoryIdOrName) return null;

  const lower = categoryIdOrName.toLowerCase();

  // Check custom categories first
  const custom = customCategories.find(
    (c) => c.id.toLowerCase() === lower || c.name.toLowerCase() === lower
  );
  if (custom) return custom;

  // Check default system categories
  const defaultCat = DEFAULT_TASK_CATEGORIES.find(
    (c) => c.id.toLowerCase() === lower || c.name.toLowerCase() === lower
  );
  if (defaultCat) return defaultCat;

  // Fallback for custom user strings
  return {
    id: categoryIdOrName,
    name: categoryIdOrName,
    color: "#8b5cf6", // Default violet
    icon: "🏷️",
    description: "Custom Category",
  };
}

export function getAllCategoriesForScope({
  folders = [],
  projects = [],
  selectedFolderId,
  selectedProjectId,
}: {
  folders?: Folder[];
  projects?: Project[];
  selectedFolderId?: string | null;
  selectedProjectId?: string | null;
}): TaskCategory[] {
  const categoriesMap = new Map<string, TaskCategory>();

  // Add default system categories
  DEFAULT_TASK_CATEGORIES.forEach((cat) => {
    categoriesMap.set(cat.id.toLowerCase(), cat);
  });

  // Collect folder categories
  folders.forEach((f) => {
    if (f.categories && Array.isArray(f.categories)) {
      f.categories.forEach((cat) => {
        categoriesMap.set(cat.id.toLowerCase(), { ...cat, folderId: f.id });
      });
    }
  });

  // Collect project categories
  projects.forEach((p) => {
    if (p.categories && Array.isArray(p.categories)) {
      p.categories.forEach((cat) => {
        categoriesMap.set(cat.id.toLowerCase(), { ...cat, projectId: p.id });
      });
    }
  });

  return Array.from(categoriesMap.values());
}

export function getCategoryBadgeStyle(colorHex?: string) {
  if (!colorHex) return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };

  // Map common colors to tailwind classes for clean badge visuals
  const hex = colorHex.toLowerCase();
  if (hex.includes("6366f1") || hex.includes("indigo"))
    return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" };
  if (hex.includes("f43f5e") || hex.includes("rose") || hex.includes("red"))
    return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
  if (hex.includes("a855f7") || hex.includes("purple"))
    return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" };
  if (hex.includes("f59e0b") || hex.includes("amber") || hex.includes("orange"))
    return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" };
  if (hex.includes("06b6d4") || hex.includes("cyan") || hex.includes("sky"))
    return { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" };
  if (hex.includes("10b981") || hex.includes("emerald") || hex.includes("green"))
    return { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" };
  if (hex.includes("3b82f6") || hex.includes("blue"))
    return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };

  return { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" };
}
