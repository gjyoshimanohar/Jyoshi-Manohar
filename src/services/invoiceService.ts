import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Invoice } from '../types';

const COLLECTION_NAME = 'invoices';

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

export const invoiceService = {
  subscribeToUserInvoices(userId: string, callback: (invoices: Invoice[]) => void, errorCallback?: (error: any) => void) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );
    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      invoices.sort((a, b) => b.createdAt - a.createdAt);
      callback(invoices);
    }, (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      }
    });
  },

  subscribeToAllInvoices(callback: (invoices: Invoice[]) => void, errorCallback?: (error: any) => void) {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      invoices.sort((a, b) => b.createdAt - a.createdAt);
      callback(invoices);
    }, (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      }
    });
  },

  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    try {
      const invoicesRef = collection(db, COLLECTION_NAME);
      const newDocRef = doc(invoicesRef);
      const newInvoice: Invoice = {
        ...invoice,
        id: newDocRef.id,
        createdAt: Date.now()
      };
      const cleaned = cleanUndefined(newInvoice);
      await setDoc(newDocRef, cleaned);
      return cleaned;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
      throw error;
    }
  },

  async updateInvoice(id: string, invoiceUpdates: Partial<Invoice>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, cleanUndefined(invoiceUpdates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
      throw error;
    }
  },

  async deleteInvoice(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
      throw error;
    }
  }
};
