const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// 1. Remove the static categories
code = code.replace(/\/\/ Income Categories for CA Firm\nconst INCOME_CATEGORIES = \[[^\]]+\];\n\n\/\/ Expense Categories for CA Firm\nconst EXPENSE_CATEGORIES = \[[^\]]+\];\n\n\/\/ Personal Income Categories\nconst PERSONAL_INCOME_CATEGORIES = \[[^\]]+\];\n\n\/\/ Personal Expense Categories\nconst PERSONAL_EXPENSE_CATEGORIES = \[[^\]]+\];/g, `const DEFAULT_CATEGORIES = {
  businessIncome: [
    "Auditing Fees",
    "Tax Consulting",
    "GST Filing",
    "Corporate Advisory",
    "Incorporate Services",
    "Other Services"
  ],
  businessExpense: [
    "Office Rent",
    "Salaries",
    "Software Licensing",
    "Utilities",
    "Marketing & Website",
    "Office Supplies",
    "Travel & Conveyance",
    "Miscellaneous"
  ],
  personalIncome: [
    "Salary / Drawings",
    "Dividends & Investments",
    "Cashback & Rewards",
    "Gifts & Allowances",
    "Other Income"
  ],
  personalExpense: [
    "Groceries & Food",
    "Rent & Housing",
    "Fuel & Transport",
    "Utilities & Bills",
    "Insurance & SIP",
    "Shopping & Leisure",
    "Health & Wellness",
    "Miscellaneous Personal"
  ]
};`);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
