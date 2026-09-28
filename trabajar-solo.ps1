# SCRIPT DE ARRANQUE AUTONOMO — Lanza a Antigravity para que trabaje 100% solo
# Ejecutar:  powershell -ExecutionPolicy Bypass -File "C:\Users\Equipo\OneDrive\Documentos\Default Project\gina-vite\trabajar-solo.ps1"
# O con clic derecho > "Ejecutar con PowerShell"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  ENGLISH TECH - MODO AUTONOMO" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$workspace = "C:\Users\Equipo\OneDrive\Documentos\Default Project\gina-vite"
$agy = "C:\Users\Equipo\AppData\Local\agy\bin\agy.exe"
$conv = "13396f54-3ed3-45fd-a3ed-50c738c0bf59"
$notif = Join-Path $workspace "notificar-telegram.ps1"

function Notificar-Telegram($mensaje, $estado) {
    if (Test-Path $notif) {
        try {
            & powershell -ExecutionPolicy Bypass -File $notif -Mensaje $mensaje -Estado $estado 2>$null | Out-Null
        } catch {}
    }
}

if (!(Test-Path $agy)) { Write-Host "ERROR: agy.exe no encontrado" -ForegroundColor Red; Notificar-Telegram "ERROR DE ARRANQUE: agy.exe no encontrado al iniciar la ronda autónoma." "error"; exit 1 }
if (!(Test-Path $workspace)) { Write-Host "ERROR: workspace no encontrado" -ForegroundColor Red; exit 1 }

# Notificar inicio de ronda
$fecha = Get-Date -Format "dd/MM/yyyy HH:mm"
Notificar-Telegram "Ronda de trabajo autónoma iniciada ($fecha). Antigravity está trabajando." ""

Write-Host "Lanzando Antigravity en modo autonomo..." -ForegroundColor Yellow
Write-Host "  (trabaja solo, commitea, despliega y verifica)" -ForegroundColor Yellow
Write-Host "  (presiona Ctrl+C para detener)" -ForegroundColor Yellow
Write-Host ""

# Prompt maestro para que Antigravity trabaje sin depender de nadie
$prompt = @"
Eres el unico desarrollador de English TECH. Trabaja 100% SOLO en el workspace gina-vite.
Lee BRIEFING.md COMPLETO: es tu contexto maestro (rutas, credenciales, reglas, estado).

PRIORIDAD #1 (ABSOLUTA): que la pagina FUNCIONE. Antes de cualquier mejora nueva,
verifica que la app cargue y navegue sin errores en produccion. Si encuentras
cualquier bug que rompa la pagina, CORRIGELO PRIMERO. No agregues funciones nuevas
si la pagina no esta estable.

PROTOCOLO OBLIGATORIO (cada tarea):
- Implementa en el codigo dentro de gina-vite.
- Compila: & 'C:\Program Files\nodejs\npm.cmd' run build
- Despliega: vercel deploy --prod (desde gina-vite; el CLI ya esta logueado como
  edwincamilojaimes1-2302).
- Commit + push: git add -A; git commit -m 'mensaje en espanol'; git push origin main
- Actualiza REPORTE-OPENCODE.md con lo hecho.

NOTIFICACIONES POR TELEGRAM (OBLIGATORIO): despues de CADA tarea completada
(cada instruccion, cada bug corregido, cada deploy exitoso), ejecuta:
  powershell -ExecutionPolicy Bypass -File "$notif" -Mensaje "Texto del avance" -Estado "deploy"
  (o sin -Estado para un aviso normal, o -Estado "error" para errores).
Informa al usuario por Telegram: qué hiciste, commit, y URL. Asi el usuario
sigue el progreso sin abrir la consola.

Si algo requiere un clic o decision del usuario, escribelo en NOTAS-PARA-USUARIO.md
en gina-vite, notificalo por Telegram con -Estado "error", y detente.

Tienes permiso total: instala dependencias (npm install), crea scripts auxiliares,
corrige bugs, mejora lo que quieras, manteniendo las reglas del BRIEFING (100%
gratis, no guardar contrasenas, desplegar siempre desde gina-vite).

Cuando termines tu lista de tareas, responde con un resumen claro de lo hecho
y el estado de la app. NO preguntes antes de actuar: actua, y si hay dudas decide
tu con criterio conservador.
"@

# Ejecutar Antigravity con deteccion de fallos/tiempo
$salida = $null
$fallo = $null
try {
    $salida = & $agy --add-dir $workspace --conversation $conv --model gemini-3.1-pro-high --dangerously-skip-permissions --print $prompt --print-timeout 60m 2>&1
} catch {
    $fallo = $_.Exception.Message
}

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null -or $fallo) {
    Notificar-Telegram "⚠️ Antigravity se DETUVO o fallo (exit=$LASTEXITCODE). Detalle: $fallo. Revisa la maquina o relanza trabajar-solo.ps1." "error"
    Write-Host "Antigravity fallo. Notificado por Telegram." -ForegroundColor Red
} else {
    $resumen = ($salida | Out-String)
    if ($resumen -match "(?s)\.{3}") { }
    Notificar-Telegram "Ronda de trabajo de Antigravity TERMINADA. Revisa REPORTE-OPENCODE.md para el detalle. Puedes relanzar trabajar-solo.ps1 para otra ronda." "fin"
    Write-Host "Ronda terminada sin fallos. Notificado por Telegram." -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Antigravity termino su ronda." -ForegroundColor Cyan
Write-Host "  Revisa REPORTE-OPENCODE.md / NOTAS-PARA-USUARIO.md" -ForegroundColor Cyan
Write-Host "  Ejecuta este script de nuevo para otra ronda." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan