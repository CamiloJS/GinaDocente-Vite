const fs = require('fs');

function repl(file, oldStr, newStr) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.split(oldStr).join(newStr);
  fs.writeFileSync(file, c, 'utf8');
}

// App.jsx
repl('src/App.jsx', 'Edición de Diapositivas', 'Edición de diapositivas');
repl('src/App.jsx', 'Título de la Presentación', 'Título de la presentación');
repl('src/App.jsx', 'Directorio y Materias', 'Directorio y materias');
repl('src/App.jsx', 'Gestión de Materias', 'Gestión de materias');
repl('src/App.jsx', 'Nombre de la Materia / Grupo', 'Nombre de la materia / grupo');
repl('src/App.jsx', 'Nombre de Usuario', 'Nombre de usuario');
repl('src/App.jsx', 'Directorio de Estudiantes', 'Directorio de estudiantes');
repl('src/App.jsx', 'Terminar y Enviar', 'Terminar y enviar');
repl('src/App.jsx', 'Fecha de Entrega', 'Fecha de entrega');
repl('src/App.jsx', 'Buzón de Sugerencias', 'Buzón de sugerencias');
repl('src/App.jsx', 'Alertas de Conducta', 'Alertas de conducta');
repl('src/App.jsx', 'Nombre del Grupo', 'Nombre del grupo');
repl('src/App.jsx', 'Color del Chat', 'Color del chat');
repl('src/App.jsx', 'Patrón de Fondo', 'Patrón de fondo');
repl('src/App.jsx', 'Cerebro del Bot de Ayuda', 'Cerebro del bot de ayuda');

// TasksTab.jsx
repl('src/components/TasksTab.jsx', 'Muro de Clase', 'Muro de clase');
repl('src/components/TasksTab.jsx', 'Créalas en el Directorio', 'Créalas en el directorio');
repl('src/components/TasksTab.jsx', 'Materia o Grupo', 'materia o grupo');

// GifPickerModal.jsx
repl('src/components/GifPickerModal.jsx', 'presiona Buscar', 'presiona Buscar'); // Actually 'Buscar' refers to button name, maybe keep it. But let's lowercase it to be safe 'presiona buscar'
repl('src/components/GifPickerModal.jsx', 'presiona Buscar', 'presiona buscar'); 

console.log('Done!');
