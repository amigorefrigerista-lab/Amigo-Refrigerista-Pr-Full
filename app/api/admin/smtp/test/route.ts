import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/security';
import { getAppSettings } from '@/lib/getAppSettings';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: 'Acesso restrito ao Administrador Master.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const settings = await getAppSettings();

    const host = body.smtp_host || settings.smtp_host || process.env.SMTP_HOST;
    const port = Number(body.smtp_port || settings.smtp_port || process.env.SMTP_PORT || 587);
    const user = body.smtp_user || settings.smtp_user || process.env.SMTP_USER;
    const pass = body.smtp_pass || settings.smtp_pass || process.env.SMTP_PASS;
    const from = body.smtp_from || settings.smtp_from || process.env.SMTP_FROM || user;
    const testRecipient = body.test_recipient || auth.email || 'amigorefrigerista@gmail.com';

    if (!host || !user || !pass) {
      return NextResponse.json(
        { ok: false, error: 'Preencha Host, Usuário e Senha do SMTP para realizar o teste.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    // Verifica conexão
    await transporter.verify();

    const customSubject =
      typeof body.custom_subject === 'string' && body.custom_subject.trim()
        ? body.custom_subject.trim()
        : 'Teste de Configuração SMTP - Alertas de Manutenção & Renovação';

    const customText =
      typeof body.custom_body === 'string' && body.custom_body.trim()
        ? body.custom_body.trim()
        : 'Olá! Este é um e-mail de teste enviado pelo Painel Admin do Amigo Refrigerista Pro para validar as credenciais SMTP.';

    const htmlParagraphs = customText
      .split('\n')
      .map((line: string) =>
        line.trim()
          ? `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #e2e8f0; font-size: 14px;">${line}</p>`
          : '<br />'
      )
      .join('');

    // Envia email de teste ou disparo de template de renovação
    await transporter.sendMail({
      from: `"Amigo Refrigerista Pro" <${from}>`,
      to: testRecipient,
      bcc: body.copy_admin && testRecipient !== 'amigorefrigerista@gmail.com' ? 'amigorefrigerista@gmail.com' : undefined,
      subject: customSubject,
      text: customText,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #070e1c; color: #ffffff; border-radius: 16px; border: 1px solid #1e293b;">
          <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #1e293b;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(14, 165, 233, 0.15); color: #38bdf8; font-size: 11px; font-weight: 800; text-transform: uppercase;">
              Amigo Refrigerista Pro • Renovação de Assinatura
            </span>
          </div>
          ${htmlParagraphs}
          <hr style="border-color: #1e293b; margin: 20px 0;" />
          <p style="font-size: 11px; color: #64748b; margin: 0;">
            Disparo automático via SMTP (${host}:${port}) • Remetente: ${from}
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      message: `E-mail de renovação enviado com sucesso via SMTP para ${testRecipient}!`,
    });
  } catch (err: any) {
    console.error('Erro no teste SMTP:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Falha na conexão SMTP ou autenticação.' },
      { status: 500 }
    );
  }
}
