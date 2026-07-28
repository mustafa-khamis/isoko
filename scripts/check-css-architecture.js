import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const findings = [];

function walk(dir, matcher, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath, matcher, files);
    else if (matcher(filePath)) files.push(filePath);
  }
  return files;
}

function hasImport(source, cssName) {
  return source.includes(`'./${cssName}'`) || source.includes(`"./${cssName}"`);
}

function readQuoted(source, start) {
  const quote = source[start];
  let value = '';
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === '\\') {
      value += character;
      if (index + 1 < source.length) value += source[++index];
    } else if (character === quote) {
      return { value, end: index + 1 };
    } else {
      value += character;
    }
  }
  return { value, end: source.length };
}

function readExpression(source, start) {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' || character === "'" || character === '`') {
      index = readQuoted(source, index).end - 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return { value: source.slice(start + 1, index), end: index + 1 };
    }
  }
  return { value: source.slice(start + 1), end: source.length };
}

function classTokens(source) {
  const tokens = new Set();
  const attribute = /\bclassName\s*=/g;
  let match;

  const addValue = (value) => {
    for (const token of value.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) {
      if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(token)) tokens.add(token);
    }
  };

  while ((match = attribute.exec(source))) {
    let index = match.index + match[0].length;
    while (/\s/.test(source[index])) index += 1;
    if (source[index] === '"' || source[index] === "'") {
      const quoted = readQuoted(source, index);
      addValue(quoted.value);
      attribute.lastIndex = quoted.end;
    } else if (source[index] === '{') {
      const expression = readExpression(source, index);
      const strings = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/gs;
      let stringMatch;
      while ((stringMatch = strings.exec(expression.value))) {
        addValue(stringMatch[1] ?? stringMatch[2] ?? stringMatch[3] ?? '');
      }
      attribute.lastIndex = expression.end;
    }
  }
  return tokens;
}

const pagesRoot = path.join(root, 'pages');
for (const pageFile of walk(pagesRoot, (file) => file.endsWith('.jsx'))) {
  const cssName = `${path.basename(pageFile, '.jsx')}.css`;
  const cssPath = path.join(path.dirname(pageFile), cssName);
  const source = fs.readFileSync(pageFile, 'utf8');

  if (!fs.existsSync(cssPath)) {
    findings.push(`${path.relative(process.cwd(), pageFile)} is missing ${cssName}`);
  } else if (!hasImport(source, cssName)) {
    findings.push(`${path.relative(process.cwd(), pageFile)} does not directly import ./${cssName}`);
  }
}

const styledComponents = [
  'src/components/auth/AuthModal.jsx',
  'src/components/auth/GoogleSignInButton.jsx',
  'src/components/listings/ListingCard.jsx',
  'src/components/navigation/BottomNav.jsx',
  'src/components/navigation/Header.jsx',
  'src/components/ui/EmptyState.jsx',
];

for (const relativeFile of styledComponents) {
  const componentFile = path.resolve(relativeFile);
  if (!fs.existsSync(componentFile)) continue;
  const cssName = `${path.basename(componentFile, '.jsx')}.css`;
  const cssPath = path.join(path.dirname(componentFile), cssName);
  const source = fs.readFileSync(componentFile, 'utf8');

  if (!fs.existsSync(cssPath)) {
    findings.push(`${relativeFile} is missing ${cssName}`);
  } else if (!hasImport(source, cssName)) {
    findings.push(`${relativeFile} does not directly import ./${cssName}`);
  }
}

const legacyStyles = [
  'semantic-migration.css',
  'navigation.css',
  'components.css',
  'auth.css',
  'home.css',
  'browse.css',
  'listing-detail.css',
  'create-listing.css',
  'responsive.css',
];

for (const legacyFile of legacyStyles) {
  if (fs.existsSync(path.join(root, 'styles', legacyFile))) {
    findings.push(`src/styles/${legacyFile} still exists`);
  }
}

const sourceFiles = walk(root, (file) => /\.(?:js|jsx|css)$/.test(file));
const placeholderPattern = /__(?:part|section|block|semantic)-\d+/;
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('semantic-migration.css')) {
    findings.push(`${path.relative(process.cwd(), file)} references semantic-migration.css`);
  }
  if (placeholderPattern.test(source)) {
    findings.push(`${path.relative(process.cwd(), file)} contains a numbered migration placeholder`);
  }
}

const globalCssPath = path.join(root, 'styles', 'global.css');
const globalCss = fs.readFileSync(globalCssPath, 'utf8');
const localImports = [...globalCss.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
for (const importedFile of localImports) {
  if (!['./variables.css', './reset.css'].includes(importedFile)) {
    findings.push(`src/styles/global.css imports non-foundational stylesheet ${importedFile}`);
  }
}

const definedClasses = new Set();
for (const cssFile of walk(root, (file) => file.endsWith('.css'))) {
  const css = fs.readFileSync(cssFile, 'utf8');
  for (const match of css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
    definedClasses.add(match[1]);
  }
}

const missingClasses = new Map();
for (const jsxFile of walk(root, (file) => file.endsWith('.jsx'))) {
  const source = fs.readFileSync(jsxFile, 'utf8');
  const missing = [...classTokens(source)].filter((token) => !definedClasses.has(token));
  if (missing.length > 0) {
    missingClasses.set(path.relative(process.cwd(), jsxFile), missing.sort());
  }
}

for (const [file, missing] of missingClasses) {
  findings.push(`${file} references CSS classes without definitions: ${missing.join(', ')}`);
}

if (findings.length > 0) {
  console.error('CSS architecture check failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('CSS architecture check passed: local ownership, no placeholders, and all literal JSX classes are defined.');
