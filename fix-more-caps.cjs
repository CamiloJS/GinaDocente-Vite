const fs = require('fs');
const files = ['src/App.jsx', 'src/components/TaskCard.jsx', 'src/components/TasksTab.jsx'];
const replacements = [
  ['Chats Activos', 'Chats activos'],
  ['Tus Mensajes', 'Tus mensajes'],
  ['Crear Nuevo Grupo', 'Crear nuevo grupo'],
  ['Seleccionar Miembros', 'Seleccionar miembros'],
  ['Seleccionar Materia / Grupo (Obligatorio)', 'Seleccionar materia / grupo (obligatorio)'],
  ['Adjuntar Documento', 'Adjuntar documento'],
  ['Funciones IA', 'Funciones IA'], // Actually this one is fine
  ['Enviar Mensaje', 'Enviar mensaje'],
  ['Subir Evidencia', 'Subir evidencia'],
  ['Ver Entregas', 'Ver entregas'],
  ['Asignar Nota', 'Asignar nota']
];
for (let file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  for (let [oldStr, newStr] of replacements) {
    content = content.split(oldStr).join(newStr);
  }
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Done!');
