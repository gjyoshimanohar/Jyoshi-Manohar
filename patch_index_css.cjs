const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf-8');

// Insert select styling inside @layer base { body { ... }
const selectStyle = `
  select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2rem;
  }
`;

code = code.replace(/input, select, textarea, button \{/g, selectStyle + '\n  input, textarea, button {');

fs.writeFileSync('src/index.css', code);
