# Script de teste de e-mail via Gmail SMTP (PowerShell)

param(
    [string]$To = "lucasalmeidazult@gmail.com"  # destinatário padrão
)

$SMTP_HOST = if ($env:SMTP_HOST) { $env:SMTP_HOST } else { "smtp.gmail.com" }
$SMTP_PORT = if ($env:SMTP_PORT) { $env:SMTP_PORT } else { "587" }
$SMTP_USER = if ($env:SMTP_USERNAME) { $env:SMTP_USERNAME } else { "lucaszult@gmail.com" }
$SMTP_PASS = if ($env:SMTP_PASSWORD) { $env:SMTP_PASSWORD } else { "ecsz xzre kkwz gggl" }
$FROM      = if ($env:SMTP_FROM) { $env:SMTP_FROM } else { "lucaszult@gmail.com" }

if ([string]::IsNullOrWhiteSpace($SMTP_USER) -or [string]::IsNullOrWhiteSpace($SMTP_PASS)) {
    Write-Host "⚠️  ERRO: Configure SMTP_USERNAME e SMTP_PASSWORD" -ForegroundColor Red
    Write-Host ""
    Write-Host "Gmail (2FA + App Password):" -ForegroundColor Yellow
    Write-Host '  $env:SMTP_USERNAME="seu-email@gmail.com"'
    Write-Host '  $env:SMTP_PASSWORD="xxxx xxxx xxxx xxxx"'
    Write-Host '  $env:SMTP_FROM="seu-email@gmail.com"'
    Write-Host ""
    Write-Host "Mailtrap:" -ForegroundColor Yellow
    Write-Host '  $env:SMTP_HOST="sandbox.smtp.mailtrap.io"'
    Write-Host '  $env:SMTP_PORT="2525"'
    Write-Host '  $env:SMTP_USERNAME="<username>"'
    Write-Host '  $env:SMTP_PASSWORD="<password>"'
    Write-Host '  $env:SMTP_FROM="noreply@euduvido.com"'
    exit 1
}

Write-Host "Enviando e-mail de teste para: $To" -ForegroundColor Cyan
Write-Host "Via: ${SMTP_HOST}:${SMTP_PORT}" -ForegroundColor Cyan
Write-Host ""

$emailBody = @"
From: Eu-Duvido Sistema <$FROM>
To: Usuario Teste <$To>
Subject: Teste de Configuracao SMTP - Eu Duvido
Content-Type: text/plain; charset=UTF-8

Ola!

Este e-mail confirma que a configuracao SMTP esta funcionando.

Detalhes:
- Servidor: ${SMTP_HOST}:${SMTP_PORT}
- Usuario: $SMTP_USER
- Horario: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")

Se voce recebeu esta mensagem, a integracao esta OK!

Sistema Eu-Duvido
"@

try {
    $emailBody | curl.exe -v --ssl-reqd `
        --url "smtp://${SMTP_HOST}:${SMTP_PORT}" `
        --user "${SMTP_USER}:${SMTP_PASS}" `
        --mail-from "$FROM" `
        --mail-rcpt "$To" `
        --upload-file -
    Write-Host "`n✓ E-mail enviado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "`n✗ Erro ao enviar e-mail: $_" -ForegroundColor Red
    exit 1
}
