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
let allMatches = [];
for (let file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/>[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+</g);
  if(matches) allMatches = allMatches.concat(matches.map(m => file + ': ' + m));
  const m2 = content.match(/placeholder=\"[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+\"/g);
  if(m2) allMatches = allMatches.concat(m2.map(m => file + ': ' + m));
  const m3 = content.match(/title=\"[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+\"/g);
  if(m3) allMatches = allMatches.concat(m3.map(m => file + ': ' + m));
}
if(allMatches.length > 0) {
  let u = [...new Set(allMatches)];
  console.log(u.join('\n'));
} else {
  console.log('No matches found.');
}
