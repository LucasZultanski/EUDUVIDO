#!/bin/bash
set -euo pipefail

# Script de teste rápido de envio de e-mail via SMTP (Gmail/Mailtrap)

SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USERNAME:-lucaszult@gmail.com}"        # seu email
SMTP_PASS="${SMTP_PASSWORD:-ecsz xzre kkwz gggl}"       # sua senha de app
FROM="${SMTP_FROM:-lucaszult@gmail.com}"                 # remetente
TO="${1:-lucasalmeidazult@gmail.com}"                    # destinatário padrão

if [ -z "${TO}" ]; then
  echo "Uso: ./test-email.sh email@destino.com"
  echo "Ou defina TEST_TO=email@destino.com"
  exit 1
fi

if [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASS" ]; then
  echo "⚠️  ERRO: Configure SMTP_USERNAME e SMTP_PASSWORD"
  echo ""
  echo "Instruções (Gmail):"
  echo "1. Ative 2FA: https://myaccount.google.com/security"
  echo "2. Gere senha de app: https://myaccount.google.com/apppasswords"
  echo "3. Exemplo:"
  echo "   export SMTP_USERNAME='seu-email@gmail.com'"
  echo "   export SMTP_PASSWORD='xxxx xxxx xxxx xxxx'"
  echo "   export SMTP_FROM='seu-email@gmail.com'"
  echo ""
  echo "Ou use Mailtrap:"
  echo "   export SMTP_HOST=sandbox.smtp.mailtrap.io"
  echo "   export SMTP_PORT=2525"
  echo "   export SMTP_USERNAME='<username>'"
  echo "   export SMTP_PASSWORD='<password>'"
  echo "   export SMTP_FROM='noreply@euduvido.com'"
  exit 1
fi

echo "Enviando e-mail de teste para: $TO"
echo "Via: $SMTP_HOST:$SMTP_PORT"
echo ""

curl -v --ssl-reqd \
  --url "smtp://${SMTP_HOST}:${SMTP_PORT}" \
  --user "${SMTP_USER}:${SMTP_PASS}" \
  --mail-from "${FROM}" \
  --mail-rcpt "${TO}" \
  --upload-file - <<EOF
From: Eu-Duvido Sistema <${FROM}>
To: Usuario Teste <${TO}>
Subject: Teste de Configuracao SMTP - Eu Duvido
Content-Type: text/plain; charset=UTF-8

Ola!

Este e-mail confirma que a configuracao SMTP esta funcionando.

Detalhes:
- Servidor: ${SMTP_HOST}:${SMTP_PORT}
- Usuario: ${SMTP_USER}
- Horario: $(date)

Se voce recebeu esta mensagem, a integracao esta OK!

Sistema Eu-Duvido
EOF

echo ""
echo "✓ Enviado. Verifique a caixa de entrada (ou Spam) de ${TO}"
