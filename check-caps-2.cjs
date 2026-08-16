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
  let content = fs.readFileSync(file, 'utf8');
  
  // Clean up code by removing JSX expressions to avoid matching JS variables (like "IsDarkMode")
  const textContent = content.replace(/\{[^}]+\}/g, ' ');

  // Match Title Case outside tags
  // Specifically: Two or more words starting with capital letters, 
  // optionally preceded by characters that are not tags.
  // Actually, simpler: grep lines that have Title Case
  const lines = content.split('\n');
  for(let i=0; i<lines.length; i++) {
    const line = lines[i];
    // Ignore imports and console logs
    if (line.includes('import ') || line.includes('console.log')) continue;
    
    // Check for Title Case
    // E.g., " Crear Grupo", "Guardar Cambios"
    const regex = /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+\b/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      // Ignore some common names and components
      if (['English TECH', 'Gina Marcela Quintana Delgado', 'Gina Marcela', 'Marcela Quintana', 'Quintana Delgado', 'Profesora Gina', 'Palo Seco'].includes(match[0])) continue;
      // Also ignore component tags like <ChatBubble ...>
      if (line.substring(match.index-1, match.index) === '<' || line.substring(match.index-2, match.index) === '</') continue;
      
      allMatches.push(`${file}:${i+1}: ${match[0]} -> ${line.trim()}`);
    }
  }
}

if(allMatches.length > 0) {
  let u = [...new Set(allMatches)];
  console.log(u.join('\n'));
} else {
  console.log('No matches found.');
}
