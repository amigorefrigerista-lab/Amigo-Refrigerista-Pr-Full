# Guia de Configuração: Provedor Google no Supabase Auth
Projeto: **Amigo Refrigerista Pro**

Para que o botão **"Entrar com Google"** conecte diretamente via OAuth oficial do Google no Supabase sem erros de `Unsupported provider: provider is not enabled`, siga os 3 passos abaixo:

---

## 1. Criar as Credenciais no Google Cloud Console
1. Acesse o [Google Cloud Console - Credenciais](https://console.cloud.google.com/apis/credentials).
2. Se ainda não tiver uma **Tela de Consentimento OAuth**, configure-a em **OAuth consent screen**:
   - Tipo de Usuário: **Externo**
   - Nome do Aplicativo: **Amigo Refrigerista Pro**
   - E-mail de suporte e Desenvolvedor: `amigorefrigerista@gmail.com`
   - Escopos: `.../auth/userinfo.email` e `.../auth/userinfo.profile`.
3. Clique em **Criar Credenciais** > **ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**
   - Nome: `Amigo Refrigerista Supabase Web Client`
   - **Origens JavaScript autorizadas:**
     - `https://ais-dev-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app`
     - `https://ais-pre-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app`
     - `https://<SEU-PROJETO-SUPABASE>.supabase.co`
   - **URIs de redirecionamento autorizados:**
     - `https://<SEU-PROJETO-SUPABASE>.supabase.co/auth/v1/callback`
     - `https://ais-dev-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app/auth/callback`
     - `https://ais-pre-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app/auth/callback`
4. Copie o **Client ID** e o **Client Secret** gerados.

---

## 2. Ativar o Provedor Google no Supabase Dashboard
1. Acesse o seu projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. No menu lateral, acesse **Authentication** > **Providers**.
3. Localize e clique em **Google**:
   - Mude o botão seletor para **Enabled** (Ativado).
   - Cole o **Client ID** no campo correspondente.
   - Cole o **Client Secret** no campo correspondente.
   - Copie a **Callback URL (for OAuth)** exibida pelo Supabase para confirmar que coincide com a que você inseriu no Google Cloud (`https://<SEU-PROJETO>.supabase.co/auth/v1/callback`).
4. Clique em **Save** (Salvar).

---

## 3. Configurar as URLs de Redirecionamento no Supabase
1. No menu lateral do Supabase, acesse **Authentication** > **URL Configuration**.
2. Defina:
   - **Site URL**: `https://ais-pre-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app`
   - **Redirect URLs** (adicione ambas):
     - `https://ais-dev-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app/auth/callback`
     - `https://ais-pre-qra27imdzdc4xbsitf6zdr-546064254082.us-east1.run.app/auth/callback`
3. Salve as alterações.

---

Pronto! Assim que ativado no painel do Supabase, o botão "Entrar com Google" redirecionará com sucesso para a conta Google do usuário e retornará autenticado ao sistema.
