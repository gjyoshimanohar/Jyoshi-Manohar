import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  },

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, data);
    } else {
      // Create it if it doesn't exist
      await setDoc(docRef, {
        ...data,
        createdAt: Date.now()
      });
    }
  }
};
