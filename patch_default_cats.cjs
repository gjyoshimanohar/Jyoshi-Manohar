const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');
code = code.replace(
  /"Incorporate Services",\n    "Other Services"/,
  '"Incorporate Services",\n    "Advance Received",\n    "Other Services"'
);

const targetInit = `  const [customCategories, setCustomCategories] = useState<{ [key: string]: string[] }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("finance_custom_categories");
      if (saved) return JSON.parse(saved);
    }
    return DEFAULT_CATEGORIES;
  });`;

const newInit = `  const [customCategories, setCustomCategories] = useState<{ [key: string]: string[] }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("finance_custom_categories");
      if (saved) {
        let parsed = JSON.parse(saved);
        if (parsed.businessIncome && !parsed.businessIncome.includes("Advance Received")) {
            parsed.businessIncome.push("Advance Received");
        }
        return parsed;
      }
    }
    return DEFAULT_CATEGORIES;
  });`;

code = code.replace(targetInit, newInit);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
