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

if (!(Test-Path $agy)) { Write-Host "ERROR: agy.exe no encontrado" -ForegroundColor Red; exit 1 }
if (!(Test-Path $workspace)) { Write-Host "ERROR: workspace no encontrado" -ForegroundColor Red; exit 1 }

Write-Host "Lanzando Antigravity en modo autonomo..." -ForegroundColor Yellow
Write-Host "  (trabaja solo, commitea, despliega y verifica)" -ForegroundColor Yellow
Write-Host "  (presiona Ctrl+C para detener)" -ForegroundColor Yellow
Write-Host ""

# Prompt maestro para que Antigravity trabaje sin depender de nadie
$prompt = @"
Eres el unico desarrollador de English TECH. Trabaja 100% SOLO en el workspace gina-vite.
Lee BRIEFING.md COMPLETO: es tu contexto maestro (rutas, credenciales, reglas, estado).

ESTADO ACTUAL (continuar desde aqui, NO empezar de cero):
1. PRIORIDAD 1: investigar y corregir el bug de la pantalla "Ups! Algo salio mal"
   (ErrorBoundary). El ErrorBoundary ahora muestra el stack trace en pantalla
   (window.__ebError). Reproduce el error navegando la app o desplegando, lee el
   stack trace, corrige la causa raiz, y cuando este resuelto elimina el <pre> de
   diagnostico del ErrorBoundary.
2. Terminar la INSTRUCCION #30 (TTS / lector de voz): ya existe el icono Volume2.
   Crear speakText() y anadir botones junto a los de copiar en el chat.
3. Despues, continuar mejorando por tu cuenta (sigue numerando INSTRUCCIONES en
   INSTRUCCIONES-ANTIGRAVITY.md y reportando en REPORTE-OPENCODE.md).

PROTOCOLO OBLIGATORIO (cada tarea):
- Implementa en el codigo dentro de gina-vite.
- Compila: & 'C:\Program Files\nodejs\npm.cmd' run build
- Despliega: vercel deploy --prod (desde gina-vite; el CLI ya esta logueado como
  edwincamilojaimes1-2302).
- Commit + push: git add -A; git commit -m 'mensaje en espanol'; git push origin main
- Actualiza REPORTE-OPENCODE.md con lo hecho.
- Si algo requiere un clic o decision del usuario, escribelo en NOTAS-PARA-USUARIO.md
  en gina-vite y detente para avisar.

Tienes permiso total: instala dependencias (npm install), crea scripts auxiliares,
corrige bugs, mejora lo que quieras, manteniendo las reglas del BRIEFING (100%
gratis, no guardar contrasenas, desplegar siempre desde gina-vite).

Cuando termines toda tu lista de tareas, responde con un resumen claro de lo hecho
y el estado de la app. NO preguntes antes de actuar: actua, y si hay dudas decide
tu con criterio conservador.
"@

& $agy --add-dir $workspace --conversation $conv --model gemini-3.1-pro-high --dangerously-skip-permissions --print $prompt --print-timeout 30m

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Antigravity termino su ronda." -ForegroundColor Cyan
Write-Host "  Revisa REPORTE-OPENCODE.md / NOTAS-PARA-USUARIO.md" -ForegroundColor Cyan
Write-Host "  Ejecuta este script de nuevo para otra ronda." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan