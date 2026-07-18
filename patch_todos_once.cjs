const fs = require('fs');
const file = 'src/services/todoService.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `createTodo: async`;
const replacement = `getTodosOnce: async (userId: string): Promise<Todo[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
      const snapshot = await import('firebase/firestore').then(m => m.getDocs(q));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Todo));
    } catch (e) {
      return [];
    }
  },
  createTodo: async`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched todoService');
} else {
  console.log('Target not found');
}
