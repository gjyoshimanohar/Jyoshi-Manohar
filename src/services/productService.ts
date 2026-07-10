import { collection, doc, setDoc, deleteDoc, onSnapshot, query, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const COLLECTION_NAME = 'products';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  userId: string;
}

export const productService = {
  subscribeToProducts(callback: (products: Product[]) => void) {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      callback(products);
    });
  },

  async createProduct(product: Omit<Product, 'id' | 'userId'>): Promise<void> {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const ref = doc(collection(db, COLLECTION_NAME));
    await setDoc(ref, {
      ...product,
      id: ref.id,
      userId
    });
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    await updateDoc(doc(db, COLLECTION_NAME, id), updates as any);
  },

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};
