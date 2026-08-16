# notificar-telegram.ps1 — Envía un mensaje a @CacharroServerBot
# Uso: powershell -ExecutionPolicy Bypass -File notificar-telegram.ps1 -Mensaje "texto"
# Detecta y guarda el chat_id automáticamente si aún no se conoce.

param(
    [Parameter(Mandatory=$true)][string]$Mensaje,
    [string]$Estado = ""
)

$TOKEN = "8857900385:AAFpc41dqDbhCdN_UnJaCDGTpyFO82OC2DA"
$cfg = "C:\Users\Equipo\OneDrive\Documentos\Default Project\gina-vite\.telegram-chatid.txt"

function Guardar-ChatId($id) { Set-Content -Path $cfg -Value $id -Encoding UTF8 }
function Enviar($chatId, $text) {
    $json = @{ chat_id = $chatId; text = $text; parse_mode = "HTML"; disable_web_page_preview = $true } | ConvertTo-Json -Compress
    $body = "chat_id=$chatId&text=" + [uri]::EscapeDataString($text) + "&parse_mode=HTML&disable_web_page_preview=true"
    $res = & curl.exe -s -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" -d $body
    return $res
}

# 1) Intentar con chat_id conocido
$chatId = $null
if (Test-Path $cfg) { $chatId = (Get-Content $cfg -Raw).Trim() }

# 2) Si no se conoce, detectar vía getUpdates (el usuario debe haberle escrito /start al bot)
if (-not $chatId) {
    $updates = & curl.exe -s "https://api.telegram.org/bot$TOKEN/getUpdates" | ConvertFrom-Json
    $msg = $updates.result | Where-Object { $_.message -and $_.message.chat } | Select-Object -First 1
    if ($msg) { $chatId = [string]$msg.message.chat.id; Guardar-ChatId $chatId }
}

if (-not $chatId) {
    Write-Output "SIN_CHAT_ID: no se pudo detectar. Escribe /start al bot @CacharroServerBot y vuelve a intentar."
    exit 1
}

$icono = ""
if ($Estado -eq "error") { $icono = "❌" }
elseif ($Estado -eq "deploy") { $icono = "🚀" }
elseif ($Estado -eq "fin") { $icono = "✅" }
else { $icono = "🤖" }

$texto = "$icono <b>English TECH</b>`n$Mensaje"
if ($Estado -eq "error") { $texto += "`n`n⚠️ Revisa la máquina y el proyecto." }

$r = Enviar $chatId $texto
Write-Output $r