import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, FileText, UserCheck, Database, Camera, Key, CheckCircle, HelpCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors font-medium mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Política de Privacidade & Segurança de Dados</h1>
              <p className="text-sm text-slate-400 mt-1">Declaração para Google Play Store & LGPD • Última atualização: Setembro de 2026</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 backdrop-blur-xl shadow-2xl">
          {/* Resumo de Segurança (Play Console Data Safety) */}
          <div className="p-5 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-3">
            <h3 className="text-sm font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-sky-400" /> Resumo do Questionário de Segurança dos Dados (Google Play Data Safety)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-white block mb-1">Dados Pessoais (Nome, E-mail)</span>
                <span className="text-slate-300">Coletados para gerenciamento de conta, autenticação e prevenção de fraudes.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-white block mb-1">Fotos e Vídeos (Câmera)</span>
                <span className="text-slate-300">Coletados para leitura de placa/etiqueta por IA e anexos de OS. <strong>Sem compartilhamento comercial.</strong></span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-bold text-white block mb-1">Criptografia em Trânsito</span>
                <span className="text-slate-300"><strong>Sim</strong> (Conexão 100% protegida via HTTPS/TLS 1.3 em servidores seguros na nuvem).</span>
              </div>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <FileText className="w-5 h-5" /> 1. Introdução
            </h2>
            <p className="text-slate-300 leading-relaxed">
              O <strong className="text-white">Amigo Refrigerista Pro</strong> valoriza a sua privacidade e está comprometido em proteger os dados pessoais de técnicos, instaladores e empresas de refrigeração e climatização (HVAC-R). Esta Política explica detalhadamente como coletamos, tratamos e protegemos suas informações de acordo com a <strong className="text-white">LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018)</strong> e as diretrizes do <strong className="text-white">Google Play Console Data Safety</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <Database className="w-5 h-5" /> 2. Coleta de Dados Pessoais (Nome, E-mail, Telefone, CPF/CNPJ)
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Para possibilitar a criação de conta, login seguro e elaboração de relatórios/laudos técnicos, coletamos:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 pl-2">
              <li><strong className="text-white">Nome e E-mail:</strong> Coletados no cadastro e login (via E-mail/Senha ou Google Sign-In) para gerenciamento da conta e prevenção contra fraudes/acessos não autorizados.</li>
              <li><strong className="text-white">Telefone e CPF/CNPJ (Opcionais):</strong> Utilizados exclusivamente para preenchimento de cabeçalhos de Orçamento, PMOC e Ordens de Serviço solicitadas pelo próprio técnico.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <Camera className="w-5 h-5" /> 3. Permissão e Uso da Câmera (Fotos e OCR de Placa Técnica)
            </h2>
            <p className="text-slate-300 leading-relaxed">
              O aplicativo solicita permissão de acesso à câmera do dispositivo para as seguintes utilidades essenciais de campo:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 pl-2">
              <li><strong className="text-white">Leitura de Placa do Equipamento por IA:</strong> Leitura automática da etiqueta do condensador/evaporador para identificação rápida de modelo, fluido refrigerante e BTU/h.</li>
              <li><strong className="text-white">Anexo de Fotos nas Ordens de Serviço:</strong> Registro de fotos antes/depois da instalação ou higienização.</li>
            </ul>
            <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mt-2">
              ⚠️ <strong>Declaração do Desenvolvedor:</strong> Nenhuma foto, vídeo ou imagem capturada no aplicativo é vendida, alugada ou compartilhada com terceiros para fins de marketing, publicidade ou rastreamento comportamental.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <Lock className="w-5 h-5" /> 4. Criptografia em Trânsito e Segurança da Informação
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Todos os dados trafegam através de canais 100% criptografados via protocolo <strong className="text-white">HTTPS / TLS 1.3</strong>. As informações são armazenadas em servidores de altíssima segurança em nuvem com <strong className="text-white">Supabase e PostgreSQL</strong> com regras rigorosas de controle de acesso por função (RBAC), garantindo que somente você tenha acesso aos seus registros e clientes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <UserCheck className="w-5 h-5" /> 5. Direitos do Usuário e Exclusão de Dados
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Em concordância com a LGPD, o usuário tem total controle sobre seus dados e pode solicitar o acesso, retificação ou a <strong className="text-white">exclusão definitiva de sua conta e histórico</strong> em qualquer momento diretamente nas configurações da conta no aplicativo ou através da nossa central de suporte.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> 6. Contato do Encarregado de Dados
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Em caso de dúvidas sobre nossa Política de Privacidade, entre em contato pelo e-mail oficial de suporte:
              <br />
              <strong className="text-sky-300 font-mono mt-1 inline-block bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">amigorefrigerista@gmail.com</strong>
            </p>
          </section>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Amigo Refrigerista Pro • Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
