package com.example.auth_service.infrastructure.mail;

import com.example.auth_service.application.ports.MailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

@Component
@Profile({"prod","smtp","default"}) // ALTERADO: também ativo no perfil "default"
public class SmtpMailSender implements MailSender {
    private static final Logger log = LoggerFactory.getLogger(SmtpMailSender.class);

    // ALTERADO: Defaults para Gmail SMTP (gratuito)
    private final String host = readStr("SMTP_HOST", "smtp.host", "smtp.gmail.com");
    private final int port = readInt("SMTP_PORT", "smtp.port", 587);
    private final String username = readStr("SMTP_USERNAME", "smtp.username", "");
    private final String password = readStr("SMTP_PASSWORD", "smtp.password", "");
    private final String from = readStr("SMTP_FROM", "smtp.from", "");
    
    public SmtpMailSender() {
        log.info("SMTP config → host={}, port={}, username={}", host, port, username.isBlank() ? "<vazio>" : maskEmail(username));
        if (host.isBlank() || username.isBlank() || password.isBlank()) {
            log.warn("Credenciais SMTP incompletas. Para Gmail:");
            log.warn("  1. Ative verificação em 2 etapas em myaccount.google.com/security");
            log.warn("  2. Gere senha de app em myaccount.google.com/apppasswords");
            log.warn("  3. Configure: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587");
            log.warn("  4. SMTP_USERNAME=seu-email@gmail.com, SMTP_PASSWORD=senha-app-16-chars");
            log.warn("  5. SMTP_FROM=seu-email@gmail.com");
        }
    }

    @Override
    public void sendMagicLink(String to, String magicLink, Instant expiresAt) {
        final String subject = "Seu link de login - Eu Duvido";
        final String body = "Olá!\r\n\r\n" +
                "Use o link abaixo para entrar no Eu Duvido:\r\n" +
                magicLink + "\r\n\r\n" +
                "Este link expira em: " + expiresAt + "\r\n\r\n" +
                "Se você não solicitou, ignore este e-mail.\r\n";
        final String dateHdr = DateTimeFormatter.RFC_1123_DATE_TIME.format(ZonedDateTime.now()); // NOVO

        if (host == null || host.isBlank() || username.isBlank() || password.isBlank()) {
            log.warn("SMTP não configurado completamente. Enviando no log (fallback).");
            log.info("[SMTP-FAKE] To: {}\nSubject: {}\n\n{}", to, subject, body);
            return;
        }

        // NOVO: suporta TLS implícito (465) e timeout
        try (Socket socket = (port == 465
                ? ((javax.net.ssl.SSLSocketFactory) javax.net.ssl.SSLSocketFactory.getDefault()).createSocket(host, port)
                : new Socket(host, port));
             var reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
             Writer writer = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8)) {

            try { socket.setSoTimeout(15000); } catch (Exception ignore) {}

            // Helpers
            var send = (java.util.function.Consumer<String>) line -> {
                try {
                    writer.write(line + "\r\n");
                    writer.flush();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            };
            var readLine = (java.util.function.Supplier<String>) () -> {
                try { return reader.readLine(); } catch (Exception e) { throw new RuntimeException(e); }
            };

            // Banner
            String banner = readLine.get();
            log.debug("SMTP Banner: {}", banner);

            // EHLO
            send.accept("EHLO " + java.net.InetAddress.getLocalHost().getHostName());
            String l;
            do {
                l = readLine.get();
                log.debug("EHLO response: {}", l);
            } while (l != null && l.startsWith("250-"));

            // STARTTLS (porta 587)
            if (port == 587) {
                send.accept("STARTTLS");
                String tlsResp = readLine.get();
                log.debug("STARTTLS response: {}", tlsResp);
                if (!tlsResp.startsWith("220")) {
                    throw new IllegalStateException("STARTTLS falhou: " + tlsResp);
                }

                // Upgrade para TLS
                var sslSocket = ((javax.net.ssl.SSLSocketFactory) javax.net.ssl.SSLSocketFactory.getDefault())
                        .createSocket(socket, host, port, true);
                var tlsReader = new BufferedReader(new InputStreamReader(sslSocket.getInputStream(), StandardCharsets.UTF_8));
                var tlsWriter = new OutputStreamWriter(sslSocket.getOutputStream(), StandardCharsets.UTF_8);

                // Re-definir send/readLine para usar a conexão TLS
                final var finalTlsWriter = tlsWriter;
                final var finalTlsReader = tlsReader;
                
                var tlsSend = (java.util.function.Consumer<String>) line -> {
                    try {
                        finalTlsWriter.write(line + "\r\n");
                        finalTlsWriter.flush();
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                };
                
                var tlsReadLine = (java.util.function.Supplier<String>) () -> {
                    try { return finalTlsReader.readLine(); } catch (Exception e) { throw new RuntimeException(e); }
                };

                // Novo EHLO após TLS
                tlsSend.accept("EHLO " + java.net.InetAddress.getLocalHost().getHostName());
                do {
                    l = tlsReadLine.get();
                    log.debug("EHLO TLS response: {}", l);
                } while (l != null && l.startsWith("250-"));

                // AUTH LOGIN
                tlsSend.accept("AUTH LOGIN");
                tlsReadLine.get();
                tlsSend.accept(Base64.getEncoder().encodeToString(username.getBytes(StandardCharsets.UTF_8)));
                tlsReadLine.get();
                tlsSend.accept(Base64.getEncoder().encodeToString(password.getBytes(StandardCharsets.UTF_8)));
                String authResp = tlsReadLine.get();
                if (!authResp.startsWith("235")) {
                    throw new IllegalStateException("Autenticação SMTP falhou: " + authResp);
                }

                // MAIL FROM / RCPT TO / DATA
                String fromAddr = from.isBlank() ? username : from;
                tlsSend.accept("MAIL FROM:<" + fromAddr + ">");
                tlsReadLine.get();
                tlsSend.accept("RCPT TO:<" + to + ">");
                tlsReadLine.get();
                tlsSend.accept("DATA");
                tlsReadLine.get();

                // Corpo
                tlsSend.accept("Subject: " + subject);
                tlsSend.accept("From: Eu-Duvido <" + fromAddr + ">");
                tlsSend.accept("To: <" + to + ">");
                tlsSend.accept("Date: " + dateHdr); // NOVO
                tlsSend.accept("MIME-Version: 1.0");
                tlsSend.accept("Content-Type: text/plain; charset=UTF-8");
                tlsSend.accept("");
                for (String line : body.split("\r?\n")) {
                    if (line.startsWith(".")) line = "." + line;
                    tlsSend.accept(line);
                }
                tlsSend.accept(".");
                tlsReadLine.get();

                // QUIT
                tlsSend.accept("QUIT");
                tlsReadLine.get();

                sslSocket.close();
                log.info("✓ E-mail enviado para {} via Gmail SMTP", maskEmail(to));
                return;
            }

            // Fallback (inclui TLS implícito 465, já conectado via SSLSocket)
            // AUTH LOGIN
            if (!username.isBlank()) {
                send.accept("AUTH LOGIN");
                readLine.get();
                send.accept(Base64.getEncoder().encodeToString(username.getBytes(StandardCharsets.UTF_8)));
                readLine.get();
                send.accept(Base64.getEncoder().encodeToString(password.getBytes(StandardCharsets.UTF_8)));
                String authResp = readLine.get();
                if (!authResp.startsWith("235")) {
                    throw new IllegalStateException("Autenticação falhou: " + authResp);
                }
            }

            // MAIL FROM / RCPT TO / DATA
            String fromAddr = from.isBlank() ? username : from;
            send.accept("MAIL FROM:<" + fromAddr + ">");
            readLine.get();
            send.accept("RCPT TO:<" + to + ">");
            readLine.get();
            send.accept("DATA");
            readLine.get();

            send.accept("Subject: " + subject);
            send.accept("From: Eu-Duvido <" + fromAddr + ">");
            send.accept("To: <" + to + ">");
            send.accept("Date: " + dateHdr); // NOVO
            send.accept("MIME-Version: 1.0");
            send.accept("Content-Type: text/plain; charset=UTF-8");
            send.accept("");
            for (String line : body.split("\r?\n")) {
                if (line.startsWith(".")) line = "." + line;
                send.accept(line);
            }
            send.accept(".");
            readLine.get();

            send.accept("QUIT");
            readLine.get();

            log.info("✓ E-mail enviado para {} via {}:{}", maskEmail(to), host, port);
        } catch (Exception e) {
            log.error("✗ Falha SMTP: {}", e.getMessage(), e);
            log.info("[SMTP-FAKE] To: {}\nSubject: {}\n\n{}", to, subject, body);
        }
    }

    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@");
        if (parts[0].length() <= 2) return email;
        return parts[0].charAt(0) + "***@" + parts[1];
    }

    private static String readStr(String env, String sysProp, String def) {
        String v = System.getenv(env);
        if (v != null && !v.isBlank()) return v;
        v = System.getProperty(sysProp);
        if (v != null && !v.isBlank()) return v;
        return def;
    }

    private static int readInt(String env, String sysProp, int def) {
        try {
            String v = System.getenv(env);
            if (v != null && !v.isBlank()) return Integer.parseInt(v.trim());
            v = System.getProperty(sysProp);
            if (v != null && !v.isBlank()) return Integer.parseInt(v.trim());
        } catch (Exception ignored) {}
        return def;
    }
}
