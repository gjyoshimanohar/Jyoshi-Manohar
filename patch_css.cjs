const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf-8');

// We want to replace the specific selector with `*` or just add a global rule.
// Let's remove the previous rule and add a global rule.

const oldRule1 = `div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}`;

const oldRule2 = `div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(2)::-webkit-scrollbar {
  display: none;
}`;

code = code.replace(oldRule1, '');
code = code.replace(oldRule2, '');

const newRule = `
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}

/* Global scrollbar hiding */
* {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
}
*::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
}
`;

if (!code.includes("Global scrollbar hiding")) {
  code += newRule;
}

fs.writeFileSync('src/index.css', code.trim() + '\n');
