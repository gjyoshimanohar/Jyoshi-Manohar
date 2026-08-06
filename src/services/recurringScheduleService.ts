import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RecurringSchedule } from '../types';
import { financeService } from './financeService';
import { addDays, addMonths, addYears, format } from 'date-fns';

const COLLECTION_NAME = 'recurring_schedules';
const LOCAL_STORAGE_KEY = 'fin_recurring_schedules_v1';

const DEFAULT_DEMO_SCHEDULES: Omit<RecurringSchedule, 'id' | 'createdAt'>[] = [
  {
    title: 'CBD Commercial Office Rent',
    vendorName: 'CBD Plaza Realty Ltd',
    category: 'Rent & Housing',
    amount: 25000,
    frequency: 'monthly',
    nextDueDate: format(addMonths(new Date(), 0), 'yyyy-MM-01'),
    scope: 'business',
    status: 'active',
    notes: 'Monthly office rent payable on 1st of every month via bank transfer.',
    autoPost: true
  },
  {
    title: 'Computax & Tally Software Licenses',
    vendorName: 'Computax Software Pvt Ltd',
    category: 'Software & Cloud',
    amount: 6500,
    frequency: 'quarterly',
    nextDueDate: format(addMonths(new Date(), 1), 'yyyy-MM-10'),
    scope: 'business',
    status: 'active',
    notes: 'Quarterly professional accounting and GST filing software licenses.',
    autoPost: true
  },
  {
    title: 'High-Speed Fiber Leased Line',
    vendorName: 'Airtel Business Broadband',
    category: 'Utilities & Bills',
    amount: 4200,
    frequency: 'monthly',
    nextDueDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
    scope: 'business',
    status: 'active',
    notes: 'Dedicated 300Mbps office internet connection.',
    autoPost: false
  },
  {
    title: 'Legal & Compliance Audit Retainer',
    vendorName: 'Vanguard Legal & Audit Services',
    category: 'Legal & Professional Fees',
    amount: 15000,
    frequency: 'monthly',
    nextDueDate: format(addDays(new Date(), 12), 'yyyy-MM-dd'),
    scope: 'business',
    status: 'active',
    notes: 'Monthly compliance & statutory audit retainer fee.',
    autoPost: false
  }
];

export const recurringScheduleService = {
  async getAllSchedules(): Promise<RecurringSchedule[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringSchedule));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        return list;
      }
    } catch (err) {
      console.warn("Firestore recurring_schedules fetch failed, using local storage:", err);
    }

    // Fallback to local storage or demo data
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error("Failed to parse local recurring schedules", e);
      }
    }

    // Seed demo schedules if empty
    const seeded: RecurringSchedule[] = DEFAULT_DEMO_SCHEDULES.map((s, idx) => ({
      ...s,
      id: `rec-demo-${Date.now()}-${idx}`,
      createdAt: Date.now() - idx * 1000
    }));

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seeded));
    
    // Optionally try saving to firestore asynchronously
    seeded.forEach(async (item) => {
      try {
        await setDoc(doc(db, COLLECTION_NAME, item.id), item);
      } catch (e) {
        // Ignore background sync errors
      }
    });

    return seeded;
  },

  async createSchedule(scheduleData: Omit<RecurringSchedule, 'id' | 'createdAt'>): Promise<RecurringSchedule> {
    const newId = `rec-${Date.now()}`;
    const newSchedule: RecurringSchedule = {
      ...scheduleData,
      id: newId,
      createdAt: Date.now()
    };

    // Update local storage
    const current = await this.getAllSchedules();
    const updated = [newSchedule, ...current];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    // Try Firestore
    try {
      await setDoc(doc(db, COLLECTION_NAME, newId), newSchedule);
    } catch (err) {
      console.warn("Failed to write recurring schedule to Firestore:", err);
    }

    return newSchedule;
  },

  async updateSchedule(id: string, partial: Partial<RecurringSchedule>): Promise<void> {
    const current = await this.getAllSchedules();
    const updated = current.map(item => item.id === id ? { ...item, ...partial } : item);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), partial);
    } catch (err) {
      console.warn("Failed to update recurring schedule in Firestore:", err);
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    const current = await this.getAllSchedules();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err) {
      console.warn("Failed to delete recurring schedule from Firestore:", err);
    }
  },

  calculateNextDueDate(currentDueDate: string, frequency: RecurringSchedule['frequency']): string {
    const dt = new Date(currentDueDate);
    let nextDt: Date;

    switch (frequency) {
      case 'weekly':
        nextDt = addDays(dt, 7);
        break;
      case 'monthly':
        nextDt = addMonths(dt, 1);
        break;
      case 'quarterly':
        nextDt = addMonths(dt, 3);
        break;
      case 'yearly':
        nextDt = addYears(dt, 1);
        break;
      default:
        nextDt = addMonths(dt, 1);
    }

    return format(nextDt, 'yyyy-MM-dd');
  },

  async generateBillFromSchedule(schedule: RecurringSchedule, status: 'pending' | 'paid' = 'pending'): Promise<void> {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // Create expense record
    await financeService.createRecord({
      type: 'expense',
      category: schedule.category,
      amount: schedule.amount,
      description: `${schedule.title}${schedule.vendorName ? ` (${schedule.vendorName})` : ''} - Recurring ${schedule.frequency}`,
      date: schedule.nextDueDate || todayStr,
      dueDate: schedule.nextDueDate || todayStr,
      status: status,
      scope: schedule.scope,
      paymentAccountId: schedule.paymentAccountId || '',
      paymentMode: schedule.paymentAccountId ? 'bank_account' : 'other'
    });

    // Advance next due date
    const nextDate = this.calculateNextDueDate(schedule.nextDueDate || todayStr, schedule.frequency);
    await this.updateSchedule(schedule.id, {
      nextDueDate: nextDate,
      lastGeneratedDate: todayStr
    });
  }
};
