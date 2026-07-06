const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const insertTarget = '  const handleRemoveCategory = (catName: string) => {';
const editFunc = `  const handleSaveEditCategory = () => {
    if (!editingCategoryOld || !editingCategoryNew.trim()) return;
    setCustomCategories(prev => {
      const list = prev[categoryManageType];
      const idx = list.indexOf(editingCategoryOld);
      if (idx === -1) return prev;
      const newList = [...list];
      newList[idx] = editingCategoryNew.trim();
      return { ...prev, [categoryManageType]: newList };
    });
    // Also we might need to update any records that used this category? The user might just want the list name updated.
    // For now we just update the category list.
    setEditingCategoryOld(null);
    setEditingCategoryNew("");
  };

`;

code = code.replace(insertTarget, editFunc + insertTarget);
fs.writeFileSync('src/components/FinanceTracker.tsx', code);
