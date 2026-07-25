import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Resource } from '../types';

const COLLECTION_NAME = 'resources';

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
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const resourceService = {
  async getAllResources(): Promise<Resource[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  async createResource(resource: Omit<Resource, 'id'>): Promise<string> {
    try {
      const resourceData: any = {
        ...resource,
        createdAt: Timestamp.now(),
        authorId: auth.currentUser?.uid || null
      };

      // Clean up undefined properties which Firestore rejects
      Object.keys(resourceData).forEach(key => resourceData[key] === undefined && delete resourceData[key]);

      const docRef = await addDoc(collection(db, COLLECTION_NAME), resourceData);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
      return '';
    }
  },

  async updateResource(id: string, resource: Partial<Resource>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updateData: any = { ...resource, updatedAt: Timestamp.now() };
      
      // Clean up undefined properties which Firestore rejects
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      await updateDoc(docRef, updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    }
  },

  async deleteResource(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    }
  }
};
