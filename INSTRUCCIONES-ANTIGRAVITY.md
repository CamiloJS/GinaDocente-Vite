# PLAN MAESTRO (English TECH)

Prioridades de desarrollo para consolidar la plataforma:

1. **Rendimiento y Optimización (Lazy Loading):** Implementar `React.lazy` y `Suspense` para los componentes más pesados (como `GifPickerModal`, o pestañas secundarias) reduciendo el tiempo de carga inicial.
2. **Refuerzo de Seguridad en Firestore:** Revisar y asegurar las reglas de Firebase que actualmente podrían ser demasiado laxas, previniendo inyección de datos de cuentas no autorizadas.
3. **Filtro de Contenido en Backend:** Migrar la lógica de censura de malas palabras (`containsBadWords` en `helpers.js`) a una función Serverless de Vercel para que los estudiantes no puedan saltarse la restricción manipulando el cliente.
4. **Validación de UI Responsive:** Probar y asegurar la estabilidad de la nueva interfaz tipo "Facebook" (3 columnas) en dispositivos móviles para que las funciones táctiles y el menú inferior respondan bien.
5. **Migración de Dominio (Pendiente):** Organizar los redireccionamientos del dominio legacy (`gina-docente.vercel.app`) para que apunte al nuevo proyecto de forma fluida.

---

# INSTRUCCION #1
**(COMPLETADA ✅)** Verificar integridad de los cambios de UI y aplicar Lazy Loading.

---

# INSTRUCCION #2
**(COMPLETADA ✅)** Migrar Filtro de Contenido (malas palabras) al Backend mediante Serverless Function.

---

# INSTRUCCION #3

**Objetivo:** Refuerzo de Seguridad en Firestore (Mejora #2 del Plan Maestro).

**Acciones a implementar por Opencode (y el Propietario del Proyecto):**
Dado que no tengo acceso directo a la consola de Firebase, necesito que se actualicen las Reglas de Seguridad de Firestore manualmente. Actualmente, las reglas podrían permitir lectura/escritura pública o la manipulación de datos de otros usuarios.

Por favor, pide al usuario/propietario que ingrese a la consola de Firebase (proyecto: `ginadocente-unipamplona`), vaya a **Firestore Database > Reglas (Rules)** y reemplace todo el contenido por el siguiente código.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función auxiliar para verificar si el usuario está autenticado
    function isAuth() {
      return request.auth != null;
    }

    // Reglas para la ruta base de artifacts del proyecto
    match /artifacts/{appId} {
      
      // Datos públicos del proyecto (accesibles para lectura a cualquier usuario logueado)
      match /public/data/{document=**} {
        allow read: if isAuth();
        // Permitir escritura general a usuarios autenticados (Idealmente, aquí se restringiría 
        // a que solo la 'profesora' escriba tareas/syllabus, pero para no romper 
        // la lógica actual de chat y entregas de estudiantes, exigimos al menos auth)
        allow write: if isAuth(); 
      }
      
      // Datos privados de los usuarios (Historial del chatbot, preferencias, etc.)
      match /users/{userId}/{document=**} {
        // Solo el propio usuario puede leer y escribir en su documento
        allow read, write: if isAuth() && request.auth.uid == userId;
      }
    }
    
    // Bloquear acceso a cualquier otra colección fuera del scope del proyecto
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Acción adicional (Código):**
Asegúrate en el frontend de que no haya ninguna consulta o listener a Firebase que se inicialice *antes* de que el usuario inicie sesión. Si en `App.jsx` hay un `onSnapshot` corriendo sin estar el usuario autenticado, Firestore arrojará un error de "Missing or insufficient permissions" tras aplicar estas reglas.

**Entrega:** Confírmame en `REPORTE-OPENCODE.md` cuando el propietario haya pegado estas reglas en la consola y si probaste el flujo de login y navegación sin recibir errores de permisos en la consola del navegador.
