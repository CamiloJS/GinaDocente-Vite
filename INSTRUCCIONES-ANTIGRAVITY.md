# PLAN MAESTRO (English TECH)

Prioridades de desarrollo para consolidar la plataforma:

1. **Rendimiento y Optimización (Lazy Loading):** Implementar `React.lazy` y `Suspense` para los componentes más pesados (como `GifPickerModal`, o pestañas secundarias) reduciendo el tiempo de carga inicial.
2. **Refuerzo de Seguridad en Firestore:** Revisar y asegurar las reglas de Firebase que actualmente podrían ser demasiado laxas, previniendo inyección de datos de cuentas no autorizadas.
3. **Filtro de Contenido en Backend:** Migrar la lógica de censura de malas palabras (`containsBadWords` en `helpers.js`) a una función Serverless de Vercel para que los estudiantes no puedan saltarse la restricción manipulando el cliente.
4. **Validación de UI Responsive:** Probar y asegurar la estabilidad de la nueva interfaz tipo "Facebook" (3 columnas) en dispositivos móviles para que las funciones táctiles y el menú inferior respondan bien.
5. **Migración de Dominio (Pendiente):** Organizar los redireccionamientos del dominio legacy (`gina-docente.vercel.app`) para que apunte al nuevo proyecto de forma fluida.

---

# INSTRUCCION #1

**Objetivo:** Verificar la integridad de los últimos cambios de UI (Layout 3 Columnas) y optimizar el rendimiento inicial.

**Acciones a implementar por Opencode:**
1. Ejecuta `npm run build` en la terminal para asegurarte de que los cambios de JSX que introduje en `App.jsx` (y el arreglo del bug de `setTaskTitle` en `<TasksTab>`) compilan correctamente sin errores.
2. Si el build es exitoso, corre `vercel deploy --prod` para subir los cambios a producción para que la profesora pueda ver el nuevo diseño estilo Facebook.
3. Extra: Envuelve las importaciones de componentes grandes en `App.jsx` (por ejemplo, `GifPickerModal` y `TasksTab`) con `React.lazy()` y agrega un `<Suspense fallback={<p>Cargando...</p>}>` alrededor de donde se renderizan, para iniciar con la mejora #1 del Plan Maestro.

**Entrega:** Documenta en `REPORTE-OPENCODE.md` si hubo errores en el build, si el deploy fue exitoso con el link final, y si aplicaste el Lazy Loading.
