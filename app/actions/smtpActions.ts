'use server';

import nodemailer from 'nodemailer';

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
 * Formata erros comuns de SMTP (como a exigência de Senha de App do Gmail 534)
 */
export async function formatSmtpErrorMessage(error: any): Promise<string> {
  const rawMsg = String(error?.message || error || '');

  // Gmail 534 / 5.7.9 Application-specific password required
  if (rawMsg.includes('534') || rawMsg.includes('5.7.9') || rawMsg.includes('Application-specific password required')) {
    return 'Erro 534 (Google/Gmail): O Google exige uma "Senha de Aplicativo" de 16 letras para enviar e-mails via SMTP.\n\nComo resolver em 3 passos:\n1. Acesse: https://myaccount.google.com/apppasswords\n2. Crie uma senha de app para "Amigo Refrigerista"\n3. Cole o código de 16 caracteres gerado no campo "Senha do SMTP".';
  }

  // Falha de Autenticação 535 / Invalid login
  if (rawMsg.includes('Invalid login') || rawMsg.includes('535') || rawMsg.includes('Username and Password not accepted')) {
    return 'Erro 535 (Autenticação): E-mail ou Senha incorretos. No Gmail/Outlook, utilize uma "Senha de Aplicativo" de 16 letras criada nas configurações da sua conta de e-mail.';
  }

  // Erros de Conexão / Porta / Timeout
  if (rawMsg.includes('ETIMEDOUT') || rawMsg.includes('ECONNREFUSED') || rawMsg.includes('ENOTFOUND')) {
    return 'Erro de Conexão (Timeout): Não foi possível alcançar o servidor SMTP. Verifique o Host (ex: smtp.gmail.com) e a Porta (465 para SSL ou 587 para TLS).';
  }

  return `Erro no servidor SMTP: ${rawMsg}`;
}

/**
 * Testa a conexão com o servidor SMTP e envia um e-mail de teste
 */
export async function testSmtpConnectionAction(config: SmtpConfig, testRecipient?: string) {
  try {
    if (!config.host || !config.port || !config.user || !config.pass || !config.senderEmail) {
      return {
        success: false,
        message: 'Preencha todos os campos obrigatórios do servidor SMTP (Host, Porta, Usuário, Senha e E-mail de Remetente).'
      };
    }

    const transporter = nodemailer.createTransport({
      host: config.host.trim(),
      port: Number(config.port),
      secure: Boolean(config.secure),
      auth: {
        user: config.user.trim(),
        pass: config.pass.trim(),
      },
      tls: {
        rejectUnauthorized: false, // Permite certificados autoassinados em servidores dedicados
      },
      connectionTimeout: 10000,
    });

    // 1. Verifica autenticação
    await transporter.verify();

    const recipient = testRecipient?.trim() || config.senderEmail.trim();

    // 2. Envia e-mail de teste
    const info = await transporter.sendMail({
      from: `"${config.senderName || 'Amigo Refrigerista PRO'}" <${config.senderEmail.trim()}>`,
      to: recipient,
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
              Seu servidor SMTP personalizado (<strong>${config.host}:${config.port}</strong>) está autenticado e pronto para enviar Ordens de Serviço, Laudos PMOC e Lembretes de Manutenção automaticamente aos seus clientes.
            </p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 16px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              <strong>Remetente Configurado:</strong> ${config.senderName || 'Técnico'} &lt;${config.senderEmail}&gt;<br/>
              <strong>Data/Hora do Teste:</strong> ${new Date().toLocaleString('pt-BR')}
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
      message: `E-mail de teste enviado com sucesso para ${recipient}! Mensagem ID: ${info.messageId}`,
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
 * Envia uma Ordem de Serviço por E-mail ao Cliente
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
    if (!config.enabled || !config.host || !config.user || !config.pass) {
      return { success: false, message: 'SMTP personalizado não está ativado ou configurado.' };
    }

    if (!orderData.clientEmail || !orderData.clientEmail.includes('@')) {
      return { success: false, message: 'O cliente não possui um endereço de e-mail válido cadastrado.' };
    }

    const transporter = nodemailer.createTransport({
      host: config.host.trim(),
      port: Number(config.port),
      secure: Boolean(config.secure),
      auth: {
        user: config.user.trim(),
        pass: config.pass.trim(),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const senderDisplay = config.senderName || orderData.companyName || 'Amigo Refrigerista PRO';

    const formattedValue = orderData.value 
      ? `R$ ${Number(orderData.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'A combinar';

    await transporter.sendMail({
      from: `"${senderDisplay}" <${config.senderEmail.trim()}>`,
      to: orderData.clientEmail.trim(),
      bcc: config.bccTechnician ? config.senderEmail.trim() : undefined,
      subject: `📋 Ordem de Serviço #${orderData.orderNumber} - ${senderDisplay}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070e1c; color: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 20px;">${senderDisplay}</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Comprovante de Atendimento Técnico</p>
          </div>

          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px;">
              <span style="font-size: 14px; font-weight: bold; color: #38bdf8;">OS: #${orderData.orderNumber}</span>
              <span style="font-size: 12px; color: #94a3b8;">Data: ${orderData.date}</span>
            </div>

            <p style="font-size: 14px; color: #f8fafc; margin: 0 0 12px 0;">
              Olá, <strong>${orderData.clientName}</strong>! Seguem os detalhes do serviço técnico realizado:
            </p>

            <table style="width: 100%; font-size: 13px; color: #cbd5e1; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Equipamento:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #ffffff; text-align: right;">${orderData.equipment}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Tipo de Serviço:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #ffffff; text-align: right;">${orderData.type.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #94a3b8;">Valor Total:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #34d399; text-align: right; font-size: 15px;">${formattedValue}</td>
              </tr>
            </table>

            ${orderData.notes ? `
              <div style="background-color: #1e293b; border-radius: 8px; padding: 12px; font-size: 12px; color: #94a3b8;">
                <strong style="color: #cbd5e1; display: block; margin-bottom: 4px;">Observações Técnicas:</strong>
                ${orderData.notes}
              </div>
            ` : ''}
          </div>

          <div style="text-align: center; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0 0 4px 0;">Em caso de dúvidas ou agendamento, entre em contato:</p>
            <p style="margin: 0; color: #38bdf8; font-weight: bold;">
              ${orderData.companyPhone ? `WhatsApp: ${orderData.companyPhone} | ` : ''}E-mail: ${config.senderEmail}
            </p>
          </div>
        </div>
      `,
    });

    const logEntry: SmtpEmailLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      orderNumber: orderData.orderNumber,
      clientName: orderData.clientName,
      recipientEmail: orderData.clientEmail.trim(),
      subject: `📋 Ordem de Serviço #${orderData.orderNumber} - ${senderDisplay}`,
      sentAt: new Date().toISOString(),
      status: 'success',
      equipment: orderData.equipment,
    };

    return { 
      success: true, 
      message: `Ordem de Serviço enviada por e-mail para ${orderData.clientEmail} com sucesso!`,
      log: logEntry
    };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de OS:', error);
    const failedLog: SmtpEmailLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      orderNumber: orderData.orderNumber,
      clientName: orderData.clientName,
      recipientEmail: orderData.clientEmail || 'N/A',
      subject: `📋 Ordem de Serviço #${orderData.orderNumber}`,
      sentAt: new Date().toISOString(),
      status: 'failed',
      errorMessage: error.message || 'Erro de conexão SMTP',
      equipment: orderData.equipment,
    };
    const errorFormatted = await formatSmtpErrorMessage(error);
    return { 
      success: false, 
      message: errorFormatted,
      log: failedLog
    };
  }
}

/**
 * Envia um Lembrete de Manutenção Preventiva por E-mail ao Cliente
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
    if (!config.enabled || !config.host || !config.user || !config.pass) {
      return { success: false, message: 'SMTP personalizado não está ativado ou configurado.' };
    }

    if (!reminderData.clientEmail || !reminderData.clientEmail.includes('@')) {
      return { success: false, message: 'Cliente sem e-mail cadastrado.' };
    }

    const transporter = nodemailer.createTransport({
      host: config.host.trim(),
      port: Number(config.port),
      secure: Boolean(config.secure),
      auth: {
        user: config.user.trim(),
        pass: config.pass.trim(),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const senderDisplay = config.senderName || reminderData.companyName || 'Amigo Refrigerista PRO';

    await transporter.sendMail({
      from: `"${senderDisplay}" <${config.senderEmail.trim()}>`,
      to: reminderData.clientEmail.trim(),
      bcc: config.bccTechnician ? config.senderEmail.trim() : undefined,
      subject: `❄️ Lembrete de Manutenção Preventiva - ${reminderData.equipment}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #070e1c; color: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 20px;">${senderDisplay}</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Lembrete de Saúde do Ar Condicionado & PMOC</p>
          </div>

          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px;">
            <p style="font-size: 14px; color: #f8fafc; margin: 0 0 12px 0;">
              Olá, <strong>${reminderData.clientName}</strong>!
            </p>
            <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6; margin-bottom: 16px;">
              Este é um lembrete preventivo de que o seu equipamento <strong>${reminderData.equipment}</strong> está completando o ciclo recomendado para a limpeza e higienização periódica (prevista para <strong>${reminderData.dueDate}</strong>).
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
            ${reminderData.companyPhone ? `
              <p style="margin: 0;">
                <a href="https://wa.me/55${reminderData.companyPhone.replace(/[^0-9]/g, '')}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px;">
                  Agendar pelo WhatsApp (${reminderData.companyPhone})
                </a>
              </p>
            ` : `
              <p style="margin: 0; color: #38bdf8; font-weight: bold;">E-mail: ${config.senderEmail}</p>
            `}
          </div>
        </div>
      `,
    });

    return { success: true, message: `Lembrete de manutenção enviado por e-mail para ${reminderData.clientEmail} com sucesso!` };
  } catch (error: any) {
    console.error('Erro ao enviar e-mail de lembrete:', error);
    const errorFormatted = await formatSmtpErrorMessage(error);
    return { success: false, message: errorFormatted };
  }
}
