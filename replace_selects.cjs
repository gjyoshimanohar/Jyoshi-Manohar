const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

function replaceSelect(code, regex, optionsStringGenerator) {
  return code.replace(regex, (match, value, onChange, className, children) => {
    return `<CustomSelect
              value={${value}}
              onChange={(val) => ${onChange}}
              className="${className}"
              options={${optionsStringGenerator(children)}}
            />`;
  });
}

// 1. Year select
code = code.replace(
  /<select\s+value=\{selectedYear\}\s+onChange=\{\(e\) => setSelectedYear\(e\.target\.value\)\}\s+className="([^"]+)"\s*>\s*\{yearsList\.map\(yr => \(\s*<option key=\{yr\} value=\{yr\}>\{yr\}<\/option>\s*\)\)\}\s*<\/select>/g,
  (match, className) => {
    return `<CustomSelect
              value={selectedYear}
              onChange={(val) => setSelectedYear(val)}
              className="${className}"
              options={yearsList.map(yr => ({ value: yr, label: yr }))}
            />`;
  }
);

// 2. Month select
code = code.replace(
  /<select\s+value=\{selectedMonth\}\s+onChange=\{\(e\) => setSelectedMonth\(e\.target\.value\)\}\s+className="([^"]+)"\s*>\s*<option value="All">All Months<\/option>\s*\{monthsList\.map\(m => \(\s*<option key=\{m\} value=\{m\}>\{m\}<\/option>\s*\)\)\}\s*<\/select>/g,
  (match, className) => {
    return `<CustomSelect
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(val)}
              className="${className}"
              options={[{ value: "All", label: "All Months" }, ...monthsList.map(m => ({ value: m, label: m }))]}
            />`;
  }
);

// 3. Category Select (with optgroups)
const catSelectRe = /<select\s+value=\{selectedCategory\}\s+onChange=\{\(e\) => setSelectedCategory\(e\.target\.value\)\}\s+className="([^"]+)"\s*>([\s\S]*?)<\/select>/g;
code = code.replace(catSelectRe, (match, className, inner) => {
  return `<CustomSelect
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              className="${className}"
              options={[
                { value: "All", label: "All Categories" },
                ...(selectedScope === "all" || selectedScope === "business" ? [
                  { label: "💼 Corporate Revenue", options: customCategories.businessIncome.map(c => ({ value: c, label: c })) },
                  { label: "💼 Operating Expense", options: customCategories.businessExpense.map(c => ({ value: c, label: c })) }
                ] : []),
                ...(selectedScope === "all" || selectedScope === "personal" ? [
                  { label: "🌸 Personal Inflow", options: customCategories.personalIncome.map(c => ({ value: c, label: c })) },
                  { label: "🌸 Personal Expenses", options: customCategories.personalExpense.map(c => ({ value: c, label: c })) }
                ] : [])
              ]}
            />`;
});

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
