# notificar-telegram.ps1 — Envía un mensaje a @CacharroServerBot
# Uso: powershell -ExecutionPolicy Bypass -File notificar-telegram.ps1 -Mensaje "texto" [-Estado ""|"deploy"|"fin"|"error"]

param(
    [Parameter(Mandatory=$true)][string]$Mensaje,
    [string]$Estado = ""
)

$TOKEN = "8857900385:AAFpc41dqDbhCdN_UnJaCDGTpyFO82OC2DA"
$CHAT_ID = "5429715722"

function Enviar($chatId, $text) {
    $body = "chat_id=$chatId&text=" + [uri]::EscapeDataString($text) + "&parse_mode=HTML&disable_web_page_preview=true"
    $res = & curl.exe -s -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" -d $body
    return $res
}

$icono = ""
if ($Estado -eq "error") { $icono = "❌" }
elseif ($Estado -eq "deploy") { $icono = "🚀" }
elseif ($Estado -eq "fin") { $icono = "✅" }
else { $icono = "🤖" }

$texto = "$icono <b>English TECH</b>`n$Mensaje"
if ($Estado -eq "error") { $texto += "`n`n⚠️ Revisa la máquina y el proyecto." }

$r = Enviar $CHAT_ID $texto
Write-Output $r