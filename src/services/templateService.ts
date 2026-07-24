import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { TaskTemplate } from '../types';

const COLLECTION_NAME = 'task_templates';

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

export const templateService = {
  subscribeToUserTemplates: (
    userId: string,
    callback: (templates: TaskTemplate[]) => void,
    errorCallback?: (error: any) => void
  ) => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const templates = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TaskTemplate[];
        templates.sort((a, b) => b.createdAt - a.createdAt);
        callback(templates);
      },
      (error) => {
        if (errorCallback) {
          errorCallback(error);
        } else {
          handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
        }
      }
    );
  },

  createTemplate: async (templateData: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
    try {
      const newTemplate = {
        ...templateData,
        createdAt: Date.now(),
      };
      const cleaned = cleanUndefined(newTemplate);
      const docRef = await addDoc(collection(db, COLLECTION_NAME), cleaned);
      return { id: docRef.id, ...cleaned } as TaskTemplate;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    }
  },

  updateTemplate: async (id: string, updates: Partial<TaskTemplate>) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const cleaned = cleanUndefined(updates);
      await updateDoc(docRef, cleaned);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  deleteTemplate: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
