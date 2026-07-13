const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const target = `    <title>Jyoshi Manohar | SQCA</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />`;

const replacement = `    <title>Jyoshi Manohar | SQCA</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#1a2b58" />
    <link rel="apple-touch-icon" href="/favicon.svg" />`;

const updated = content.replace(target, replacement);
fs.writeFileSync('index.html', updated);
