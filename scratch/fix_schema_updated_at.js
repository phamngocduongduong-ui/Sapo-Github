const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// Regex to find updatedAt DateTime lines that don't have @updatedAt
// It matches lines starting with optional whitespace, followed by 'updatedAt', then whitespace, then 'DateTime',
// and optionally followed by some space but NO '@updatedAt'.
// We ensure it doesn't match lines that already have @updatedAt.
const regex = /^\s*updatedAt\s+DateTime\s*$/gm;

const newContent = content.replace(regex, (match) => {
    return match.trimEnd() + ' @updatedAt';
});

fs.writeFileSync(path, newContent);
console.log('Fixed all updatedAt fields.');
