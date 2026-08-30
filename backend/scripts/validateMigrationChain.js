#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const migrationsDir = path.resolve(__dirname, '..', 'migrations');
const files = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, 'en'));

const diagnostics = [];
const seenPrefixes = new Map();
const rows = files.map((file) => {
  const match = /^(\d{8,14}(?:-\d{3})?)[-_](.+)\.js$/.exec(file);
  if (!match) {
    diagnostics.push(`${file}: filename must start with an 8-14 digit date prefix`);
    return { file, prefix: null };
  }
  const [, prefix] = match;
  if (seenPrefixes.has(prefix)) {
    diagnostics.push(`${file}: duplicate prefix ${prefix}; already used by ${seenPrefixes.get(prefix)}`);
  } else {
    seenPrefixes.set(prefix, file);
  }
  return { file, prefix };
});

for (let i = 1; i < rows.length; i += 1) {
  if (rows[i - 1].prefix && rows[i].prefix && rows[i - 1].prefix >= rows[i].prefix) {
    diagnostics.push(`${rows[i].file}: migration prefixes are not strictly increasing`);
  }
}

if (diagnostics.length) {
  console.error('Migration chain validation failed:');
  diagnostics.forEach((diagnostic) => console.error(`- ${diagnostic}`));
  process.exitCode = 1;
} else {
  console.log(`Migration chain valid: ${files.length} JavaScript migrations, unique ordered prefixes.`);
}
