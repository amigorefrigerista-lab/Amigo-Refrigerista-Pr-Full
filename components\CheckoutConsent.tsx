import Link from "next/link";

export function CheckoutConsent() {
  return (
    <p className="text-[10px] text-slate-400 mt-4 text-center">
      Ao continuar, você declara estar de acordo com nossos{" "}
      <Link href="/termos" className="text-sky-400 hover:underline">Termos de Uso</Link>
      {" "}e{" "}
      <Link href="/privacidade" className="text-sky-400 hover:underline">Política de Privacidade</Link>.
      Cancelamento garantido em até 7 dias sem custos (Art. 49 do CDC).
    </p>
  );
}
