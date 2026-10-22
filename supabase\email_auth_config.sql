-- ==============================================================================
-- CONFIGURAÇÃO DO SERVIÇO DE E-MAIL E TEMPLATES NO SUPABASE AUTH
-- Projeto: Amigo Refrigerista Pro
-- ==============================================================================

/*
  INSTRUÇÕES PARA CONFIGURAÇÃO NO SUPABASE DASHBOARD:
  
  1. Acesse o painel do seu projeto no Supabase (https://app.supabase.com).
  2. Vá em Authentication > URL Configuration:
     - Site URL: https://seu-dominio.com (ou a URL de produção/preview)
     - Redirect URLs: Adicione `https://seu-dominio.com/auth/callback` e `https://seu-dominio.com/auth/reset-password`
  
  3. Vá em Authentication > Providers > Email:
     - Ative "Enable Email Provider"
     - Ative "Confirm email" (Confirmação de cadastro obrigatória para maior segurança)
  
  4. Vá em Authentication > Email Templates:
     
     --- A. CONFIRMATION / SIGNUP TEMPLATE ---
     Subject: Confirme seu cadastro no Amigo Refrigerista Pro
     Body:
     <h2>Bem-vindo ao Amigo Refrigerista Pro!</h2>
     <p>Olá! Para confirmar seu cadastro e ativar sua conta de técnico, clique no link abaixo:</p>
     <p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirmar meu E-mail</a></p>
     <p>Se você não solicitou este cadastro, por favor ignore esta mensagem.</p>

     --- B. RESET PASSWORD TEMPLATE ---
     Subject: Redefinição de Senha - Amigo Refrigerista Pro
     Body:
     <h2>Redefinição de Senha</h2>
     <p>Recebemos uma solicitação para redefinir a senha da sua conta no Amigo Refrigerista Pro.</p>
     <p>Para criar uma nova senha, clique no link seguro abaixo:</p>
     <p><a href="{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery">Redefinir Minha Senha</a></p>
     <p>Este link expira em breve. Se você não solicitou a alteração, ignore este e-mail.</p>

  5. (Opcional) SMTP Personalizado:
     Para garantir taxas de entrega (deliverability) superiores de e-mails corporativos, configure um provedor SMTP próprio (ex: Resend, SendGrid, Amazon SES, Mailgun) em Project Settings > Auth > SMTP Settings.
*/
