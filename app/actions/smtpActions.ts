'use server';

import nodemailer from 'nodemailer';
import { cookies } from 'next/headers';
import {
  verifySessionToken,
  validateSmtpTarget,
  escapeHtml,
  checkRateLimitAsync,
} from '@/lib/security';

export interface SmtpConfig {
  enabled: boolean;
  senderName: string;
  senderEmail: string;
  host: string;
  port: number;
  secure: boolean; // true for 465 (SSL), false for 587 (TLS/STARTTLS)
  user: string;
  pass: string;
  sendOnOsCreated?: boolean;
  sendOnOsFinished?: boolean;
  sendReminderEmail?: boolean;
  bccTechnician?: boolean;
}

export interface SmtpEmailLog {
  id: string;
  orderNumber: string;
  clientName: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  equipment?: string;
}

/**
 * Obtém a configuração SMTP segura:
 * - Se o cliente informar host e senha próprios, usa as credenciais informadas pelo cliente (validadas contra a whitelist de provedores autorizados).
 * - Se usar a senha do ambiente (SMTP_PASS), TRAVA obrigatoriamente o host, porta e usuário nas variáveis de ambiente do servidor (SMTP_HOST, SMTP_PORT, SMTP_USER), nunca permitindo combinar a senha do ambiente com um host informado pelo cliente.
 */
function resolveSecureSmtpCredentials(config: SmtpConfig): SmtpConfig {
  const envHost = process.env.SMTP_HOST?.trim() || '';
  const envUser = process.env.SMTP_USER?.trim() || '';
  const envPass = process.env.SMTP_PASS?.trim() || '';
  const envPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;

  const clientProvidedRealPassword = Boolean(
    config.pass && config.pass.trim().length > 0 && config.pass.trim() !== '********'
  );

  if (clientProvidedRealPassword) {
    return {
      ...config,
      host: (config.host || '').trim().toLowerCase(),
      port: Number(config.port || 465),
      user: (config.user || '').trim(),
      pass: config.pass.trim(),
    };
  }

  // Sem senha explícita do cliente: só permite usar credenciais do ambiente se o host e o usuário também forem estritamente os do ambiente
  return {
    ...config,
    host: envHost.toLowerCase(),
    port: envPort,
    user: envUser,
    pass: envPass,
    senderEmail: envUser || config.senderEmail,
  };
}

/**
 * Exige obrigatoriamente uma sessão verificada (cookie HttpOnly assinado via HMAC) antes de disparar conexões SMTP no servidor.
 * Nunca aceita fallbackEmail não autenticado.
 */
async function verifyCallerSession(): Promise<{ authorized: boolean; callerKey: string }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('amigo_session')?.value;
    const verified = verifySessionToken(sessionCookie);
    if (verified && verified.uid) {
      return { authorized: true, callerKey: verified.uid };
    }
  } catch {
    // ignore cookie context errors
  }
  return { authorized: false, callerKey: 'anon' };
}

/**
 * Formata erros comuns de SMTP sem vazar stack traces ou informações sensíveis de infraestrutura
 */
export async function formatSmtpErrorMessage(error: any): Promise<string> {
  const rawMsg = String(error?.message || error || '');

  if (
    rawMsg.includes('534') ||
    rawMsg.includes('5.7.9') ||
    rawMsg.includes('Application-specific password required')
  ) {
    return 'Erro 534 (Google/Gmail): O Google exige uma "Senha de Aplicativo" de 16 letras para enviar e-mails via SMTP.\n\nComo resolver em 3 passos:\n1. Acesse: https://myaccount.google.com/apppasswords\n2. Crie uma senha de app para "Amigo Refrigerista"\n3. Cole o código de 16 caracteres gerado no campo "Senha do SMTP".';
  }

  if (
    rawMsg.includes('Invalid login') ||
    rawMsg.includes('535') ||
    rawMsg.includes('Username and Password not accepted')
  ) {
    return 'Erro 535 (Autenticação): E-mail ou Senha incorretos. No Gmail/Outlook, utilize uma "Senha de Aplicativo" de 16 letras criada nas configurações da sua conta de e-mail.';
  }

  if (
    rawMsg.includes('CERT_') ||
    rawMsg.includes('certificate') ||
    rawMsg.includes('SELF_SIGNED')
  ) {
    return 'Erro de Certificado TLS: O servidor SMTP informado não possui um certificado SSL/TLS válido e confiável.';
  }

  if (
    rawMsg.includes('ETIMEDOUT') ||
    rawMsg.includes('ECONNREFUSED') ||
    rawMsg.includes('ENOTFOUND')
  ) {
    return 'Erro de Conexão (Timeout): Não foi possível alcançar o servidor SMTP. Verifique o Host (ex: smtp.gmail.com) e a Porta (465 para SSL ou 587 para TLS).';
  }

  return 'Não foi possível concluir o envio pelo servidor SMTP configurado. Verifique suas credenciais e tente novamente.';
}

/**
 * Testa a conexão com o servidor SMTP e envia um e-mail de teste (com proteção Anti-SSRF, TLS estrito e escape HTML)
 */
export async function testSmtpConnectionAction(config: SmtpConfig, testRecipient?: string) {
  try {
    const resolved = resolveSecureSmtpCredentials(config);

    const authCheck = await verifyCallerSession();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: 'Sessão não autenticada. Faça login para configurar ou testar o servidor SMTP.',
      };
    }

    const rate = await checkRateLimitAsync(`smtp_test:${authCheck.callerKey}`, 5, 60_000);
    if (!rate.allowed) {
      return {
        success: false,
        message: `Limite de testes atingido. Aguarde ${rate.retryAfterSeconds}s antes de testar novamente.`,
      };
    }

    if (
      !resolved.host ||
      !resolved.port ||
      !resolved.user ||
      !resolved.pass ||
      !resolved.senderEmail
    ) {
      return {
        success: false,
        message:
          'Preencha todos os campos obrigatórios do servidor SMTP (Host, Porta, Usuário, Senha e E-mail de Remetente).',
      };
    }

    // Validação Anti-SSRF de Host e Porta SMTP (permite apenas 465, 587 e 2525 e bloqueia IPs/redes internas)
    const targetValidation = validateSmtpTarget(resolved.host, resolved.port);
    if (!targetValidation.valid) {
      return {
        success: false,
        message: targetValidation.reason || 'Host ou porta SMTP inválidos.',
      };
    }

    const transporter = nodemailer.createTransport({
      host: resolved.host,
      port: Number(resolved.port),
      secure: Number(resolved.port) === 465 ? true : Boolean(resolved.secure),
      auth: {
        user: resolved.user,
        pass: resolved.pass,
      },
      tls: {
        // CORREÇÃO DE SEGURANÇA: Exige certificado TLS válido (rejectUnauthorized: true)
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 10000,
    });

    await transporter.verify();

    const recipientRaw = testRecipient?.trim() || resolved.senderEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientRaw)) {
      return {
        success: false,
        message: 'Endereço de e-mail de destinatário inválido.',
      };
    }

    const safeHost = escapeHtml(resolved.host);
    const safePort = escapeHtml(resolved.port);
    const safeSenderName = escapeHtml(resolved.senderName || 'Amigo Refrigerista PRO');
    const safeSenderEmail = escapeHtml(resolved.senderEmail.trim());

    const info = await transporter.sendMail({
      from: `"${(resolved.senderName || 'Amigo Refrigerista PRO').replace(/["<>]/g, '')}" <${resolved.senderEmail.trim()}>`,
      to: recipientRaw,
      subject: '✅ [Teste SMTP Concluído] Amigo Refrigerista PRO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b132b; color: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 22px;">Amigo Refrigerista PRO</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Configuração de Servidor de E-mail (SMTP)</p>
          </div>
          <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
            <h2 style="color: #34d399; font-size: 16px; margin-top: 0;">🎉 Conexão Estabelecida com Sucesso!</h2>
            <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
              Seu servidor SMTP personalizado (<strong>${safeHost}:${safePort}</strong>) está autenticado com TLS seguro e pronto para enviar Ordens de Serviço, Laudos PMOC e Lembretes de Manutenção automaticamente aos seus clientes.
            </p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 16px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              <strong>Remetente Configurado:</strong> ${safeSenderName} &lt;${safeSenderEmail}&gt;<br/>
              <strong>Data/Hora do Teste:</strong> ${escapeHtml(new Date().toLocaleString('pt-BR'))}
            </p>
          </div>
          <p style="text-align: center; font-size: 11px; color: #64748b; margin: 0;">
            Enviado automaticamente pelo sistema Amigo Refrigerista PRO.
          </p>
        </div>
      `,
    });

    return {
      success: true,
      message: `E-mail de teste enviado com sucesso para ${recipientRaw}! Mensagem ID: ${info.messageId}`,
    };
  } catch (error: any) {
    console.error('Erro no teste SMTP:', error);
    const msg = await formatSmtpErrorMessage(error);
    return {
      success: false,
      message: msg,
    };
  }
}

/**
 * Envia uma Ordem de Serviço por E-mail ao Cliente (com escape HTML completo contra Phishing/XSS)
 */
export async function sendOrderEmailAction(
  config: SmtpConfig,
  orderData: {
    orderNumber: string;
    clientName: string;
    clientEmail: string;
    equipment: string;
    type: string;
    date: string;
    value?: number;
    notes?: string;
    companyName?: string;
    companyPhone?: string;
  }
) {
  try {
    const resolved = resolveSecureSmtpCredentials(config);

    const authCheck = await verifyCallerSession();
    if (!authCheck.authorized) {
      return { success: false, message: 'Sessão não autenticada.' };
    }

    const rate = await checkRateLimitAsync(`smtp_send:${authCheck.callerKey}`, 15, 60_000);
    if (!rate.allowed) {
      return {
        success: false,
        message: 'Limite de envios por minuto atingido. Aguarde um instante.',
      };
    }

    if (!resolved.enabled || !resolved.host || !resolved.user || !resolved.pass) {
      return { success: false, message: 'SMTP personalizado não está ativado ou configurado.' };
    }

    if (!orderData.clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderData.clientEmail.trim())) {
      return {
        success: false,
        message: 'O cliente não possui um endereço de e-mail válido cadastrado.',
      };
    }

    const targetValidation = validateSmtpTarget(resolved.host, resolved.port);
    if (!targetValidation.valid) {
      return {
        success: false,
        message: targetValidation.reason || 'Servidor SMTP inválido.',
      };
    }

    const transporter = nodemailer.createTransport({
      host: resolved.host,
      port: Number(resolved.port),
      secure: Number(resolved.port) === 465 ? true : Boolean(resolved.secure),
      auth: {
        user: resolved.user,
        pass: resolved.pass,
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 10000,
    });

    const senderDisplayRaw =
      resolved.senderName || orderData.companyName || 'Amigo Refrigerista PRO';
    const safeSenderDisplay = escapeHtml(senderDisplayRaw);
    const safeOrderNumber = escapeHtml(orderData.orderNumber);
    const safeDate = escapeHtml(orderData.date);
    const safeClientName = escapeHtml(orderData.clientName);
    const safeEquipment = escapeHtml(orderData.equipment);
    const safeType = escapeHtml((orderData.type || 'serviço').toUpperCase());
    const safeNotes = orderData.notes ? escapeHtml(orderData.notes) : '';
    const safeCompanyPhone = orderData.companyPhone ? escapeHtml(orderData.companyPhone) : '';
    const safeSenderEmail = escapeHtml(resolved.senderEmail.trim());

    const formattedValue = orderData.value
      ? `R$ ${Number(orderData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'A combinar';

    await transporter.sendMail({
      from: `"${senderDisplayRaw.replace(/["<>]/g, '')}" <${resolved.senderEmail.trim()}>`,
      to: orderData.clientEmail.trim(),
      bcc: resolved.bccTechnician ? resolved.senderEmail.trim() : undefined,
      subject: `📋 Ordem de Serviço #${orderData.orderNumber.replace(/[\r\n]/g, '')} - ${senderDisplayRaw.replace(/[\r\n]/g, '')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070e1c; color: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 20px;">${safeSenderDisplay}</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Comprovante de Atendimento Técnico</p>
          </div>

          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px;">
              <span style="font-size: 14px; font-weight: bold; color: #38bdf8;">OS: #${safeOrderNumber}</span>
              <span style="font-size: 12px; color: #94a3b8;">Data: ${safeDate}</span>
            </div>

            <p style="font-size: 14px; color: #f8fafc; margin: 0 0 12px 0;">
              Olá, <strong>${safeClientName}</strong>! Seguem os detalhes do serviço técnico realizado:
            </p>

            <table style="width: 100%; font-size: 13px; color: #cbd5e1; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Equipamento:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #ffffff; text-align: right;">${safeEquipment}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Tipo de Serviço:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #ffffff; text-align: right;">${safeType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Valor Total:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #34d399; text-align: right; font-size: 15px;">${escapeHtml(formattedValue)}</td>
              </tr>
            </table>

            ${
              safeNotes
                ? `
              <div style="background-color: #1e293b; border-radius: 8px; padding: 12px; font-size: 12px; color: #94a3b8;">
                <strong style="color: #cbd5e1; display: block; margin-bottom: 4px;">Observações Técnicas:</strong>
                ${safeNotes}
              </div>
            `
                : ''
            }
          </div>

          <div style="text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0 0 4px 0;">Em caso de dúvidas ou agendamento, entre em contato:</p>
            <p style="margin: 0; color: #38bdf8; font-weight: bold;">
              ${safeCompanyPhone ? `WhatsApp: ${safeCompanyPhone} | ` : ''}E-mail: ${safeSenderEmail}
            </p>
          </div>
        </div>
      `,
    });

    const logEntry: SmtpEmailLog = {
      id: `log-${Date.now()}`,
      orderNumber: orderData.orderNumber,
      clientName: orderData.clientName,
      recipientEmail: orderData.clientEmail.trim(),
      subject: `📋 Ordem de Serviço #${orderData.orderNumber} - ${senderDisplayRaw}`,
      sentAt: new Date().toISOString(),
      status: 'success',
      equipment: orderData.equipment,
    };

    return {
      success: true,
      message: `Ordem de Serviço enviada por e-mail para ${orderData.clientEmail} com sucesso!`,
      log: logEntry,
    };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de OS:', error);
    const errorFormatted = await formatSmtpErrorMessage(error);
    const failedLog: SmtpEmailLog = {
      id: `log-${Date.now()}`,
      orderNumber: orderData.orderNumber,
      clientName: orderData.clientName,
      recipientEmail: orderData.clientEmail || 'N/A',
      subject: `📋 Ordem de Serviço #${orderData.orderNumber}`,
      sentAt: new Date().toISOString(),
      status: 'failed',
      errorMessage: errorFormatted,
      equipment: orderData.equipment,
    };
    return {
      success: false,
      message: errorFormatted,
      log: failedLog,
    };
  }
}

/**
 * Envia um Lembrete de Manutenção Preventiva por E-mail ao Cliente (com escape HTML e validação TLS)
 */
export async function sendReminderEmailAction(
  config: SmtpConfig,
  reminderData: {
    clientName: string;
    clientEmail: string;
    equipment: string;
    dueDate: string;
    companyName?: string;
    companyPhone?: string;
  }
) {
  try {
    const resolved = resolveSecureSmtpCredentials(config);

    const authCheck = await verifyCallerSession();
    if (!authCheck.authorized) {
      return { success: false, message: 'Sessão não autenticada.' };
    }

    const rate = await checkRateLimitAsync(`smtp_reminder:${authCheck.callerKey}`, 15, 60_000);
    if (!rate.allowed) {
      return {
        success: false,
        message: 'Limite de envios por minuto atingido. Aguarde um instante.',
      };
    }

    if (!resolved.enabled || !resolved.host || !resolved.user || !resolved.pass) {
      return { success: false, message: 'SMTP personalizado não está ativado ou configurado.' };
    }

    if (
      !reminderData.clientEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reminderData.clientEmail.trim())
    ) {
      return { success: false, message: 'Cliente sem e-mail válido cadastrado.' };
    }

    const targetValidation = validateSmtpTarget(resolved.host, resolved.port);
    if (!targetValidation.valid) {
      return {
        success: false,
        message: targetValidation.reason || 'Servidor SMTP inválido.',
      };
    }

    const transporter = nodemailer.createTransport({
      host: resolved.host,
      port: Number(resolved.port),
      secure: Number(resolved.port) === 465 ? true : Boolean(resolved.secure),
      auth: {
        user: resolved.user,
        pass: resolved.pass,
      },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 10000,
    });

    const senderDisplayRaw =
      resolved.senderName || reminderData.companyName || 'Amigo Refrigerista PRO';
    const safeSenderDisplay = escapeHtml(senderDisplayRaw);
    const safeClientName = escapeHtml(reminderData.clientName);
    const safeEquipment = escapeHtml(reminderData.equipment);
    const safeDueDate = escapeHtml(reminderData.dueDate);
    const safeSenderEmail = escapeHtml(resolved.senderEmail.trim());
    const cleanPhoneDigits = (reminderData.companyPhone || '').replace(/[^0-9]/g, '');
    const safePhoneDisplay = reminderData.companyPhone ? escapeHtml(reminderData.companyPhone) : '';

    await transporter.sendMail({
      from: `"${senderDisplayRaw.replace(/["<>]/g, '')}" <${resolved.senderEmail.trim()}>`,
      to: reminderData.clientEmail.trim(),
      bcc: resolved.bccTechnician ? resolved.senderEmail.trim() : undefined,
      subject: `❄️ Lembrete de Manutenção Preventiva - ${reminderData.equipment.replace(/[\r\n]/g, '')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070e1c; color: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 20px;">${safeSenderDisplay}</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Lembrete de Saúde do Ar Condicionado &amp; PMOC</p>
          </div>

          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #f8fafc; margin: 0 0 12px 0;">
              Olá, <strong>${safeClientName}</strong>!
            </p>
            <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6; margin-bottom: 16px;">
              Este é um lembrete preventivo de que o seu equipamento <strong>${safeEquipment}</strong> está completando o ciclo recomendado para a limpeza e higienização periódica (prevista para <strong>${safeDueDate}</strong>).
            </p>

            <div style="background-color: #1e293b; border-left: 4px solid #38bdf8; border-radius: 4px; padding: 12px; margin-bottom: 16px;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                💡 <strong>Por que fazer a manutenção preventiva?</strong><br/>
                • Economia de até 30% na conta de energia elétrica.<br/>
                • Eliminação de fungos, ácaros e bactérias no ar que você respira.<br/>
                • Prevenção de vazamentos e queima do compressor.
              </p>
            </div>
          </div>

          <div style="text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0 0 6px 0;">Para agendar sua visita técnica preventiva:</p>
            ${
              cleanPhoneDigits
                ? `
              <p style="margin: 0;">
                <a href="https://wa.me/55${cleanPhoneDigits}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px;">
                  Agendar pelo WhatsApp (${safePhoneDisplay})
                </a>
              </p>
            `
                : `
              <p style="margin: 0; color: #38bdf8; font-weight: bold;">E-mail: ${safeSenderEmail}</p>
            `
            }
          </div>
        </div>
      `,
    });

    return {
      success: true,
      message: `Lembrete de manutenção enviado por e-mail para ${reminderData.clientEmail} com sucesso!`,
    };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de lembrete:', error);
    const errorFormatted = await formatSmtpErrorMessage(error);
    return { success: false, message: errorFormatted };
  }
}
