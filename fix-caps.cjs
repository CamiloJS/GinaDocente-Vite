const fs = require('fs');
const files = ['src/App.jsx', 'src/components/TaskCard.jsx', 'src/components/TasksTab.jsx'];
const replacements = [
  ['Ajustar Foto', 'Ajustar foto'],
  ['Crear Publicación', 'Crear publicación'],
  ['Publicar Presentación', 'Publicar presentación'],
  ['Generador Inteligente de Diapositivas', 'Generador inteligente de diapositivas'],
  ['Respuesta Correcta', 'Respuesta correcta'],
  ['Entrenamiento del Asistente Virtual', 'Entrenamiento del asistente virtual'],
  ['Añadir Info', 'Añadir info'],
  ['+ Nueva Materia', '+ Nueva materia'],
  ['Guardar Materia', 'Guardar materia'],
  ['Seleccionar Estudiantes (Múltiple)', 'Seleccionar estudiantes (múltiple)'],
  ['Nombre Real Completo', 'Nombre real completo'],
  ['Contraseña Inicial', 'Contraseña inicial'],
  ['Crear Estudiante', 'Crear estudiante'],
  ['Cambiar Etiqueta', 'Cambiar etiqueta'],
  ['Modificar Nota', 'Modificar nota'],
  ['Crear Nueva Evaluación', 'Crear nueva evaluación'],
  ['Configuración General', 'Configuración general'],
  ['Título de la Evaluación', 'Título de la evaluación'],
  ['Fecha Límite', 'Fecha límite'],
  ['Hora Límite', 'Hora límite'],
  ['Selección Múltiple', 'Selección múltiple'],
  ['Escribir Respuesta', 'Escribir respuesta'],
  ['Añadir Pregunta', 'Añadir pregunta'],
  ['Guardar Evaluación', 'Guardar evaluación'],
  ['Ver Resultados', 'Ver resultados'],
  ['Evaluación Cerrada', 'Evaluación cerrada'],
  ['Empezar Prueba', 'Empezar prueba'],
  ['Alternar Modo Oscuro', 'Alternar modo oscuro'],
  ['Acceso Docente', 'Acceso docente'],
  ['Acceso Estudiante', 'Acceso estudiante'],
  ['Mi Perfil', 'Mi perfil'],
  ['Entrenar Bot', 'Entrenar bot'],
  ['Mensajes Directos', 'Mensajes directos'],
  ['Crear Grupo', 'Crear grupo'],
  ['Nueva Tarea', 'Nueva tarea'],
  ['Nuevo Mensaje', 'Nuevo mensaje'],
  ['Cerrar Sesión', 'Cerrar sesión'],
  ['Guardar Cambios', 'Guardar cambios'],
  ['Publicar Tarea', 'Publicar tarea'],
  ['Crear Presentación', 'Crear presentación'],
  ['Ver Entregas', 'Ver entregas'],
  ['Subir Evidencia', 'Subir evidencia'],
  ['Asignar Nota', 'Asignar nota'],
  ['Enviar Mensaje', 'Enviar mensaje'],
  ['Adjuntar Archivo', 'Adjuntar archivo'],
  ['Buscar Mensajes...', 'Buscar mensajes...'],
  ['Buscar Alumno...', 'Buscar alumno...'],
  ['Buscar Tareas...', 'Buscar tareas...'],
  ['Sin Calificar', 'Sin calificar'],
  ['Ocultar Comentarios', 'Ocultar comentarios'],
  ['Ver Comentarios', 'Ver comentarios'],
  ['Escribir Comentario...', 'Escribir comentario...'],
  ['Cargar Más', 'Cargar más'],
  ['Justo Ahora', 'Justo ahora']
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
