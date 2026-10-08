import Link from "next/link";

export function FooterLegal() {
  return (
    <footer className="w-full py-6 mt-auto border-t border-slate-800 bg-slate-950/80 text-slate-500 text-[10px] text-center space-y-2">
      <p>Amigo Refrigerista Pro © {new Date().getFullYear()}</p>
      <p>Amigo Refrigerista Tecnologia e Sistemas Digitais para Climatização Ltda.</p>
      <p>São Paulo - SP, Brasil • Contato &amp; DPO: amigorefrigerista@gmail.com</p>
      <div className="flex justify-center gap-4">
        <Link href="/termos" className="hover:text-sky-400">Termos de Uso</Link>
        <Link href="/privacidade" className="hover:text-sky-400">Política de Privacidade</Link>
      </div>
      <p>Garantia de 7 dias para cancelamento e reembolso conforme o Art. 49 do CDC.</p>
    </footer>
  );
}
