const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) results = results.concat(walk(fullPath));
    else if (fullPath.endsWith('.jsx')) results.push(fullPath);
  }
  return results;
}
const files = walk('src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const strippedContent = content.replace(/className=(['"])[^\1]*\1/g, '').replace(/className=\{[^\}]+\}/g, '');
  const lines = strippedContent.split('\n');
  const regex = /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+(?:[a-záéíóúñ]+\s+)*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g;
  for(let i=0; i<lines.length; i++) {
    const line = lines[i];
    if (line.includes('import ') || line.includes('console.log')) continue;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (['English TECH', 'Gina Marcela Quintana Delgado', 'Gina Marcela', 'Marcela Quintana', 'Quintana Delgado', 'Profesora Gina', 'Palo Seco'].includes(match[0])) continue;
      console.log(file + ':' + (i+1) + ': ' + match[0] + '  ==>  ' + line.trim());
    }
  }
}
