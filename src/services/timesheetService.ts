import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { TimesheetLog } from '../types';

const COLLECTION_NAME = 'timesheets';

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

export const timesheetService = {
  subscribeToUserTimesheets: (userId: string, callback: (logs: TimesheetLog[]) => void, errorCallback?: (error: any) => void) => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimesheetLog[];
      // Sort newest first
      logs.sort((a, b) => b.createdAt - a.createdAt);
      callback(logs);
    }, (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        console.error("Firestore Error listing timesheets: ", error);
      }
    });
  },

  createTimesheet: async (timesheetData: Omit<TimesheetLog, 'id' | 'createdAt'>) => {
    try {
      const newLog = {
        ...timesheetData,
        createdAt: Date.now()
      };
      const cleaned = cleanUndefined(newLog);
      const docRef = await addDoc(collection(db, COLLECTION_NAME), cleaned);
      return { id: docRef.id, ...cleaned } as TimesheetLog;
    } catch (error) {
      console.error("Firestore Error creating timesheet: ", error);
      throw error;
    }
  },

  updateTimesheet: async (timesheetId: string, updates: Partial<TimesheetLog>) => {
    try {
      const logRef = doc(db, COLLECTION_NAME, timesheetId);
      await updateDoc(logRef, cleanUndefined(updates));
    } catch (error) {
      console.error("Firestore Error updating timesheet: ", error);
      throw error;
    }
  },

  deleteTimesheet: async (timesheetId: string) => {
    try {
      const logRef = doc(db, COLLECTION_NAME, timesheetId);
      await deleteDoc(logRef);
    } catch (error) {
      console.error("Firestore Error deleting timesheet: ", error);
      throw error;
    }
  }
};
