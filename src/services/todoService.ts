import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Todo, Project } from '../types';

const COLLECTION_NAME = 'todos';
const PROJECTS_COLLECTION = 'projects';

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

  createTodo: async (todoData: Omit<Todo, 'id' | 'createdAt'>) => {
    try {
      const newTodo = {
        ...todoData,
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newTodo);
      return { id: docRef.id, ...newTodo } as Todo;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateTodo: async (todoId: string, updates: Partial<Todo>) => {
    try {
      const todoRef = doc(db, COLLECTION_NAME, todoId);
      await updateDoc(todoRef, updates);
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
      projects.sort((a, b) => a.createdAt - b.createdAt);
      callback(projects);
    }, (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, PROJECTS_COLLECTION);
      }
    });
  },

  createProject: async (name: string, color: string, userId: string, icon?: string) => {
    try {
      const newProject = {
        name,
        color,
        userId,
        icon: icon || null,
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), newProject);
      return { id: docRef.id, ...newProject } as Project;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, PROJECTS_COLLECTION);
    }
  },

  updateProject: async (projectId: string, data: Partial<Project>) => {
    try {
      const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
      await updateDoc(projectRef, data);
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
  }
};
