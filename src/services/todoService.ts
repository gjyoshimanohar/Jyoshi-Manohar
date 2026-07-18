import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Todo, Project, Folder } from '../types';

const COLLECTION_NAME = 'todos';
const PROJECTS_COLLECTION = 'projects';
const FOLDERS_COLLECTION = 'folders';

// For firestore rules error handling
enum OperationType {
 CREATE = 'create',
 UPDATE = 'update',
 DELETE = 'delete',
 LIST = 'list',
 GET = 'get',
 WRITE = 'write',
}

interface FirestoreErrorInfo {
 error: string;
 operationType: OperationType;
 path: string | null;
 authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
 const errInfo: FirestoreErrorInfo = {
 error: error instanceof Error ? error.message : String(error),
 authInfo: {
 userId: auth.currentUser?.uid,
 email: auth.currentUser?.email,
 emailVerified: auth.currentUser?.emailVerified,
 },
 operationType,
 path
 };
 console.error('Firestore Error: ', JSON.stringify(errInfo));
 throw new Error(JSON.stringify(errInfo));
}

function cleanUndefined<T>(obj: T): T {
 if (obj === null || typeof obj !== 'object') {
 return obj;
 }
 if (Array.isArray(obj)) {
 return obj.map(cleanUndefined) as unknown as T;
 }
 const cleaned: any = {};
 for (const [key, value] of Object.entries(obj)) {
 if (value !== undefined) {
 cleaned[key] = cleanUndefined(value);
 }
 }
 return cleaned as T;
}

export const todoService = {
 subscribeToUserTodos: (userId: string, callback: (todos: Todo[]) => void, errorCallback?: (error: any) => void) => {
 const q = query(
 collection(db, COLLECTION_NAME),
 where("userId", "==", userId)
 );
 return onSnapshot(q, (snapshot) => {
 const todos = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 })) as Todo[];
 // Sort in memory because Firestore requires compound indexes for where + orderBy on different fields
 todos.sort((a, b) => b.createdAt - a.createdAt);
 callback(todos);
 }, (error) => {
 if (errorCallback) {
 errorCallback(error);
 } else {
 handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
 }
 });
 },

 getTodosOnce: async (userId: string): Promise<Todo[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
      const snapshot = await import('firebase/firestore').then(m => m.getDocs(q));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Todo));
    } catch (e) {
      return [];
    }
  },
  createTodo: async (todoData: Omit<Todo, 'id' | 'createdAt'>) => {
 try {
 const newTodo = {
 ...todoData,
 createdAt: Date.now()
 };
 const cleaned = cleanUndefined(newTodo);
 const docRef = await addDoc(collection(db, COLLECTION_NAME), cleaned);
 return { id: docRef.id, ...cleaned } as Todo;
 } catch (error) {
 handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
 }
 },

 updateTodo: async (todoId: string, updates: Partial<Todo>) => {
 try {
 const todoRef = doc(db, COLLECTION_NAME, todoId);
 await updateDoc(todoRef, cleanUndefined(updates));
 } catch (error) {
 handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${todoId}`);
 }
 },

 updateTodoStatus: async (todoId: string, completed: boolean) => {
 try {
 const todoRef = doc(db, COLLECTION_NAME, todoId);
 await updateDoc(todoRef, { completed });
 } catch (error) {
 handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${todoId}`);
 }
 },

 softDeleteTodo: async (todoId: string) => {
 try {
 const todoRef = doc(db, COLLECTION_NAME, todoId);
 await updateDoc(todoRef, { deletedAt: Date.now() });
 } catch (error) {
 handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${todoId}`);
 }
 },

 restoreTodo: async (todoId: string) => {
 try {
 const todoRef = doc(db, COLLECTION_NAME, todoId);
 await updateDoc(todoRef, { deletedAt: null });
 } catch (error) {
 handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${todoId}`);
 }
 },

 deleteTodo: async (todoId: string) => {
 try {
 const todoRef = doc(db, COLLECTION_NAME, todoId);
 await deleteDoc(todoRef);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${todoId}`);
 }
 },

 // Project methods
 subscribeToProjects: (userId: string, callback: (projects: Project[]) => void, errorCallback?: (error: any) => void) => {
 const q = query(
 collection(db, PROJECTS_COLLECTION),
 where("userId", "==", userId)
 );
 return onSnapshot(q, (snapshot) => {
 const projects = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 })) as Project[];
 projects.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
 callback(projects);
 }, (error) => {
 if (errorCallback) {
 errorCallback(error);
 } else {
 handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
 }
 });
 },

 createProject: async (name: string, color: string, userId: string, icon?: string, folderId?: string | null, viewType?: 'list' | 'kanban' | 'timeline', sections?: string[]) => {
 try {
 const newProject = {
 name,
 color,
 userId,
 icon: icon || null,
 folderId: folderId || null,
 viewType: viewType || 'list',
 sections: sections || null,
 createdAt: Date.now()
 };
 const cleaned = cleanUndefined(newProject);
 const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), cleaned);
 return { id: docRef.id, ...cleaned } as Project;
 } catch (error) {
 handleFirestoreError(error, OperationType.CREATE, PROJECTS_COLLECTION);
 }
 },

 updateProject: async (projectId: string, data: Partial<Project>) => {
 try {
 const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
 await updateDoc(projectRef, cleanUndefined(data));
 } catch (error) {
 handleFirestoreError(error, OperationType.UPDATE, `${PROJECTS_COLLECTION}/${projectId}`);
 }
 },

 deleteProject: async (projectId: string) => {
 try {
 const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
 await deleteDoc(projectRef);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, `${PROJECTS_COLLECTION}/${projectId}`);
 }
 },

 // Folder methods
 subscribeToFolders: (userId: string, callback: (folders: Folder[]) => void, errorCallback?: (error: any) => void) => {
 const q = query(
 collection(db, FOLDERS_COLLECTION),
 where("userId", "==", userId)
 );
 return onSnapshot(q, (snapshot) => {
 const folders = snapshot.docs.map(doc => ({
 id: doc.id,
 ...doc.data()
 })) as Folder[];
 folders.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
 callback(folders);
 }, (error) => {
 if (errorCallback) {
 errorCallback(error);
 } else {
 handleFirestoreError(error, OperationType.LIST, FOLDERS_COLLECTION);
 }
 });
 },

 createFolder: async (name: string, userId: string) => {
 try {
 const newFolder = {
 name,
 userId,
 isExpanded: true,
 createdAt: Date.now()
 };
 const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), newFolder);
 return { id: docRef.id, ...newFolder } as Folder;
 } catch (error) {
 handleFirestoreError(error, OperationType.CREATE, FOLDERS_COLLECTION);
 }
 },

 updateFolder: async (folderId: string, data: Partial<Folder>) => {
 try {
 const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
 await updateDoc(folderRef, cleanUndefined(data));
 } catch (error) {
 handleFirestoreError(error, OperationType.UPDATE, `${FOLDERS_COLLECTION}/${folderId}`);
 }
 },

 deleteFolder: async (folderId: string) => {
 try {
 const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
 await deleteDoc(folderRef);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, `${FOLDERS_COLLECTION}/${folderId}`);
 }
 }
};
