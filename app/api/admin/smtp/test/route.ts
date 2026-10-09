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

    // Envia email de teste
    await transporter.sendMail({
      from: `"Amigo Refrigerista Pro" <${from}>`,
      to: testRecipient,
      subject: 'Teste de Configuração SMTP - Alertas de Manutenção',
      text: 'Olá! Este é um e-mail de teste enviado pelo Painel Admin do Amigo Refrigerista Pro para validar as credenciais SMTP.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #070e1c; color: #ffffff; border-radius: 12px;">
          <h2 style="color: #4ade80; margin-top: 0;">Teste SMTP Realizado com Sucesso!</h2>
          <p>As configurações de e-mail para alertas de manutenção automática estão operando perfeitamente.</p>
          <hr style="border-color: #1e293b; margin: 15px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Host: ${host}:${port}</p>
          <p style="font-size: 12px; color: #94a3b8;">Remetente: ${from}</p>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      message: `E-mail de teste enviado com sucesso para ${testRecipient}!`,
    });
  } catch (err: any) {
    console.error('Erro no teste SMTP:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Falha na conexão SMTP ou autenticação.' },
      { status: 500 }
    );
  }
}
