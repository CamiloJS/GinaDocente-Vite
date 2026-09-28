import fs from 'fs';
import path from 'path';
import * as babelParser from '@babel/parser';
import traverseDefault from '@babel/traverse';

const traverse = traverseDefault.default || traverseDefault;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(full));
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
      files.push(full);
    }
  }
  return files;
}

const files = scanDir('src');
console.log(`Found ${files.length} JS/JSX files in src/`);

const globalKnown = new Set([
  'window', 'document', 'console', 'localStorage', 'sessionStorage', 'fetch', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'navigator', 'location',
  'history', 'alert', 'confirm', 'prompt', 'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number',
  'Boolean', 'RegExp', 'Error', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet', 'URL', 'URLSearchParams',
  'Blob', 'File', 'FileReader', 'FormData', 'Image', 'Audio', 'Notification', 'SpeechSynthesisUtterance',
  'speechSynthesis', 'crypto', 'btoa', 'atob', 'encodeURIComponent', 'decodeURIComponent', 'parseInt',
  'parseFloat', 'isNaN', 'isFinite', 'Intl', 'Event', 'CustomEvent', 'MutationObserver', 'IntersectionObserver',
  'performance', 'queueMicrotask', 'structuredClone', 'React', 'ReactDOM'
]);

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    const ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });

    const undeclared = new Set();

    traverse(ast, {
      ReferencedIdentifier(pathNode) {
        const name = pathNode.node.name;
        if (globalKnown.has(name)) return;
        if (name.startsWith('__')) return;
        // check scope
        const binding = pathNode.scope.getBinding(name);
        if (!binding) {
          // Check if it's a JSX tag or standard global
          if (name === 'arguments' || name === 'undefined' || name === 'NaN' || name === 'Infinity') return;
          undeclared.add({ name, line: pathNode.node.loc?.start?.line });
        }
      }
    });

    if (undeclared.size > 0) {
      console.log(`\nPotential undeclared variables in ${file}:`);
      for (const item of undeclared) {
        console.log(`  - Line ${item.line}: ${item.name}`);
      }
    }
  } catch (err) {
    console.error(`Error parsing ${file}:`, err.message);
  }
}
