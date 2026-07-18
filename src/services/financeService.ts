import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { FinanceRecord, PaymentAccount } from '../types';
import { todoService } from './todoService';

const COLLECTION_NAME = 'finances';
const ACCOUNTS_COLLECTION = 'payment_accounts';

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

export const financeService = {
  async getRecordByInvoiceId(invoiceId: string): Promise<FinanceRecord | null> {
    try {
      const q = query(collection(db, COLLECTION_NAME), where('invoiceId', '==', invoiceId), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FinanceRecord;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  async getAllRecords(): Promise<FinanceRecord[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceRecord));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      return [];
    }
  },

  async createRecord(record: Omit<FinanceRecord, 'id' | 'createdAt'>): Promise<FinanceRecord> {
    try {
      const financeRef = collection(db, COLLECTION_NAME);
      const newDocRef = doc(financeRef); // auto-generate ID
      const newRecord: FinanceRecord = {
        ...record,
        id: newDocRef.id,
        createdAt: Date.now()
      };
      await setDoc(newDocRef, newRecord);

      // Auto-create a task if it's a pending expense (payable)
      try {
        if (newRecord.type === 'expense' && (newRecord.status === 'pending' || newRecord.status === 'overdue') && !newRecord.isReimbursed && !newRecord.isReceivableFromClient) {
          let dueDateMillis = null;
          if (newRecord.ccBillDetails && newRecord.ccBillDetails.dueDate) {
            dueDateMillis = new Date(newRecord.ccBillDetails.dueDate).getTime();
          } else if (newRecord.date) {
            dueDateMillis = new Date(newRecord.date).getTime();
          }

          if (dueDateMillis && auth.currentUser) {
            await todoService.createTodo({
              userId: auth.currentUser.uid,
              title: `Pay ${newRecord.category}: ${newRecord.description || newRecord.amount}`,
              description: `Amount: ₹${newRecord.amount.toLocaleString("en-IN")}\nCategory: ${newRecord.category}`,
              completed: false,
              dueDate: dueDateMillis,
              projectId: 'inbox',
              priority: 1,
              tags: ['payable'],
              metadata: {
                payableAmount: newRecord.amount,
                paidAmount: 0
              }
            });
          }
        }
      } catch (taskErr) {
        console.error("Failed to sync finance record to Tasks", taskErr);
      }
      return newRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
      throw error;
    }
  },

  async updateRecord(id: string, record: Partial<FinanceRecord>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, record);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
      throw error;
    }
  },

  async deleteRecord(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
      throw error;
    }
  },

  async getAllPaymentAccounts(): Promise<PaymentAccount[]> {
    try {
      const q = query(collection(db, ACCOUNTS_COLLECTION), orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentAccount));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, ACCOUNTS_COLLECTION);
      return [];
    }
  },

  async createPaymentAccount(account: Omit<PaymentAccount, 'id' | 'createdAt'>): Promise<PaymentAccount> {
    try {
      const accountsRef = collection(db, ACCOUNTS_COLLECTION);
      const newDocRef = doc(accountsRef);
      const newAccount: PaymentAccount = {
        ...account,
        id: newDocRef.id,
        createdAt: Date.now()
      };
      await setDoc(newDocRef, newAccount);
      return newAccount;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, ACCOUNTS_COLLECTION);
      throw error;
    }
  },

  async updatePaymentAccount(id: string, account: Partial<PaymentAccount>): Promise<void> {
    try {
      const docRef = doc(db, ACCOUNTS_COLLECTION, id);
      await updateDoc(docRef, account);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${ACCOUNTS_COLLECTION}/${id}`);
      throw error;
    }
  },

  async deletePaymentAccount(id: string): Promise<void> {
    try {
      const docRef = doc(db, ACCOUNTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${ACCOUNTS_COLLECTION}/${id}`);
      throw error;
    }
  }
};
