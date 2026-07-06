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
  format?: 'html' | 'markdown';
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskCommentReply {
  id: string;
  text: string;
  createdAt: number;
  author?: string;
  likes?: number;
  isLikedByMe?: boolean;
}

export interface TaskActivity {
  id: string;
  type: 'status' | 'priority' | 'title' | 'comment' | 'create' | 'subtask' | 'other';
  field: string;
  oldValue?: string;
  newValue?: string;
  createdAt: number;
  user?: string;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: number;
  author?: string;
  likes?: number;
  isLikedByMe?: boolean;
  replies?: TaskCommentReply[];
}

export interface Todo {
	id: string;
	userId: string;
	title: string;
	description?: string;
	completed: boolean;
	createdAt: number;
 isPinned?: boolean;
	dueDate?: number | null;
	deadline?: number | null;
	priority?: number; // 1, 2, 3, 4
	projectId?: string; // 'inbox' or custom ID
	tags?: string[];
	subtasks?: Subtask[];
	comments?: TaskComment[];
	activities?: TaskActivity[];
	deletedAt?: number;
	sectionName?: string | null;
	deleteReason?: string;
	declineReason?: string;
	repeatInterval?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
	blockedBy?: string[];
	metadata?: {
		deleteReason?: string;
		declineReason?: string;
		[key: string]: any;
	};
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
  isPinned?: boolean;
}

export interface PaymentAccount {
  id: string;
  name: string;
  type: 'bank_account' | 'credit_card';
  openingBalance: number;
  createdAt: number;
}

export interface FinanceRecord {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  status: 'paid' | 'pending' | 'overdue';
  createdAt: number;
  clientName?: string;
  clientId?: string;
  scope?: 'business' | 'personal';
  paymentMode?: string;
  paymentAccountId?: string;
}
