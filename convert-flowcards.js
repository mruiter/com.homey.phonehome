const fs = require('fs');
const path = require('path');

const FLOW_DIRS = [
  '.homeycompose/flow/actions',
  '.homeycompose/flow/triggers',
  '.homeycompose/flow/conditions'
];

// Regex to match [[argName]] and convert to {{argName}}
const replaceBrackets = (str) =>
  str.replace(/\[\[(\w+?)\]\]/g, '{{$1}}');

const fixTitleFormatted = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  let json;

  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to parse JSON in ${filePath}`);
    return;
  }

  let changed = false;

  if (json.titleFormatted && typeof json.titleFormatted === 'object') {
    for (const [lang, value] of Object.entries(json.titleFormatted)) {
      if (typeof value === 'string' && value.includes('[[')) {
        json.titleFormatted[lang] = replaceBrackets(value);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes: ${filePath}`);
  }
};

FLOW_DIRS.forEach((dir) => {
  const fullDir = path.resolve(dir);

  if (!fs.existsSync(fullDir)) {
    console.warn(`⚠️ Directory not found: ${fullDir}`);
    return;
  }

  const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json'));

  files.forEach(file => {
    const filePath = path.join(fullDir, file);
    fixTitleFormatted(filePath);
  });
});
