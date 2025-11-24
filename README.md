https://drive.google.com/drive/folders/1VG_ZIUqhIpQm1w_RB-ID5fDt8pJA9bHL?usp=drive_link
# Eu-Duvido

Bem-vindos ao "Eu-Duvido" — um espaço onde desafios reais se transformam em apostas sociais com provas concretas. 

## Introdução

O **Eu-Duvido** é uma plataforma web desenvolvida com o propósito de integrar o conceito de apostas sociais a desafios reais, promovendo o engajamento e a motivação pessoal por meio de recompensas concretas.

A aplicação permite que os usuários criem, aceitem e participem de desafios cotidianos, tais como frequentar a academia, acordar cedo, concluir a leitura de um livro, abandonar hábitos nocivos, entre outros. Cada desafio envolve uma aposta financeira, cujo valor é destinado a reforçar o comprometimento dos participantes.

Durante o período estipulado para o desafio, os usuários devem **comprovar o cumprimento das metas** por meio de **fotos, vídeos ou outras formas de evidência verificável**. O sistema atua como **intermediário de confiança**, mantendo o valor apostado em **custódia segura** até a conclusão do desafio. Ao término, uma **taxa variável** é aplicada, de acordo com a **duração e a complexidade** da atividade proposta.

O principal objetivo do projeto é **estimular hábitos positivos**, **incentivar a interação social** e **transformar a autodisciplina em uma experiência dinâmica e recompensadora**, aliando tecnologia, comprometimento e entretenimento.

## Dúvidas comuns

1. Como funcionam as apostas?
Cada desafio tem um valor apostado. O dinheiro fica bloqueado até o fim do período definido. Se o participante cumprir a prova com sucesso, o valor é liberado de acordo com as regras do desafio.

2. Como é feita a comprovação?
Por meio de fotos, vídeos ou outras evidências, que são avaliadas automaticamente pelo sistema e/ou pelos outros participantes.

3. Existe uma taxa?
Sim. O Eu-Duvido aplica uma taxa variável dependendo da duração e do tipo de desafio.

4. É possível desafiar amigos?
Sim! O sistema incentiva desafios entre amigos ou grupos, tornando a experiência mais competitiva e divertida.

## Código de conduta

Para manter a comunidade saudável e colaborativa, todos os usuários e contribuidores devem seguir estas diretrizes:

> Respeito acima de tudo — nenhum tipo de ofensa, discriminação ou assédio será tolerado.
> Desafios éticos e seguros — não serão permitidos desafios que coloquem em risco a integridade física, emocional ou moral dos participantes.
> Transparência e honestidade — provas falsas, manipulação de resultados ou trapaças resultam em banimento.
> Colaboração construtiva — sugestões, críticas e contribuições são sempre bem-vindas, desde que feitas com respeito.
> Privacidade — é proibido compartilhar informações pessoais ou evidências de outros usuários sem consentimento.

# Telas do Sistema *Eu Duvido*

Este documento apresenta a descrição das telas e fluxos principais do sistema **Eu Duvido**, incluindo telas de navegação, criação de desafios, perfil e mecanismos de prova.

---

## 1. Tela de Boas-Vindas
- Tela inicial (splash screen), exibida rapidamente.
- Mostra o logo e a mensagem **“Seja bem-vindo”**.

---

## 2. Tela Inicial
Tela de acesso ao sistema, com duas opções:

### **Login**
- E-mail  
- Senha  

### **Cadastro**
- Nome  
- E-mail  
- Senha  
- Confirmação da senha  

---

## 3. Tela Principal
- **Gráfico** com desafios vencidos.  
- **Desafios Ativos**  
  - Lista dos desafios em andamento  
  - Botão para anexar evidências  
- **Desafios Públicos**  
  - Título  
  - Resumo / descrição  
  - Tipo de prova  
  - Valor do desafio  
  - Botão **"Aceitar desafio"**

---

## 4. Tela Criar Desafio

### **Etapa 1 — Informações Básicas**
- Título  
- Descrição (com limite de caracteres)

### **Etapa 2 — Regras e Provas**
- Valor da aposta  
- Data inicial  
- Data de término  
- Tipo de prova  

### **Etapa 3 — Visibilidade**
- Público ou privado  
- Resumo do desafio  
- Geração de QR Code ou link de compartilhamento  

### **Etapa 4 — Confirmação**
- Resumo final do desafio  
- Valor total apostado  

---

## 5. Tela de Perfil
- Edição dos dados do perfil:
  - Nome  
  - Foto  
- Link para a página de suporte  
- **Carteira**
  - Saldo  
  - Valor apostado  
  - Retorno  
- Botão de **Sair**

---

## 6. Tela de Suporte
- Informações gerais sobre regras e funcionamento do sistema *Eu Duvido*.

---

## 7. Tela de Prova
- Anexar foto (evidência da prova).  
- Avaliar evidências de outros participantes:  
  - Validar como **sim** ou **não**  
  - Em caso de rejeição, escrever um comentário  
- Gráfico com a distribuição dos votos  

---

## 8. Pop-up de Premiação
- Exibição da premiação com animação.  
- Nome do desafio.  
- Botão de **Sair**.

---

## 9. Barra de Navegação (Nav Bar)
- **Home** → Tela principal  
- **Criar Desafio** → Fluxo de criação  
- **Perfil** → Tela do usuário  

---

# Login por Link Mágico (SMTP)

## Configuração Gmail SMTP (GRATUITO)

### Passo 1: Configurar Gmail

1. Acesse [Google Account Security](https://myaccount.google.com/security)
2. Ative **Verificação em duas etapas** se ainda não estiver ativa
3. Acesse [App Passwords](https://myaccount.google.com/apppasswords)
4. Selecione **E-mail** → **Outro (nome personalizado)** → Digite "Eu-Duvido"
5. Clique em **Gerar** e copie a senha de 16 caracteres

### Passo 2: Configurar Variáveis de Ambiente

**Windows (PowerShell):**
```powershell
$env:SPRING_PROFILES_ACTIVE="smtp"
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USERNAME="seu-email@gmail.com"
$env:SMTP_PASSWORD="sua-senha-de-app"  # senha de app (Gmail)
$env:SMTP_FROM="seu-email@gmail.com"
```

**Linux/macOS:**
```bash
export SPRING_PROFILES_ACTIVE=smtp
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USERNAME=seu-email@gmail.com
export SMTP_PASSWORD="sua-senha-de-app"  # senha de app (Gmail)
export SMTP_FROM=seu-email@gmail.com
```

### Passo 3: Iniciar o Serviço

```bash
cd auth-service
mvn spring-boot:run
```

## Testando o Envio de E-mails

### Teste Rápido (suas credenciais já configuradas):

**Windows (PowerShell):**
```powershell
# Testar com destinatário padrão
.\test-email.ps1

# Ou especificar outro destinatário:
.\test-email.ps1 -To outro-email@example.com
```

**Linux/macOS:**
```bash
# Testar com destinatário padrão
./test-email.sh

# Ou especificar outro destinatário:
./test-email.sh outro-email@example.com
```

### Configurar para uso com a aplicação:

**Windows (PowerShell):**
```powershell
$env:SPRING_PROFILES_ACTIVE="smtp"
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USERNAME="seu-email@gmail.com"
$env:SMTP_PASSWORD="sua-senha-de-app"
$env:SMTP_FROM="seu-email@gmail.com"

cd auth-service
mvn spring-boot:run
```

**Linux/macOS:**
```bash
export SPRING_PROFILES_ACTIVE=smtp
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USERNAME=seu-email@gmail.com
export SMTP_PASSWORD="sua-senha-de-app"
export SMTP_FROM=seu-email@gmail.com

cd auth-service
mvn spring-boot:run
```

## Testando o Envio de E-mails

### Teste via PowerShell (Windows):

```powershell
# Configure as variáveis antes:
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USERNAME="seu-email@gmail.com"
$env:SMTP_PASSWORD="sua-senha-de-app"
$env:SMTP_FROM="seu-email@gmail.com"
$env:TEST_TO="seu-email@gmail.com"

.\test-email.ps1
```

### Teste via Bash (Linux/macOS):

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USERNAME=seu-email@gmail.com
export SMTP_PASSWORD="sua-senha-de-app"
export SMTP_FROM=seu-email@gmail.com
export TEST_TO=seu-email@gmail.com

./test-email.sh
```

### Teste via cURL (linha de comando):

**Windows (PowerShell):**
```powershell
$emailBody = @"
From: Eu-Duvido <noreply@euduvido.com>
To: Teste <test@example.com>
Subject: Teste - Eu Duvido
Content-Type: text/plain; charset=UTF-8

Teste de integração SMTP.
"@

$emailBody | curl.exe --ssl-reqd `
  --url "smtp://sandbox.smtp.mailtrap.io:2525" `
  --user "usuario:senha" `
  --mail-from "noreply@euduvido.com" `
  --mail-rcpt "test@example.com" `
  --upload-file -
```

**Linux/macOS:**
```bash
curl --ssl-reqd \
  --url 'smtp://sandbox.smtp.mailtrap.io:2525' \
  --user 'usuario:senha' \
  --mail-from noreply@euduvido.com \
  --mail-rcpt seu-email@example.com \
  --upload-file - <<EOF
From: Eu-Duvido <noreply@euduvido.com>
To: Teste <seu-email@example.com>
Subject: Teste de E-mail - Eu Duvido
Content-Type: text/plain; charset=UTF-8

Olá!

Este é um e-mail de teste do sistema Eu-Duvido.

Se você recebeu esta mensagem, a integração com Mailtrap está funcionando.

Sistema Eu-Duvido
EOF
```

### Teste via aplicação:

1. Inicie o `auth-service` com profile `smtp`:
   ```bash
   # Windows PowerShell
   $env:SPRING_PROFILES_ACTIVE="smtp"
   cd auth-service
   mvn spring-boot:run
   
   # Linux/macOS
   export SPRING_PROFILES_ACTIVE=smtp
   cd auth-service
   mvn spring-boot:run
   ```

2. No frontend, clique em "Entrar com link mágico" e insira seu e-mail

3. Verifique a inbox do Mailtrap em: https://mailtrap.io/inboxes

### Verificar logs de e-mail:

Os e-mails enviados aparecem nos logs do auth-service:
```
[SMTP] E-mail enviado para usuario@example.com via sandbox.smtp.mailtrap.io:2525
```

Se houver falha, o sistema usa fallback e loga no console:
```
[SMTP-FAKE] To: usuario@example.com
Subject: Seu link de login - Eu Duvido
...
```

### Troubleshooting:

- **E-mails não aparecem no Mailtrap**: Verifique se as credenciais estão corretas
- **Timeout de conexão**: Verifique firewall e conectividade com sandbox.smtp.mailtrap.io:2525
- **Autenticação falha**: Confirme username/password exatos do Mailtrap
- **Profile errado**: Certifique-se que `SPRING_PROFILES_ACTIVE=smtp` está definido

### Convites de Desafio também enviam e-mail:

Quando você convida um amigo para um desafio, o sistema tenta enviar um e-mail automático com:
- Nome do desafio
- Valor da aposta
- Nome de quem convidou

Esses e-mails também aparecem no Mailtrap durante testes.

### Troubleshooting:

- **E-mails não chegam**: Verifique a pasta de Spam/Lixeira do destinatário
- **Erro de autenticação**: Confirme que:
  - Verificação em duas etapas está ativa
  - Senha de app foi gerada corretamente (16 caracteres)
  - Você está usando a senha de app, NÃO a senha normal da conta
- **Timeout de conexão**: Verifique firewall na porta 587
- **Profile errado**: Certifique-se que `SPRING_PROFILES_ACTIVE=smtp` está definido
- **Gmail bloqueou**: Acesse [Atividade da conta](https://myaccount.google.com/notifications) e autorize o app

### Limites do Gmail (Conta Gratuita):

- **500 e-mails/dia** por conta
- **Limite de 100 destinatários** por e-mail (suficiente para este projeto)
- Se precisar de mais, considere usar conta Google Workspace

# EUDUVIDO-main

## Tecnologias Utilizadas

- **React**: Interface de usuário.
- **TypeScript**: Tipagem estática.
- **Node.js + Express**: Backend e API.
- **MongoDB**: Banco de dados.
- **Mongoose**: Integração com MongoDB.
- **Axios**: Requisições HTTP.
- **Styled-components**: Estilização.
- **JWT**: Autenticação.
- **React Router**: Rotas no frontend.

## Principais Lógicas Implementadas

- **Autenticação de Usuário**: Cadastro, login e proteção de rotas utilizando JWT.
- **CRUD de Perguntas e Respostas**: Usuários podem criar, visualizar, editar e excluir perguntas e respostas.
- **Sistema de Votação**: Implementação de lógica para votar em perguntas e respostas.
- **Busca e Filtros**: Permite pesquisar perguntas por palavras-chave e filtrar por categorias.
- **Notificações**: Usuários recebem notificações sobre interações relevantes.
- **Validação de Dados**: Validação de formulários no frontend e backend para garantir integridade dos dados.
- **Controle de Permissões**: Diferenciação entre usuários comuns e administradores para acesso a funcionalidades específicas.
- **Persistência de Sessão**: Manutenção da sessão do usuário utilizando tokens e armazenamento local.

## Estrutura do Projeto

- `/frontend`: Código do React e arquivos relacionados à interface.
- `/backend`: Código do Node.js/Express e integração com MongoDB.
- `/models`: Modelos de dados utilizados pelo Mongoose.
- `/routes`: Rotas da API.
- `/controllers`: Lógicas de negócio e manipulação de dados.

---

