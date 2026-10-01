import Link from "next/link";

export default function TermosPage() {
  return (
    <div className="min-h-screen p-8 bg-[#070e1c] text-slate-200">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-4">Termos e Condições de Uso</h1>
        <p className="mb-4 text-sm">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
        
        <h2 className="text-xl font-semibold text-white mb-2">1. Identificação da Empresa</h2>
        <p className="mb-4 text-sm">O serviço Amigo Refrigerista Pro é gerido por [SUA RAZÃO SOCIAL OU NOME COMPLETO], inscrito no CNPJ/CPF sob o nº [00.000.000/0001-00], com sede em [ENDEREÇO COMPLETO, CIDADE - UF], contato via e-mail: <a href="mailto:amigorefrigerista@gmail.com" className="text-sky-400 hover:underline">amigorefrigerista@gmail.com</a>.</p>

        <h2 className="text-xl font-semibold text-white mb-2">2. Aceitação dos Termos</h2>
        <p className="mb-4 text-sm">Ao registar-se ou utilizar qualquer funcionalidade da aplicação, o utilizador declara ter lido, compreendido e aceite integralmente estes Termos de Uso e a nossa <Link href="/privacidade" className="text-sky-400 hover:underline">Política de Privacidade</Link>.</p>

        <h2 className="text-xl font-semibold text-white mb-2">3. Isenção de Responsabilidade Técnica (Diagnósticos de IA)</h2>
        <p className="mb-4 text-sm">A aplicação utiliza modelos de Inteligência Artificial para auxílio no diagnóstico de códigos de erro, leitura OCR de placas e análise térmica. <strong>Tais resultados são estritamente informativos e auxiliares.</strong> O diagnósticos por IA não substituem a avaliação técnica presencial nem o manual oficial dos fabricantes. A responsabilidade técnica e a execução do serviço presencial cabem exclusivamente ao profissional credenciado.</p>

        <h2 className="text-xl font-semibold text-white mb-2">4. Planos, Cobrança e Cancelamento</h2>
        <p className="mb-4 text-sm">Os planos Flex e Pro são disponibilizados sob a modalidade de assinatura recorrente. O cancelamento pode ser efetuado a qualquer momento nas definições do perfil na aplicação.</p>
        <p className="mb-4 text-sm">Direito de Arrependimento (Art. 49 do CDC): O utilizador pode solicitar o cancelamento e reembolso integral do valor pago no prazo de até 7 (sete) dias corridos após a primeira contratação da assinatura, mediante pedido pelo e-mail de suporte.</p>

        <h2 className="text-xl font-semibold text-white mb-2">5. Propriedade Intelectual</h2>
        <p className="mb-4 text-sm">Todo o código-fonte, interface, marcas e conteúdos gerados pelo Amigo Refrigerista Pro são protegidos pelas leis de propriedade intelectual. É vedada a reprodução ou engenharia reversa sem autorização prévia por escrito.</p>

        <Link href="/" className="text-sky-400 hover:underline font-bold mt-8 block">← Voltar para a página inicial</Link>
      </div>
    </div>
  );
}
