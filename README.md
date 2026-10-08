# Amigo Refrigerista Pro (SaaS HVAC-R & PMOC)

Plataforma SaaS voltada para técnicos e empresas de Refrigeração e Climatização (HVAC-R), com gestão de Ordens de Serviço (OS), assinatura digital do cliente em campo, certificação via QR Code, planos PMOC (Lei 13.589/2018), cálculo de carga térmica, superaquecimento/sub-resfriamento, controle de estoque e diagnóstico assistido.

---

## Arquitetura de Segurança & Produção

1. **Autenticação e Sessão (`HttpOnly` + HMAC-SHA256 + `@supabase/ssr`)**:
   - A sessão do Supabase no navegador utiliza cookies `SameSite=Lax` via `@supabase/ssr` (sem armazenar tokens brutos em `localStorage`).
   - O endpoint `/api/auth/session` exige um `accessToken` válido do Supabase Auth, valida `email_confirmed_at` e lê `role`, `plano` e `plan_expires_at` diretamente da tabela `profiles` no servidor.
   - O privilégio de administrador (`is_admin = true` / `role = 'admin'`) é lido exclusivamente do banco de dados a cada requisição autenticada (permitindo revogação imediata) e nunca é concedido automaticamente por endereço de e-mail no cadastro.

2. **Segredo de Sessão (`SESSION_HMAC_SECRET`)**:
   - Gere um segredo criptográfico aleatório de 48 bytes exclusivamente no ambiente do servidor:
     ```bash
     openssl rand -base64 48
     ```
   - Nunca comite valores de `SESSION_HMAC_SECRET` em `.env` ou `.env.example`.

3. **Cobrança, Ciclo de Assinatura e Licenças Atômicas**:
   - Planos: **Free** (3 OS e 3 consultas de IA/mês), **Flex** (R$ 19,90) e **Pro** (R$ 39,90).
   - O checkout (`/api/checkout`) suporta assinatura recorrente mensal via Mercado Pago (`/preapproval`) e ciclo de 30 dias.
   - O webhook `/api/webhooks/mercadopago` opera em modo *fail-closed*, verifica assinatura `x-signature` (HMAC-SHA256), valida o valor pago, atualiza `plan_expires_at` (+30 dias) em aprovações e revoga imediatamente o plano em caso de reembolso (`refunded`), cancelamento (`cancelled`) ou chargeback (`charged_back`).
   - O resgate de licenças (`/api/licenses`) utiliza a função SQL atômica `public.redeem_license_atomic` (`FOR UPDATE` + tabela `public.license_redemptions`), impedindo condição de corrida em `used_count`, resgates duplicados pelo mesmo usuário ou rebaixamento de assinantes pagos.

4. **Proteção Anti-SSRF (com Resolução DNS), CSP com Nonce e Rate Limit Síncrono**:
   - O teste de conexão WhatsApp (`/api/whatsapp/test-connection`) resolve registros DNS (`A`/`AAAA`) antes da conexão e bloqueia IPs privados, loopback, link-local, CGNAT e metadata de nuvem.
   - O envio SMTP (`app/actions/smtpActions.ts`) exige sessão verificada, TLS estrito (`rejectUnauthorized: true`) e whitelist de provedores autorizados.
   - O `middleware.ts` gera um `nonce` criptográfico por requisição para a `Content-Security-Policy` (sem `'unsafe-inline'` em `script-src`).
   - O rate limit e o controle de cota mensal executam de forma síncrona contra Upstash Redis REST / PostgreSQL / Supabase antes de liberar a requisição.

---

## Configuração do Banco de Dados (Supabase / PostgreSQL)

Execute os scripts SQL na seguinte ordem no SQL Editor do Supabase:

1. `supabase/schema.sql` — Criação das tabelas principais (`profiles`, `clients`, `work_orders`, `diagnostic_history`, `pmoc_plans`, `quick_quotes`, `support_tickets`, `whatsapp_confirmations`, `rate_limits`, `monthly_quotas`) e trigger `handle_new_user`.
2. `supabase/rls_policies.sql` — Políticas de Row Level Security (RLS), função `public.is_admin()` (que exige `is_admin = true` e `email_confirmed_at IS NOT NULL`) e trigger `prevent_profile_privilege_escalation`.
3. `supabase/licenses.sql` — Tabelas `licenses`, `license_redemptions` e função transacional atômica `public.redeem_license_atomic`.
4. `supabase/whatsapp_settings.sql` — Configurações de integração WhatsApp.

---

## Desenvolvimento e Build

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento (porta 3000)
npm run dev

# Executar linter e verificação de tipos
npm run lint

# Gerar build de produção
npm run build
```
