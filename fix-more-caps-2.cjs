const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');
content = content.replace('title="Personalizar Chat"', 'title="Personalizar chat"');
content = content.replace('title="Eliminar Grupo"', 'title="Eliminar grupo"');
content = content.replace('title="Abandonar Grupo"', 'title="Abandonar grupo"');
content = content.replace('title="Vaciar Chat"', 'title="Vaciar chat"');
fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('Done!');
