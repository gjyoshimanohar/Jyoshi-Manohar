import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface InvoiceSettings {
  senderName: string;
  senderEmail: string;
  senderAddress: string;
}

export const settingsService = {
  subscribeToInvoiceSettings(callback: (settings: InvoiceSettings | null) => void) {
    const ref = doc(db, 'settings', 'invoiceSettings');
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as InvoiceSettings);
      } else {
        callback(null);
      }
    });
  },

  async updateInvoiceSettings(settings: InvoiceSettings): Promise<void> {
    const ref = doc(db, 'settings', 'invoiceSettings');
    await setDoc(ref, settings, { merge: true });
  }
};
