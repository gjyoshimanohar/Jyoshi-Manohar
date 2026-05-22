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

export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
  dueDate?: number | null;
  priority?: number; // 1, 2, 3, 4
  projectId?: string; // 'inbox' or custom ID
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: number;
}
