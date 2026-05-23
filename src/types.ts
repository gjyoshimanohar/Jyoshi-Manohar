export interface Service {
 id: string;
 title: string;
 description: string;
 iconName: string;
}

export interface BlogPost {
 id: string;
 title: string;
 slug: string;
 excerpt: string;
 content: string;
 date: string;
 category: string;
 readTime: string;
}

export interface Subtask {
 id: string;
 title: string;
 completed: boolean;
}

export interface Todo {
 id: string;
 userId: string;
 title: string;
 description?: string;
 completed: boolean;
 createdAt: number;
 dueDate?: number | null;
 deadline?: number | null;
 priority?: number; // 1, 2, 3, 4
 projectId?: string; // 'inbox' or custom ID
 tags?: string[];
 subtasks?: Subtask[];
 deletedAt?: number;
 sectionName?: string | null;
}

export interface Folder {
 id: string;
 userId: string;
 name: string;
 isExpanded?: boolean;
 color?: string;
 createdAt: number;
}

export interface Project {
 id: string;
 userId: string;
 name: string;
 color: string;
 icon?: string;
 folderId?: string | null;
 viewType?: 'list' | 'kanban' | 'timeline';
 sections?: string[];
 createdAt: number;
}
