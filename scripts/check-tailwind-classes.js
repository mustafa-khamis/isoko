import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');

const variants = String.raw`(?:(?:sm|md|lg|xl|2xl|hover|focus|focus-visible|focus-within|active|disabled|checked):)*`;
const utility = String.raw`(?:` + [
  String.raw`bg-.+`,
  String.raw`text-(?:xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|ellipsis|clip|wrap|nowrap|balance|pretty|transparent|current|black|white|inherit|[a-z]+-\d{2,3}|\[.+\])`,
  String.raw`font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)`,
  String.raw`border(?:$|-.+)`,
  String.raw`rounded(?:$|-.+)`,
  String.raw`shadow(?:$|-.+)`,
  String.raw`(?:inline-)?flex`,
  String.raw`flex-.+`,
  String.raw`grid`,
  String.raw`grid-.+`,
  String.raw`items-.+`,
  String.raw`justify-.+`,
  String.raw`content-.+`,
  String.raw`self-.+`,
  String.raw`gap-.+`,
  String.raw`space-[xy]-.+`,
  String.raw`[pm][trblxy]?-(?:0|px|auto|[0-9]+(?:\.5)?|\[.+\])`,
  String.raw`w-(?:0|px|auto|full|screen|min|max|fit|[0-9]+(?:\.5)?|\[.+\])`,
  String.raw`h-(?:0|px|auto|full|screen|min|max|fit|[0-9]+(?:\.5)?|\[.+\])`,
  String.raw`min-[wh]-(?:0|px|full|screen|min|max|fit|[0-9]+(?:\.5)?|\[.+\])`,
  String.raw`max-[wh]-(?:0|px|full|screen|min|max|fit|none|[0-9]+(?:\.5)?|\[.+\])`,
  String.raw`(?:sticky|fixed|absolute|relative)`,
  String.raw`(?:inset|top|right|bottom|left)-(?:0|px|auto|full|[0-9]+(?:\.5)?|-[0-9]+(?:\.5)?|\[.+\])`,
  String.raw`z-(?:[0-9]+|\[.+\])`,
  String.raw`overflow-.+`,
  String.raw`transition(?:$|-.+)`,
  String.raw`duration-.+`,
  String.raw`ease-.+`,
  String.raw`opacity-.+`,
  String.raw`aspect-.+`,
  String.raw`object-.+`,
  String.raw`whitespace-.+`,
  String.raw`truncate`,
  String.raw`shrink(?:$|-.+)`,
  String.raw`grow(?:$|-.+)`,
  String.raw`backdrop-.+`,
  String.raw`cursor-.+`,
  String.raw`translate-[xy]-.+`,
  String.raw`scale-.+`,
  String.raw`rotate-.+`,
  String.raw`animate-.+`,
  String.raw`from-.+`,
  String.raw`via-.+`,
  String.raw`to-.+`,
].join('|') + String.raw`)`;

const utilityPattern = new RegExp(`^${variants}${utility}$`);
const numberedPlaceholderPattern = /__(?:part|section|block|semantic)-\d+$/;
const fakeAliasPattern =
  /^(?:surface|border|position|top|bottom|left|right|layer|layout|align|justify|gap|pad|margin|fontSize|weight|color|radius|shadow|width|height|minWidth|maxWidth|minHeight|maxHeight|motion|overflow|textAlign|aspect|noShrink|grow)[A-Z0-9]/;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filePath, files);
    else if (/\.(?:js|jsx)$/.test(entry.name)) files.push(filePath);
  }
  return files;
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
  let index = start;
  for (; index < source.length; index += 1) {
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

function stringValues(expression) {
  const values = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/gs;
  let match;
  while ((match = pattern.exec(expression))) {
    values.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return values;
}

function classValues(source) {
  const values = [];
  const attribute = /\bclassName\s*=/g;
  let match;

  while ((match = attribute.exec(source))) {
    let index = match.index + match[0].length;
    while (/\s/.test(source[index])) index += 1;
    if (source[index] === '"' || source[index] === "'") {
      const quoted = readQuoted(source, index);
      values.push(quoted.value);
      attribute.lastIndex = quoted.end;
    } else if (source[index] === '{') {
      const expression = readExpression(source, index);
      values.push(...stringValues(expression.value));
      attribute.lastIndex = expression.end;
    }
  }

  const objectProperty = /\bclassName\s*:\s*("([^"]*)"|'([^']*)'|`([^`]*)`)/gs;
  while ((match = objectProperty.exec(source))) {
    values.push(match[2] ?? match[3] ?? match[4] ?? '');
  }

  return values;
}

function tokensFrom(value) {
  return value
    .replace(/\$\{[^}]*\}/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

const findings = [];
for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  const tokens = new Set();

  if (source.includes('semantic-migration.css')) tokens.add('semantic-migration.css');

  for (const value of classValues(source)) {
    for (const token of tokensFrom(value)) {
      if (
        utilityPattern.test(token)
        || numberedPlaceholderPattern.test(token)
        || fakeAliasPattern.test(token)
      ) {
        tokens.add(token);
      }
    }
  }

  if (tokens.size > 0) {
    findings.push({
      file: path.relative(process.cwd(), file),
      tokens: [...tokens].sort(),
    });
  }
}

if (findings.length > 0) {
  console.error('Tailwind-style or fake utility class tokens remain:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.tokens.join(', ')}`);
  }
  process.exit(1);
}

console.log('No Tailwind-style or fake utility class tokens found in marketplace JSX/JS source.');
