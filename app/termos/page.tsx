import Link from 'next/link';
import { Shield, FileText, ArrowLeft, CheckCircle2, Scale, Lock, Building2 } from 'lucide-react';

export default function TermosPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-[#070e1c] text-slate-200">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-semibold text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para a página inicial
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Termos e Condições Gerais de Uso
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Contrato de Licença de Software como Serviço (SaaS) • Conformidade LGPD (Lei nº 13.709/2018) e Marco Civil da Internet (Lei nº 12.965/2014)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8 backdrop-blur-xl shadow-2xl">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                <strong>Plataforma Oficial:</strong> Amigo Refrigerista Pro — Tecnologia e Automação HVAC-R
              </span>
            </div>
            <span className="font-mono text-slate-400">
              Vigência: Outubro de 2026 • Versão 2.4 Comercial
            </span>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <FileText className="w-5 h-5" /> 1. Identificação da Plataforma e Controladora de Dados
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              O software e ecossistema digital <strong className="text-white">Amigo Refrigerista Pro</strong> (&ldquo;Plataforma&rdquo;) é operado por <strong className="text-white">Amigo Refrigerista Tecnologia e Sistemas Digitais para Climatização Ltda.</strong>, com operação nacional em nuvem sediada em São Paulo - SP, Brasil, e canal oficial do Encarregado de Proteção de Dados (DPO) e Atendimento Jurídico através do endereço eletrônico:{' '}
              <a
                href="mailto:amigorefrigerista@gmail.com"
                className="text-sky-400 hover:underline font-mono"
              >
                amigorefrigerista@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> 2. Aceitação dos Termos e Elegibilidade
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Ao cadastrar-se, acessar ou utilizar qualquer ferramenta da Plataforma, o profissional técnico ou empresa (&ldquo;Usuário&rdquo;) declara ter lido, compreendido e aceitado integralmente estes Termos de Uso e a nossa{' '}
              <Link href="/privacidade" className="text-sky-400 hover:underline font-semibold">
                Política de Privacidade e Segurança de Dados
              </Link>
              . O serviço é destinado a profissionais e empresas de refrigeração, climatização (HVAC-R) e manutenção predial.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <Shield className="w-5 h-5" /> 3. Limitação de Responsabilidade Técnica (Diagnósticos de IA e Cálculos)
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              A Plataforma disponibiliza recursos de Inteligência Artificial para auxílio na consulta de códigos de erro, leitura OCR de etiquetas de equipamentos e cálculos termodinâmicos (Superaquecimento, Sub-resfriamento e Carga Térmica BTU/h).{' '}
              <strong className="text-white">
                Tais resultados possuem caráter estritamente consultivo e instrumental de apoio ao técnico.
              </strong>{' '}
              Os diagnósticos automatizados não substituem a inspeção presencial com instrumentos calibrados (manifold, multímetro True-RMS, vacuômetro, megômetro), nem prevalecem sobre os manuais de serviço oficiais dos fabricantes e normas ABNT NBR 16401 / Portaria MS nº 3.523/1998 (PMOC). A responsabilidade técnica pela execução do serviço e segurança elétrica/frigorígena compete exclusivamente ao profissional executante.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400 flex items-center gap-2">
              <Lock className="w-5 h-5" /> 4. Planos de Assinatura, Cobrança e Direito de Arrependimento
            </h2>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-1 leading-relaxed">
              <li>
                <strong className="text-white">Plano Gratuito (Free):</strong> Contempla até 3 (três) Ordens de Serviço e até 3 (três) consultas de diagnóstico por Inteligência Artificial por mês civil.
              </li>
              <li>
                <strong className="text-white">Planos Comerciais (Flex R$ 19,90/mês e Pro R$ 39,90/mês):</strong> Disponibilizados sob modalidade de assinatura mensal sem fidelidade, com processamento seguro via Mercado Pago ou Pix oficial. O cancelamento pode ser realizado a qualquer momento diretamente no painel do Usuário, mantendo-se o acesso até o término do ciclo vigente.
              </li>
              <li>
                <strong className="text-white">Direito de Arrependimento (Art. 49 do Código de Defesa do Consumidor — Lei nº 8.078/1990):</strong> O Usuário poderá exercer o direito de arrependimento e solicitar o reembolso integral no prazo de até 7 (sete) dias corridos contados da contratação inicial da assinatura.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400">
              5. Proteção de Dados de Clientes Finais (Operador vs. Controlador na LGPD)
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Nos termos da Lei nº 13.709/2018 (LGPD), o Usuário técnico atua como <strong className="text-white">Controlador</strong> dos dados cadastrais de seus respectivos clientes atendidos em campo (nome, telefone, endereço e assinatura de recebimento da Ordem de Serviço), enquanto o Amigo Refrigerista Pro atua como <strong className="text-white">Operador</strong> tecnológico, aplicando isolamento estrito por conta (Row Level Security) e mascaramento automático de informações sensíveis em links públicos de garantia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-sky-400">
              6. Propriedade Intelectual e Foro
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Todo o código-fonte, algoritmos, bancos de sintomas, marcas, logotipos e interfaces do Amigo Refrigerista Pro são protegidos pela Lei de Software (Lei nº 9.609/1998) e Lei de Direitos Autorais (Lei nº 9.610/1998). Fica eleito o Foro da Comarca da Capital do Estado de São Paulo - SP, com renúncia a qualquer outro, ressalvado o foro de domicílio do consumidor quando aplicável pelo CDC.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
