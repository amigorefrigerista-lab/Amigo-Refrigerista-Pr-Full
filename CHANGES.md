# Mudanças desta versão

## Corrigido
1. **Tabela PT / superaquecimento** (`lib/refrigerants.ts`, novo): a calculadora usava uma tabela de 5 pontos com valores errados
   (R410A: 100 psig → -8,8 °C; o correto é ~0 °C) e quebrava ao selecionar R32/R134a. Agora usa dados gerados com CoolProp
   para R22, R32, R134a, R404A, R407C, R410A, R290 e R600a (superaquecimento = orvalho, sub-resfriamento = bolha).
2. **PDF da OS** não imprime mais CNPJ, registro CFT, telefone e e-mail fixos de terceiros quando o técnico não preencheu o perfil.
3. **Assinatura do cliente** é reduzida a 480 px antes de salvar (OS novas ficam bem mais leves). Listas de OS/clientes têm teto de 2000 linhas.
4. **Limite de requisições** do `/api/db`: 120/min por usuário logado e 600/min por IP (antes 60/min por IP, que punia técnicos em 4G/5G).
5. **IA em plano pago**: teto de uso justo de 150 consultas/mês (variável `PAID_AI_MONTHLY_CAP`).
6. **Offline**: `public/sw.js` agora guarda arquivos estáticos e a última versão das telas; `public/offline.html` como aviso. Dados da API nunca entram no cache.
7. **Produto/preço**: Plano Flex (R$ 19,90/mês) e Plano Pró (R$ 39,90/mês) ativos e visíveis (`SHOW_FLEX_PLAN = true`). Anual = 10 meses pagos, 12 usados ("2 meses grátis"),
   regra única em `lib/pricing.ts` usada por servidor e telas.
8. **Escondidos por flag** (`lib/pricing.ts`): Estoque e SMTP por usuário. Para reativar, troque a flag para `true`.
9. **Limpeza**: removidos `.gmp_cache`, `firebase.json`, `server.ts` (o `start` agora usa `server.js`), 6 abas duplicadas não usadas (`PtTableTab`, `CalcTab`, `DashTab`, `ClientsTab`, `FinanceTab`, `ErrorsTab`),
   `lib/ptData.ts`, `PlanCarousel`, `AppHeader`, `PWAInstallButton`, `InstallPrompt`, `CheckoutConsent`, `IaDisclaimer`, `FooterLegal`, `VipWelcomeBanner`, `src/db/users.ts`, `lib/firestoreErrors.ts`, `scripts/patch-next.js`.

## Banco de dados unificado (Supabase)
- O app agora usa **um só Postgres: o do Supabase**. O Cloud SQL deixa de ser necessário (pode desligar e parar de pagar).
- As 12 tabelas que ficavam no Cloud SQL passam a viver no schema `app` do Supabase (`supabase/app_schema.sql`), com RLS ligado e
  acesso público revogado: só o servidor enxerga esses dados. Não colide com a `public.clients` do Supabase.
- Conexão: variável `DATABASE_URL` (pooler do Supabase). As `SQL_*` antigas ainda funcionam só como fallback.
- Incluí índices por `user_uid` (listagens ficam rápidas com muitos usuários) e pool de 5 conexões por instância.
- Validado rodando o SQL (2x) e as consultas reais do Drizzle (upsert, cota mensal, idempotência de pagamento) num Postgres embutido.
- **Limite honesto:** o plano ainda é gravado em `public.profiles` (fonte principal) e em `app.users` (cópia). Estão no mesmo banco agora,
  mas a duplicação continua; remover `app.users.plan` é uma etapa futura.

## Verificado
`tsc --noEmit` sem erros e `next build` concluído. Não foi testado em navegador nem com banco real.

## NÃO feito (precisa de decisão ou de teste com dados reais)
- Paginação real e carregamento sob demanda das assinaturas antigas.
- Fila offline para criar OS sem internet (hoje só as telas abrem offline).
- Tela inicial centrada em orçamento rápido.
- Base de 50–100 códigos de erro: precisa ser escrita/revisada por quem conhece os manuais (não inventei códigos).
- WhatsApp: deixe `WHATSAPP_API_URL`/`WHATSAPP_API_KEY` sem preencher para usar só links `wa.me`, e teste o fluxo de lembrete.

## Configurar no painel (não é código)
- Supabase → Authentication → SMTP: configurar SMTP próprio antes de divulgar (o e-mail padrão tem limite baixo).
- Supabase → Authentication → Providers: ativar Google e priorizar esse login.
- Revisar o preço em Admin (`pro_plan_price`); o anual passa a ser preço mensal × 10.
